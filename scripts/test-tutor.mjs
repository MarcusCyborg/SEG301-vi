import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { unzipSync } from 'fflate';
import sharp from 'sharp';
import { DatabaseSync } from 'node:sqlite';

const source = resolve(import.meta.dirname, '..');
const root = await mkdtemp(resolve(tmpdir(), 'seg301m-tutor-test-'));
await mkdir(resolve(root, 'dist'));
await writeFile(resolve(root, 'dist/index.html'), '<!doctype html><title>SEG301m test</title>');
let child, base, identity;

function samplePdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    null,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  const stream = 'BT /F1 12 Tf 50 100 Td (Search engine indexing and retrieval notes) Tj ET';
  objects[3] = `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
  let content = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index++) {
    offsets.push(Buffer.byteLength(content));
    content += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const start = Buffer.byteLength(content);
  content += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) content += `${String(offset).padStart(10, '0')} 00000 n \n`;
  content += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(content);
}

async function start() {
  child = spawn(process.execPath, [resolve(source, 'server/main.mjs'), '--root', root], { stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stderr.on('data', (chunk) => { output += chunk; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${output}`);
    try {
      const instance = JSON.parse(await readFile(resolve(root, 'logs/instance.json'), 'utf8'));
      base = `http://127.0.0.1:${instance.port}`;
      const response = await fetch(`${base}/api/health`);
      if (response.ok && (await response.json()).instanceId === instance.instanceId) {
        identity = JSON.parse(await readFile(resolve(root, 'config/identity.json'), 'utf8'));
        return;
      }
    } catch {}
    await delay(100);
  }
  throw new Error(`Server did not become healthy: ${output}`);
}

