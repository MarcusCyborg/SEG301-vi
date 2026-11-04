import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const catalog = JSON.parse(await readFile(resolve(root, 'content/chapters.json'), 'utf8'));

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) results.push(...await collectHtml(path));
    else if (extname(entry.name) === '.html') results.push(path);
  }
  return results;
}

function idsIn(html) {
  return [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
}

function localReferences(html) {
  return [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((match) => match[1])
    .filter((value) => !/^(?:https?:|mailto:|tel:|data:|javascript:)/.test(value));
}

const htmlFiles = await collectHtml(dist);
const expected = ['index.html', ...Array.from({ length: 12 }, (_, index) => `chapters/chapter-${String(index + 1).padStart(2, '0')}.html`)];
const errors = [];

if (htmlFiles.length !== 13) {
  errors.push(`Expected exactly 13 HTML pages, found ${htmlFiles.length}`);
}

for (const relative of expected) {
  try {
    await access(resolve(dist, relative));
  } catch {
    errors.push(`Missing generated page: ${relative}`);
  }
}

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  if (!html.includes('<html lang="vi">')) {
    errors.push(`${file}: HTML must declare lang="vi"`);
  }
  if (html.includes('data-set-language') || html.includes('class="language-switch"')) {
    errors.push(`${file}: contains language switch`);
  }
  if (html.includes('class="language-fallback"')) {
    errors.push(`${file}: contains language fallback notice`);
  }
  if (html.includes('class="language-copy"') || html.includes('class="language-panel"')) {
    errors.push(`${file}: contains legacy multilingual panel elements`);
  }

  const ids = idsIn(html);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length) errors.push(`${file}: duplicate ids ${[...new Set(duplicates)].join(', ')}`);
  if (/\{#[a-z0-9-]+\}/i.test(html)) errors.push(`${file}: unprocessed explicit heading marker`);

  for (const reference of localReferences(html)) {
    if (reference === '#' || reference.startsWith('#')) {
      const id = reference.slice(1);
      if (id && !ids.includes(id)) errors.push(`${file}: missing same-page target ${reference}`);
      continue;
    }
    const [pathWithQuery, hash] = reference.split('#');
    const pathPart = pathWithQuery.split('?')[0];
    const target = resolve(dirname(file), decodeURIComponent(pathPart));
    try {
      await access(target);
      if (hash && extname(target) === '.html') {
        const targetHtml = await readFile(target, 'utf8');
        if (!idsIn(targetHtml).includes(hash)) errors.push(`${file}: missing target ${reference}`);
      }
    } catch {
      errors.push(`${file}: broken local reference ${reference}`);
    }
  }
}

const home = await readFile(resolve(dist, 'index.html'), 'utf8');
if (home.includes('.pptx')) errors.push('index.html: PowerPoint file names must not appear on chapter cards');
if (!home.includes('BỘ SLIDE')) errors.push('index.html: missing BỘ SLIDE meter label');
if (!home.includes('BÀI HỌC ĐÃ CÓ')) errors.push('index.html: missing BÀI HỌC ĐÃ CÓ meter label');
if (!home.includes('class="chapter-status is-complete"')) errors.push('index.html: missing chapter-status badge');

for (const number of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
  const file = resolve(dist, `chapters/chapter-${String(number).padStart(2, '0')}.html`);
  const html = await readFile(file, 'utf8');
  if (!html.includes('id="learning-goals-vi"')) errors.push(`${file}: Vietnamese learning goals heading is missing`);
  if (!html.includes('id="glossary-vi"')) errors.push(`${file}: Vietnamese glossary is missing`);
  if (!html.includes('class="chapter-pager"')) errors.push(`${file}: chapter navigation is missing`);
  if (!html.includes('lang="vi-VN"')) errors.push(`${file}: lesson container must declare lang="vi-VN"`);

  // UI labels required
  for (const label of ['MỤC LỤC', 'GHI CHÚ HỌC TẬP', 'CHƯƠNG', 'NGUỒN', 'TÀI LIỆU', 'CHỈ MỤC', 'KẾT QUẢ']) {
    if (!html.includes(label)) errors.push(`${file}: missing required Vietnamese UI label ${label}`);
  }

  const directoryItems = [...html.matchAll(/class="chapter-directory__item(?: is-current)?"/g)];
  if (directoryItems.length !== 12) errors.push(`${file}: chapter directory must contain all 12 chapters`);
  if ((html.match(/class="chapter-directory__item is-current"/g) || []).length !== 1) {
    errors.push(`${file}: chapter directory must mark exactly one current chapter`);
  }
  if (!html.includes(`<span class="chapter-directory__item is-current" aria-current="page"><b>${String(number).padStart(2, '0')}</b>`)) {
    errors.push(`${file}: current chapter must be rendered as a non-link directory item`);
  }
  if (html.includes('class="status-main"')) errors.push(`${file}: completed lesson rendered as a placeholder`);
  const proseHtml = html.replace(/<pre\b[\s\S]*?<\/pre>/gi, '').replace(/<code\b[\s\S]*?<\/code>/gi, '');
  if (proseHtml.includes('**')) errors.push(`${file}: unprocessed Markdown emphasis marker`);
}

for (const chapter of catalog.chapters) {
  const number = String(chapter.number).padStart(2, '0');
  const file = resolve(dist, `chapters/chapter-${number}.html`);
  const html = await readFile(file, 'utf8');

  if (!html.includes(chapter.title)) errors.push(`chapter-${number}.html: Vietnamese chapter title is missing`);

  const markdown = await readFile(resolve(root, chapter.content), 'utf8');
  const sectionIds = [...markdown.matchAll(/^## .*\{#([a-z0-9-]+)\}\s*$/gmi)].map((match) => match[1]);
  if (!sectionIds.length) errors.push(`chapter-${number}.html: Vietnamese source has no explicit section IDs`);
  for (const id of sectionIds) {
    if (!html.includes(`id="${id}-vi"`)) errors.push(`chapter-${number}.html: missing Vietnamese anchor #${id}-vi`);
  }

  if (chapter.asset) {
    const assetPath = `../${chapter.asset.output}`;
    const figureIndex = html.indexOf('<figure class="chapter-map">');
    const targetIndex = html.indexOf(`id="${chapter.asset.insertBefore}-vi"`);
    if (figureIndex < 0) errors.push(`${file}: chapter mind map is missing`);
    if (!html.includes(`src="${assetPath}"`)) errors.push(`${file}: chapter mind map source is incorrect`);
    if (!html.includes(`width="${chapter.asset.width}" height="${chapter.asset.height}"`)) errors.push(`${file}: chapter mind map dimensions are incorrect`);
    if (figureIndex >= targetIndex || targetIndex < 0) errors.push(`${file}: chapter mind map is not before ${chapter.asset.insertBefore}`);
  }
}

for (const number of [5, 6, 7, 8, 9, 10, 11, 12]) {
  const file = resolve(dist, `chapters/chapter-${String(number).padStart(2, '0')}.html`);
  const html = await readFile(file, 'utf8');
  if (!html.includes('class="formula-block"')) errors.push(`${file}: worked formulas are missing`);
  if (!html.includes('class="answer-key"')) errors.push(`${file}: answer details are missing`);
  if (!html.includes('class="table-wrap"')) errors.push(`${file}: responsive lesson tables are missing`);
}

const appSource = await readFile(resolve(root, 'web/app.js'), 'utf8');
for (const banned of ['safeStorageSet', 'preferredBrowserLanguage', 'content-language-panel', 'data-set-language', 'seg301m-language']) {
  if (appSource.includes(banned)) errors.push(`web/app.js: contains banned multilingual marker ${banned}`);
}

const tutorSource = await readFile(resolve(root, 'web/tutor/tutor.js'), 'utf8');
if (!tutorSource.includes('vi: {')) errors.push('web/tutor/tutor.js: missing COPY.vi');
if (tutorSource.includes('ja: {') || tutorSource.includes('en: {')) errors.push('web/tutor/tutor.js: contains non-Vietnamese COPY');

const chapter1 = await readFile(resolve(dist, 'chapters/chapter-01.html'), 'utf8');
if (chapter1.includes('chapter-00.html')) errors.push('chapter-01.html: must not link to removed Chapter 00');
const chapter12 = await readFile(resolve(dist, 'chapters/chapter-12.html'), 'utf8');
if (chapter12.includes('chapter-13.html')) errors.push('chapter-12.html: must not link to a nonexistent Chapter 13');
if (!chapter12.includes('href="./chapter-11.html"')) errors.push('chapter-12.html: previous chapter navigation is missing');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Checked ${htmlFiles.length} HTML pages: links, anchors, Vietnamese-only structure, and lesson elements are valid.`);
}
