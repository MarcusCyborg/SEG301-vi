import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tutorLimits } from './limits.mjs';

const csvAction = /(?:\b(?:convert|create|download|export|generate|give|make|output|provide|return|save)\b|cho\s+(?:tôi|mình)|chuyển|xuất|tạo|tải|lưu|生成|作成|出力|保存)/iu;

export function wantsCsvFile(message) {
  const value = String(message ?? '');
  return /\bcsv\b/iu.test(value) && csvAction.test(value);
}

function safeCsvName(value) {
  let name = String(value ?? '').normalize('NFKC').replace(/[\\/\x00-\x1f\x7f<>:"|?*]/g, '_').trim();
  name = name.replace(/^[`'\"]+|[`'\"]+$/g, '').slice(0, 120).trim();
  if (!name.toLowerCase().endsWith('.csv')) name += '.csv';
  return name === '.csv' ? 'seg301m-export.csv' : name;
}

export function extractCsvArtifact(content) {
  const value = String(content ?? '');
  const block = /```(?:csv|text\/csv)(?:[^\r\n]*)\r?\n([\s\S]*?)\r?\n```/iu.exec(value);
  if (!block) return null;
  const prefix = value.slice(Math.max(0, block.index - 240), block.index);
  const declaredName = /CSV_FILE:\s*([^\r\n]+)/iu.exec(prefix)?.[1];
  const csv = block[1].replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/^\n+|\n+$/g, '') + '\n';
  if (!csv.trim() || csv.length > tutorLimits.extractedTextChars) return null;
  return { name: safeCsvName(declaredName || 'seg301m-export.csv'), mediaType: 'text/csv', text: csv };
}

export async function saveGeneratedCsv(db, root, messageId, artifact) {
  const message = db.prepare("SELECT id FROM messages WHERE id=? AND role='assistant'").get(messageId);
  if (!message) throw Object.assign(new Error('Assistant message does not exist.'), { code: 'invalid_generated_file' });
  const id = randomUUID();
  const relativePath = `data/attachments/${id}.csv`;
  const path = resolve(root, relativePath);
  const bytes = Buffer.from(`\uFEFF${artifact.text}`, 'utf8');
  await mkdir(resolve(root, 'data', 'attachments'), { recursive: true });
  await writeFile(path, bytes, { flag: 'wx' });
  try {
    db.exec('BEGIN IMMEDIATE');
    db.prepare(`INSERT INTO attachments(id,original_name,media_type,byte_size,extracted_text,path,created_at)
      VALUES (?,?,?,?,?,?,?)`).run(id, artifact.name, artifact.mediaType, bytes.length, artifact.text, relativePath, new Date().toISOString());
    db.prepare('INSERT INTO message_attachments VALUES (?,?)').run(messageId, id);
    db.exec('COMMIT');
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch {}
    await unlink(path).catch(() => {});
    throw error;
  }
  return { id, name: artifact.name, mediaType: artifact.mediaType, size: bytes.length };
}
