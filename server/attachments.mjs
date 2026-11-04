import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { tutorLimits } from './limits.mjs';

const textExtensions = new Set(['.txt', '.md', '.csv', '.json', '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.css', '.html', '.sql', '.xml', '.yaml', '.yml']);
const maxFile = 10 * 1024 * 1024;
function reject(code, message) { throw Object.assign(new Error(message), { code, status: 400 }); }

export async function receiveAttachment(req, db, root) {
  const declaredSize = Number(req.headers['content-length']);
  if (declaredSize > maxFile) reject('file_too_large', 'Tệp vượt giới hạn 10 MB.');
  let name;
  try { name = decodeURIComponent(req.headers['x-file-name'] || 'attachment'); } catch { reject('invalid_filename', 'Tên tệp không hợp lệ.'); }
  name = name.replace(/[\\/\x00-\x1f\x7f]/g, '_').slice(0, 180).trim() || 'attachment';
  const parts = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > maxFile) reject('file_too_large', 'Tệp vượt giới hạn 10 MB.'); parts.push(chunk); }
  if (!size) reject('empty_file', 'Tệp rỗng.');
  const bytes = Buffer.concat(parts);
  const extension = name.match(/\.[^.]+$/)?.[0]?.toLowerCase() || '';
  let mediaType, extractedText = null, stored = bytes, suffix = extension;
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  const isPdf = bytes.toString('ascii', 0, 5) === '%PDF-';
  if (isPng || isJpeg || isWebp) {
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extension)) reject('format_mismatch', 'Định dạng ảnh không khớp phần mở rộng.');
    let image;
    try { image = sharp(bytes, { limitInputPixels: 40000000, failOn: 'error' });
      const meta = await image.metadata();
      if (meta.width > 12000 || meta.height > 12000) reject('image_too_large', 'Kích thước ảnh quá lớn.');
      if (isPng) { stored = await image.rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).png().toBuffer(); mediaType = 'image/png'; suffix = '.png'; }
      else { stored = await image.rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer(); mediaType = 'image/jpeg'; suffix = '.jpg'; }
    } catch (error) { if (error.code) throw error; reject('invalid_image', 'Không đọc được ảnh hoặc ảnh bị lỗi.'); }
  } else if (isPdf) {
    if (extension !== '.pdf') reject('format_mismatch', 'PDF không khớp phần mở rộng.');
    mediaType = 'application/pdf';
    let document;
    try {
      document = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, disableFontFace: true,
        isEvalSupported: false, maxImageSize: 40000000 }).promise;
      if (document.numPages > 100) reject('too_many_pages', 'PDF tối đa 100 trang.');
      const pages = [];
      let extractedLength = 0;
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        const text = (await page.getTextContent()).items.map((item) => item.str || '').join(' ');
        const pageText = `[Page ${pageNumber}]\n${text}`;
        extractedLength += pageText.length + (pages.length ? 2 : 0);
        if (extractedLength > tutorLimits.extractedTextChars)
          reject('too_much_text', 'PDF trích xuất quá 200.000 ký tự.');
        pages.push(pageText);
      }
      extractedText = pages.join('\n\n');
      if (extractedText.replace(/\[Page \d+\]/g, '').trim().length < 20) reject('scanned_pdf', 'PDF không có đủ chữ để trích xuất; hãy tải ảnh trang cần hỏi.');
    } catch (error) { if (error.code) throw error; reject('invalid_pdf', 'Không đọc được PDF văn bản.'); }
    finally { await document?.destroy().catch(() => {}); }
  } else if (textExtensions.has(extension)) {
    if (bytes.includes(0)) reject('binary_text', 'Tệp có dữ liệu nhị phân, không phải văn bản thuần.');
    try { extractedText = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { reject('invalid_text', 'Tệp văn bản phải được mã hóa UTF-8.'); }
    if (extractedText.length > tutorLimits.extractedTextChars) reject('too_much_text', 'Văn bản tối đa 200.000 ký tự.');
    mediaType = 'text/plain';
  } else reject('unsupported_file', 'Chỉ hỗ trợ PNG, JPEG, WebP, TXT/Markdown, mã nguồn thông dụng và PDF có văn bản.');

  const id = randomUUID();
  const dir = resolve(root, 'data', 'attachments');
  await mkdir(dir, { recursive: true });
  const relativePath = `data/attachments/${id}${suffix}`;
  const path = resolve(root, relativePath);
  await writeFile(path, stored, { flag: 'wx' });
  try {
    db.prepare(`INSERT INTO attachments(id,original_name,media_type,byte_size,extracted_text,path,created_at)
      VALUES (?,?,?,?,?,?,?)`).run(id, name, mediaType, size, extractedText, relativePath, new Date().toISOString());
  } catch (error) { await unlink(path).catch(() => {}); throw error; }
  return { id, name, mediaType, size, previewUrl: mediaType.startsWith('image/') ? `/api/attachments/${id}/preview` : null };
}

export async function cleanupOrphanAttachments(db, root, olderThanMs = 86400000) {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  const rows = db.prepare(`SELECT id,path FROM attachments WHERE created_at<? AND NOT EXISTS
    (SELECT 1 FROM message_attachments WHERE attachment_id=attachments.id)`).all(cutoff);
  for (const row of rows) {
    db.prepare('DELETE FROM attachments WHERE id=?').run(row.id);
    await unlink(resolve(root, row.path)).catch(() => {});
  }
  return rows.length;
}