async function request(path, options = {}) {
  const headers = { 'X-SEG301m-Client': '1', Origin: base, ...options.headers };
  if (typeof options.body === 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}/api${path}`, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('json') ? await response.json() : await response.arrayBuffer();
  return { status: response.status, data, headers: response.headers };
}

async function stop() {
  await request('/shutdown', { method: 'POST', headers: { 'X-SEG301m-Control': identity.controlToken } });
  await Promise.race([new Promise((resolveExit) => child.once('exit', resolveExit)), delay(5000).then(() => { throw new Error('Server did not exit'); })]);
}

try {
  await start();
  const health = (await request('/health')).data;
  assert.equal(health.app, 'SEG301m-Tutor');
  assert.equal((await fetch(`${base}/`)).status, 200);
  const localSettings = JSON.parse(await readFile(resolve(root, 'config/settings.json'), 'utf8'));
  assert.deepEqual(localSettings, { mode: 'mock', baseUrl: '', modelId: 'gpt-5.6-luna', apiKey: '', defaultEffort: 'medium' });
  const project = (await request('/projects', { method: 'POST', body: JSON.stringify({ name: 'Search coursework' }) })).data;
  assert.ok(project.id);
  assert.equal(project.name, 'Search coursework');
  const chat = (await request('/conversations', { method: 'POST', body: JSON.stringify({ projectId: project.id }) })).data;
  assert.ok(chat.id);
  assert.equal(chat.projectId, project.id);
  let projects = (await request('/projects')).data;
  assert.equal(projects.length, 1);
  assert.equal(projects[0].conversationCount, 1);
  assert.equal((await request('/conversations')).data[0].projectId, project.id);
  const renamedProject = await request(`/projects/${project.id}`, { method: 'PATCH', body: JSON.stringify({ name: 'Search and indexing' }) });
  assert.equal(renamedProject.status, 200);
  assert.equal(renamedProject.data.name, 'Search and indexing');
  const invalidProjectChat = await request('/conversations', { method: 'POST', body: JSON.stringify({ projectId: '00000000-0000-4000-8000-000000000000' }) });
  assert.equal(invalidProjectChat.status, 400);
  assert.equal(invalidProjectChat.data.error.code, 'invalid_project');
  const first = await request(`/conversations/${chat.id}/generations`, { method: 'POST', body: JSON.stringify({
    idempotencyKey: 'test-first', content: 'Chỉ mục đảo là gì?', effort: 'medium',
    context: {
      title: '2.4 インデックス作成', language: 'ja',
      citation: '/chapters/chapter-02.html#index-creation-ja',
      text: '転置インデックスは語から文書を引くための構造です。'
    }
  }) });
  assert.equal(first.status, 202);
  const eventResponse = await fetch(`${base}/api/generations/${first.data.id}/events`);
  const events = await eventResponse.text();
  assert.match(events, /event: delta/);
  assert.match(events, /event: done/);
  let loaded = (await request(`/conversations/${chat.id}`)).data;
  assert.equal(loaded.messages.length, 2);
  assert.equal(loaded.messages[0].context.language, 'ja');
  assert.equal(loaded.messages[0].context.citation, '/chapters/chapter-02.html#index-creation-ja');
  assert.equal(loaded.messages[0].context.text, '転置インデックスは語から文書を引くための構造です。');
  assert.match(loaded.messages[1].content, /MOCK/);
  assert.match(loaded.messages[1].content, /転置インデックス/);
  const edit = await request(`/conversations/${chat.id}/generations`, { method: 'POST', body: JSON.stringify({
    idempotencyKey: 'test-edit', editMessageId: loaded.messages[0].id, content: 'Explain postings lists.', effort: 'high'
  }) });
  assert.equal(edit.status, 202);
  await (await fetch(`${base}/api/generations/${edit.data.id}/events`)).text();
  loaded = (await request(`/conversations/${chat.id}`)).data;
  assert.equal(loaded.messages.length, 4);
  assert.notEqual(loaded.selectedLeafId, first.data.assistantMessageId);
  assert.equal(loaded.messages.find((item) => item.id === first.data.userMessageId).content, 'Chỉ mục đảo là gì?');
  assert.match(loaded.messages.find((item) => item.id === edit.data.assistantMessageId).content, /Explain postings lists/);
  const repeat = await request(`/conversations/${chat.id}/generations`, { method: 'POST', body: JSON.stringify({
    idempotencyKey: 'test-edit', editMessageId: loaded.messages[0].id, content: 'Explain postings lists.', effort: 'high'
  }) });
  assert.equal(repeat.data.id, edit.data.id);
  const upload = await request('/attachments', { method: 'POST', headers: { 'X-File-Name': 'notes.md', 'Content-Type': 'text/markdown' }, body: Buffer.from('# Notes\nUseful text') });
  assert.equal(upload.status, 201);
  const invalid = await request('/attachments', { method: 'POST', headers: { 'X-File-Name': 'fake.png', 'Content-Type': 'image/png' }, body: Buffer.from('not an image') });
  assert.equal(invalid.status, 400);
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#d75a38' } }).png().toBuffer();
  const image = await request('/attachments', { method: 'POST', headers: { 'X-File-Name': 'diagram.png', 'Content-Type': 'image/png' }, body: png });
  assert.equal(image.status, 201);
  assert.equal((await request(`/attachments/${image.data.id}/preview`)).status, 200);
  const pdf = await request('/attachments', { method: 'POST', headers: { 'X-File-Name': 'slides.pdf', 'Content-Type': 'application/pdf' }, body: samplePdf() });
  assert.equal(pdf.status, 201);
  const oversized = await request('/attachments', { method: 'POST', headers: { 'X-File-Name': 'huge.txt' }, body: Buffer.alloc(10 * 1024 * 1024 + 1, 65) });
  assert.equal(oversized.status, 400);
  assert.equal(oversized.data.error.code, 'file_too_large');
  const limitChat = (await request('/conversations', { method: 'POST', body: '{}' })).data;
  const maxMessage = await request(`/conversations/${limitChat.id}/generations`, { method: 'POST', body: JSON.stringify({
    idempotencyKey: 'test-message-200k', content: 'M'.repeat(200000), effort: 'low'
  }) });
  assert.equal(maxMessage.status, 202);
  await (await fetch(`${base}/api/generations/${maxMessage.data.id}/events`)).text();
  const tooLongMessage = await request(`/conversations/${limitChat.id}/generations`, { method: 'POST', body: JSON.stringify({
    idempotencyKey: 'test-message-over-200k', content: 'M'.repeat(200001), effort: 'low'
  }) });
  assert.equal(tooLongMessage.status, 400);
  assert.equal(tooLongMessage.data.error.code, 'invalid_message');
  const maxTextFile = await request('/attachments', { method: 'POST', headers: { 'X-File-Name': 'max.txt' }, body: Buffer.from('T'.repeat(200000)) });
  assert.equal(maxTextFile.status, 201);
  const withMaxTextFile = await request(`/conversations/${limitChat.id}/generations`, { method: 'POST', body: JSON.stringify({
    idempotencyKey: 'test-file-200k', content: 'Find the relevant section', attachmentIds: [maxTextFile.data.id], effort: 'low'
  }) });
  assert.equal(withMaxTextFile.status, 202);
  await (await fetch(`${base}/api/generations/${withMaxTextFile.data.id}/events`)).text();
  const tooLongTextFile = await request('/attachments', { method: 'POST', headers: { 'X-File-Name': 'over.txt' }, body: Buffer.from('T'.repeat(200001)) });
  assert.equal(tooLongTextFile.status, 400);
  assert.equal(tooLongTextFile.data.error.code, 'too_much_text');
  const splitTextA = await request('/attachments', { method: 'POST', headers: { 'X-File-Name': 'part-a.txt' }, body: Buffer.from('A'.repeat(100001)) });
  const splitTextB = await request('/attachments', { method: 'POST', headers: { 'X-File-Name': 'part-b.txt' }, body: Buffer.from('B'.repeat(100001)) });
  assert.equal(splitTextA.status, 201);
  assert.equal(splitTextB.status, 201);
  const overCombinedText = await request(`/conversations/${limitChat.id}/generations`, { method: 'POST', body: JSON.stringify({
    idempotencyKey: 'test-files-over-200k', content: 'Summarize both', attachmentIds: [splitTextA.data.id, splitTextB.data.id], effort: 'low'
  }) });
  assert.equal(overCombinedText.status, 400);
  assert.equal(overCombinedText.data.error.code, 'context_limit');
  assert.equal((await request(`/conversations/${limitChat.id}`, { method: 'DELETE' })).status, 200);
  const csvChat = (await request('/conversations', { method: 'POST', body: '{}' })).data;
  const csvGeneration = await request(`/conversations/${csvChat.id}/generations`, { method: 'POST', body: JSON.stringify({
    idempotencyKey: 'test-generated-csv', content: 'Hãy xuất kết quả ra file CSV giúp tôi', effort: 'low'
  }) });
  assert.equal(csvGeneration.status, 202);
  await (await fetch(`${base}/api/generations/${csvGeneration.data.id}/events`)).text();
  const csvConversation = (await request(`/conversations/${csvChat.id}`)).data;
  const csvMessage = csvConversation.messages.find((item) => item.id === csvGeneration.data.assistantMessageId);
  assert.equal(csvMessage.attachments.length, 1);
  assert.equal(csvMessage.attachments[0].name, 'mock-results.csv');
  assert.equal(csvMessage.attachments[0].mediaType, 'text/csv');
  const csvDownload = await fetch(`${base}${csvMessage.attachments[0].downloadUrl}`);
  assert.equal(csvDownload.status, 200);
  assert.match(csvDownload.headers.get('content-type'), /^text\/csv/);
  assert.match(csvDownload.headers.get('content-disposition'), /mock-results\.csv/);
  const csvBytes = Buffer.from(await csvDownload.arrayBuffer());
  assert.ok(csvBytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])));
  assert.match(csvBytes.toString('utf8'), /name,score\nAlice,9\nBob,8/);
  assert.equal((await request(`/conversations/${csvChat.id}`, { method: 'DELETE' })).status, 200);
  const withFile = await request(`/conversations/${chat.id}/generations`, { method: 'POST', body: JSON.stringify({
    idempotencyKey: 'test-file', content: 'Summarize my file', attachmentIds: [upload.data.id], effort: 'low'
  }) });
  await (await fetch(`${base}/api/generations/${withFile.data.id}/events`)).text();
  const compacted = await request(`/conversations/${chat.id}/compact`, { method: 'POST', body: '{}' });
  assert.equal(compacted.status, 200);
  assert.equal(compacted.data.throughId, withFile.data.assistantMessageId);
  assert.ok(compacted.data.summaryLength > 0);
  loaded = (await request(`/conversations/${chat.id}`)).data;
  assert.equal(loaded.compactedThroughId, withFile.data.assistantMessageId);
  assert.ok(loaded.compactedAt);
  const exported = await fetch(`${base}/api/conversations/${chat.id}/export`);
  assert.match(await exported.text(), /Summarize my file/);
  const crossOrigin = await fetch(`${base}/api/conversations`, { method: 'POST', headers: { Origin: 'https://example.com', 'X-SEG301m-Client': '1' } });
  assert.equal(crossOrigin.status, 403);
  assert.equal((await fetch(`${base}/config/identity.json`)).status, 404);
  const backup = await request('/backup', { method: 'POST' });
  assert.equal(backup.status, 200);
  const archive = unzipSync(new Uint8Array(backup.data));
  assert.ok(archive['tutor.sqlite']);
  assert.ok(Object.keys(archive).some((key) => key.startsWith('attachments/')));
  await stop();
  const dataDir = resolve(root, 'data');
  assert.ok(dataDir.startsWith(resolve(tmpdir())), 'Refusing test data cleanup outside temp directory');
  await rm(dataDir, { recursive: true, force: true });
  for (const [name, bytes] of Object.entries(archive)) {
    if (name === 'README.txt' || name.endsWith('/')) continue;
    const target = resolve(dataDir, name);
    assert.ok(target.startsWith(`${dataDir}\\`));
    await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, bytes);
  }
  const restored = new DatabaseSync(resolve(dataDir, 'tutor.sqlite'));
  restored.prepare("UPDATE generations SET status='generating' WHERE id=?").run(withFile.data.id);
  restored.prepare("UPDATE messages SET status='generating',content='Partial answer before crash' WHERE id=?").run(withFile.data.assistantMessageId);
  restored.close();
  await start();
  loaded = (await request(`/conversations/${chat.id}`)).data;
  assert.equal(loaded.projectId, project.id);
  projects = (await request('/projects')).data;
  assert.equal(projects.length, 1);
  assert.equal(projects[0].name, 'Search and indexing');
  assert.equal(projects[0].conversationCount, 1);
  assert.equal(loaded.messages.length, 6);
  assert.equal(loaded.messages.find((item) => item.id === withFile.data.userMessageId).attachments[0].name, 'notes.md');
  const interrupted = loaded.messages.find((item) => item.id === withFile.data.assistantMessageId);
  assert.equal(interrupted.status, 'interrupted');
  assert.equal(interrupted.content, 'Partial answer before crash');
  const projectDeleted = await request(`/projects/${project.id}`, { method: 'DELETE' });
  assert.equal(projectDeleted.status, 200);
  assert.equal((await request('/projects')).data.length, 0);
  loaded = (await request(`/conversations/${chat.id}`)).data;
  assert.equal(loaded.projectId, null);
  assert.equal(loaded.messages.length, 6);
  const deleted = await request(`/conversations/${chat.id}`, { method: 'DELETE' });
  assert.equal(deleted.status, 200);
  assert.equal((await request('/conversations')).data.length, 0);
  assert.equal((await request('/shutdown-ui', { method: 'POST' })).status, 200);
  await Promise.race([new Promise((resolveExit) => child.once('exit', resolveExit)), delay(5000).then(() => { throw new Error('UI shutdown did not exit'); })]);
  console.log('Tutor integration: projects, 200k text limits, generated CSV download, mock stream, branch, idempotency, text/image/PDF upload, export, backup/restore, interrupted recovery, deletion, origin, and UI shutdown passed.');
} finally {
  if (child && child.exitCode === null) child.kill();
  await rm(root, { recursive: true, force: true });
}
