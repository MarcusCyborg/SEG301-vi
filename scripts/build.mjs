import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Marked } from 'marked';
import { build } from 'esbuild';

const root = resolve(import.meta.dirname, '..');
const outputDir = resolve(root, 'dist');
const chaptersDir = resolve(outputDir, 'chapters');
const catalog = JSON.parse(await readFile(resolve(root, 'content/chapters.json'), 'utf8'));
const termsList = JSON.parse(await readFile(resolve(root, 'content/terms.json'), 'utf8'));

const termsMap = new Map();
const termByEnLower = new Map();
const termByViLower = new Map();
const termByAliasLower = new Map();

for (const t of termsList) {
  if (!t.id || typeof t.id !== 'string') {
    throw new Error(`Build error: Term record missing valid 'id'`);
  }
  if (!t.preserveEnglish && (!t.vi || typeof t.vi !== 'string' || t.vi.trim() === '')) {
    throw new Error(`Build error: Term "${t.id}" has preserveEnglish: false but is missing Vietnamese translation (vi)`);
  }
  termsMap.set(t.id, t);
  if (t.en) termByEnLower.set(t.en.toLowerCase(), t);
  if (t.vi) termByViLower.set(t.vi.toLowerCase(), t);
  for (const alias of t.aliases || []) {
    if (alias && typeof alias === 'string') {
      termByAliasLower.set(alias.toLowerCase(), t);
    }
  }
}

const termsSummary = termsList.map((item) => ({
  id: item.id,
  en: item.en,
  vi: item.vi,
  aliases: item.aliases || [],
  category: item.category,
  preserveEnglish: !!item.preserveEnglish
}));

const assetVersion = '20261104-vi';

const ui = {
  siteLabel: 'GHI CHÚ HỌC TẬP',
  home: 'Trang chủ',
  chapters: 'Xem tất cả chương',
  contents: 'Mục lục',
  start: 'Bắt đầu học',
  skip: 'Chuyển đến bài học',
  sourceSlides: (count) => `Nguồn: toàn bộ ${count} slide bài giảng`,
  edition: (number) => `Bản tiếng Việt · Chương ${String(number).padStart(2, '0')}`,
  top: 'Về đầu trang ↑',
  glossaryLink: 'Xem bảng thuật ngữ',
  previous: 'Chương trước',
  next: 'Chương sau',
  complete: 'BÀI HỌC ĐÃ CÓ',
  sourcePrefix: 'Slide nguồn:',
  sourceLabel: 'SLIDE NGUỒN',
  noteLabels: {
    'Giải thích dễ hiểu': 'simple',
    'Giải thích chính xác hơn': 'context',
    'Giải thích thêm ngoài slide': 'context',
    'Ví dụ bổ sung ngoài slide': 'context',
    'Kiểm tra nhanh': 'question',
    'Gợi ý thực hiện': 'context',
    'Lưu ý': 'question',
    'Giới hạn': 'context',
    'Ý nghĩa': 'context'
  },
  glossary: {
    label: 'Tìm thuật ngữ',
    placeholder: 'Nhập từ tiếng Việt hoặc tiếng Anh',
    count: 'Đang hiển thị {shown} / {total} thuật ngữ'
  }
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripDocumentHeader(markdown) {
  return markdown.replace(/^# .+\r?\n\r?\nSEG301m (?:学習用テキスト|study notes|ghi chú học tập)\r?\n\r?\n/i, '');
}

function chapterLabel(number) {
  return `CHƯƠNG ${number}`;
}

function chapterHeroTitle(chapter) {
  const title = escapeHtml(chapter.title);
  const words = title.split(' ');
  if (words.length > 2) {
    const midpoint = Math.ceil(words.length / 2);
    return `${words.slice(0, midpoint).join(' ')}<br><em>${words.slice(midpoint).join(' ')}</em>`;
  }
  return `<em>${title}</em>`;
}

function termSwitcher() {
  return `<div class="term-switcher" role="group" aria-label="Chế độ hiển thị thuật ngữ">
    <span class="term-switcher__label" id="term-switcher-label">Thuật ngữ:</span>
    <div class="term-switcher__buttons" role="radiogroup" aria-labelledby="term-switcher-label">
      <button type="button" role="radio" class="term-switcher__btn" data-mode="en" aria-checked="false" title="Hiển thị tiếng Anh (English)">English</button>
      <button type="button" role="radio" class="term-switcher__btn is-active" data-mode="bilingual" aria-checked="true" title="Hiển thị song ngữ (Anh + Việt)">Anh + Việt</button>
      <button type="button" role="radio" class="term-switcher__btn" data-mode="vi" aria-checked="false" title="Hiển thị tiếng Việt">Tiếng Việt</button>
    </div>
  </div>`;
}

function isStartOfSentence(html, offset) {
  const before = html.slice(Math.max(0, offset - 500), offset);
  const blockMatches = [...before.matchAll(/<\/?(?:p|li|h[1-6]|div|blockquote|td|th|dt|dd|summary|br|hr|tr)\b[^>]*>/gi)];
  let segment = before;
  if (blockMatches.length > 0) {
    const lastBlock = blockMatches[blockMatches.length - 1];
    segment = before.slice(lastBlock.index + lastBlock[0].length);
  }
  const cleanText = segment.replace(/\{\{term:[^}]+\}\}/g, 'word').replace(/<[^>]+>/g, '').trim();
  if (cleanText.length === 0) {
    return true;
  }
  return /[.:!?…][\"')\]”’]*$/.test(cleanText);
}

const forbiddenOrMarkerRegex = /(<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>|<div\b[^>]*\bformula-block\b[^>]*>[\s\S]*?<\/div>|<(?:div|span)\b[^>]*\bkatex\b[^>]*>[\s\S]*?<\/(?:div|span)>|<math\b[\s\S]*?<\/math>|<[^>]+>)|(\{\{term:([^}]+)\}\})/gi;

function expandMarkers(html) {
  return html.replace(forbiddenOrMarkerRegex, (match, forbidden, marker, rawId, offset, fullString) => {
    if (forbidden) {
      return match;
    }

    const id = rawId.trim();
    const term = termsMap.get(id);
    if (!term) {
      throw new Error(`Build error: Marker "${match}" references nonexistent term ID "${id}"`);
    }

    if (!term.preserveEnglish && (!term.vi || typeof term.vi !== 'string' || term.vi.trim() === '')) {
      throw new Error(`Build error: Term "${id}" has preserveEnglish: false but is missing Vietnamese translation (vi)`);
    }

    const isStart = isStartOfSentence(fullString, offset);
    let en = term.en;
    let vi = term.vi;

    if (isStart) {
      if (!term.preserveEnglish && term.category !== 'acronym') {
        en = en.charAt(0).toUpperCase() + en.slice(1);
      }
      if (!term.preserveEnglish && vi) {
        vi = vi.charAt(0).toUpperCase() + vi.slice(1);
      }
    }

    const isSame = term.preserveEnglish || (term.en && term.vi && term.en.toLowerCase() === term.vi.toLowerCase());
    const classNames = isSame ? 'term term--same' : 'term';

    return `<span class="${classNames}" data-term-id="${escapeHtml(term.id)}"><span class="term__en">${escapeHtml(en)}</span><span class="term__vi">${escapeHtml(vi)}</span></span>`;
  });
}

function normalizeText(s) {
  return s.replace(/<[^>]+>/g, '').trim().toLowerCase();
}

function findTermForCells(enText, viText) {
  const markerMatch = (enText + ' ' + viText).match(/\{\{term:([a-z0-9-]+)\}\}/);
  if (markerMatch && termsMap.has(markerMatch[1])) {
    return termsMap.get(markerMatch[1]);
  }

  const dataTermMatch = (enText + ' ' + viText).match(/data-term-id="([a-z0-9-]+)"/);
  if (dataTermMatch && termsMap.has(dataTermMatch[1])) {
    return termsMap.get(dataTermMatch[1]);
  }

  const normEn = normalizeText(enText);
  const normVi = normalizeText(viText);

  if (termByEnLower.has(normEn)) return termByEnLower.get(normEn);
  if (termByAliasLower.has(normEn)) return termByAliasLower.get(normEn);
  if (termsMap.has(normEn)) return termsMap.get(normEn);

  const parenMatch = normEn.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    const base = parenMatch[1].trim();
    const paren = parenMatch[2].trim();
    if (termByEnLower.has(base)) return termByEnLower.get(base);
    if (termByAliasLower.has(base)) return termByAliasLower.get(base);
    if (termByEnLower.has(paren)) return termByEnLower.get(paren);
    if (termByAliasLower.has(paren)) return termByAliasLower.get(paren);
  }

  if (normEn.includes('/')) {
    const parts = normEn.split('/').map((p) => p.trim());
    for (const p of parts) {
      if (termByEnLower.has(p)) return termByEnLower.get(p);
      if (termByAliasLower.has(p)) return termByAliasLower.get(p);
    }
  }

  if (termByViLower.has(normVi)) return termByViLower.get(normVi);

  if (normVi.includes('/')) {
    const parts = normVi.split('/').map((p) => p.trim());
    for (const p of parts) {
      if (termByViLower.has(p)) return termByViLower.get(p);
    }
  }

  for (const t of termsList) {
    if (t.en.toLowerCase() === normEn || t.vi.toLowerCase() === normVi) return t;
    if (normEn.includes(t.en.toLowerCase()) && t.en.length > 3) return t;
  }

  return null;
}

function optimizeGlossaryTable(html) {
  const glossaryIndex = html.indexOf('id="glossary-vi"');
  if (glossaryIndex === -1) return html;

  const tableStartIndex = html.indexOf('<table', glossaryIndex);
  if (tableStartIndex === -1) return html;

  const tableEndIndex = html.indexOf('</table>', tableStartIndex);
  if (tableEndIndex === -1) return html;

  const beforeTable = html.slice(0, tableStartIndex);
  const tableHtml = html.slice(tableStartIndex, tableEndIndex + 8);
  const afterTable = html.slice(tableEndIndex + 8);

  const modifiedTable = tableHtml.replace(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi, (rowMatch, trAttrs, rowContent) => {
    if (!/<td\b/i.test(rowContent)) return rowMatch;

    const cells = [...rowContent.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
    if (cells.length < 2) return rowMatch;

    const term = findTermForCells(cells[0], cells[1]);
    if (!term) return rowMatch;

    const aliases = (term.aliases || []).join(',');
    const acronymAttr = term.category === 'acronym' ? ' data-acronym="true"' : '';
    const newAttrs = ` data-term-id="${escapeHtml(term.id)}" data-aliases="${escapeHtml(aliases)}"${acronymAttr}`;

    return `<tr${trAttrs}${newAttrs}>${rowContent}</tr>`;
  });

  return beforeTable + modifiedTable + afterTable;
}

async function renderMarkdown(chapter, sourcePath) {
  const source = await readFile(resolve(root, sourcePath), 'utf8');
  const markdown = stripDocumentHeader(source);
  const sections = [];
  let subheadingNumber = 0;
  const labelPattern = Object.keys(ui.noteLabels).map(escapeRegex).join('|');
  const marked = new Marked({ gfm: true });

  marked.use({
    renderer: {
      heading(token) {
        const rawText = token.text ?? token.tokens?.map((item) => item.raw).join('') ?? '';
        const explicit = rawText.match(/\s*\{#([a-z0-9-]+)\}\s*$/i);
        let baseId;
        if (token.depth === 2) {
          if (!explicit) throw new Error(`${sourcePath}: every level-2 heading needs an explicit {#section-id}`);
          baseId = explicit[1];
        } else {
          baseId = `detail-${++subheadingNumber}`;
        }
        const label = this.parser.parseInline(token.tokens).replace(/\s*\{#(?:[a-z0-9-]+)\}\s*$/i, '');
        if (token.depth === 2) sections.push({ id: baseId, title: label.replace(/<[^>]+>/g, '') });
        const sectionData = token.depth === 2 ? ` data-section-heading="${baseId}"` : '';
        return `<h${token.depth} id="${baseId}-vi"${sectionData}>${label}</h${token.depth}>\n`;
      },
      paragraph(token) {
        const html = this.parser.parseInline(token.tokens);
        if (html.startsWith(ui.sourcePrefix)) {
          return `<p class="source-note"><span>${ui.sourceLabel}</span> ${html.slice(ui.sourcePrefix.length).trim()}</p>\n`;
        }
        const note = html.match(new RegExp(`^<strong>(${labelPattern}):<\\/strong>\\s*([\\s\\S]*)$`));
        if (note) {
          return `<aside class="learning-note learning-note--${ui.noteLabels[note[1]]}"><span class="learning-note__label">${note[1]}</span><p>${note[2]}</p></aside>\n`;
        }
        return `<p>${html}</p>\n`;
      }
    }
  });

  let article = marked.parse(markdown);
  article = article.replace(/<details>\s*<summary>([^<]+)<\/summary>\s*([\s\S]*?)\s*<\/details>/g, (_, summary, body) =>
    `<details class="answer-key"><summary>${summary}</summary><div class="answer-key__body">${marked.parse(body.trim())}</div></details>`);
  article = optimizeGlossaryTable(article);
  article = article.replace(/<table>[\s\S]*?<\/table>/g, (table) => `<div class="table-wrap">${table}</div>`);
  article = expandMarkers(article);

  if (chapter.asset?.insertBefore) {
    const assetPath = `../${chapter.asset.output}`;
    const figure = `<figure class="chapter-map"><a href="${assetPath}" target="_blank" rel="noopener"><img src="${assetPath}" width="${chapter.asset.width}" height="${chapter.asset.height}" loading="lazy" alt="${escapeHtml(chapter.asset.alt)}"></a><figcaption>${escapeHtml(chapter.asset.caption)}</figcaption></figure>`;
    article = article.replace(`<h2 id="${chapter.asset.insertBefore}-vi"`, `${figure}\n<h2 id="${chapter.asset.insertBefore}-vi"`);
  }

  const toc = sections.slice(1).map((section, index) =>
    `<a href="#${section.id}-vi" data-section="${section.id}"><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(section.title)}</a>`).join('\n');

  return { article, sections, toc };
}

function head({ title, description, assetPrefix, localeData }) {
  return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#163b3c">
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/svg+xml" href="${assetPrefix}assets/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Sans:wght@400;500;600;700&family=Noto+Serif:wght@500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${assetPrefix}styles.css?v=${assetVersion}">
  <link rel="stylesheet" href="${assetPrefix}tutor.css?v=${assetVersion}">
  <link rel="stylesheet" href="${assetPrefix}assets/katex/katex.min.css?v=${assetVersion}">
  <link rel="stylesheet" href="${assetPrefix}assets/highlight.css?v=${assetVersion}">
  <script>
    (function() {
      try {
        var saved = localStorage.getItem('seg301m-term-mode');
        var mode = (saved === 'en' || saved === 'vi' || saved === 'bilingual') ? saved : 'bilingual';
        document.documentElement.setAttribute('data-term-mode', mode);
      } catch (e) {
        document.documentElement.setAttribute('data-term-mode', 'bilingual');
      }
    })();
  </script>
  <script id="locale-data" type="application/json">${JSON.stringify(localeData).replace(/</g, '\\u003c')}</script>
  <script src="${assetPrefix}app.js?v=${assetVersion}" defer></script>
  <script src="${assetPrefix}tutor.js?v=${assetVersion}" defer></script>
</head>`;
}

function chapterHeader(chapter) {
  return `<header class="site-header">
    <a class="wordmark" href="../index.html" aria-label="SEG301m home">SEG<span>301</span>m<span class="wordmark__dot">.</span></a>
    <span class="site-header__caption">${ui.siteLabel} <span aria-hidden="true">/</span> ${chapterLabel(chapter.number)}</span>
    ${termSwitcher()}
    <a class="site-header__link" href="../index.html">${ui.chapters} <span aria-hidden="true">↗</span></a>
  </header>`;
}

function chapterHero(chapter) {
  return `<section class="hero" id="top">
    <div class="hero__inner">
      <div class="hero__copy">
        <p class="eyebrow"><span class="eyebrow__line"></span> SEG301m / ${chapterLabel(chapter.number)}</p>
        <h1 id="page-title">${chapterHeroTitle(chapter)}</h1>
        <p class="hero__description">${escapeHtml(chapter.description)}</p>
        <a class="start-link" href="#learning-goals-vi">${ui.start} <span aria-hidden="true">↓</span></a>
      </div>
      <div class="hero__visual" aria-hidden="true">
        <span class="orbit orbit--one"></span><span class="orbit orbit--two"></span>
        <span class="signal signal--one"></span><span class="signal signal--two"></span>
        <span class="hero__query">NGUỒN <b>${String(chapter.number).padStart(2, '0')}</b></span>
        <span class="hero__result hero__result--one">01 <b>TÀI LIỆU</b></span>
        <span class="hero__result hero__result--two">02 <b>CHỈ MỤC</b></span>
        <span class="hero__result hero__result--three">03 <b>KẾT QUẢ</b></span>
        <span class="hero__visual-label">TỪ NGUỒN ĐẾN TÌM KIẾM</span>
      </div>
    </div>
    <div class="hero__footer"><span>${chapterLabel(chapter.number)}</span><span>${ui.sourceSlides(chapter.slideCount)}</span></div>
  </section>`;
}

function chapterNavigation(chapter) {
  const index = catalog.chapters.findIndex((item) => item.id === chapter.id);
  const previous = catalog.chapters[index - 1];
  const next = catalog.chapters[index + 1];
  const link = (item, direction) => item ? `<a class="chapter-pager__${direction}" href="./${item.output}">
    <span>${direction === 'previous' ? ui.previous : ui.next}</span>
    <strong>${String(item.number).padStart(2, '0')} · ${escapeHtml(item.title)}</strong>
  </a>` : '<span></span>';
  return `<nav class="chapter-pager" aria-label="Chapter navigation">${link(previous, 'previous')}${link(next, 'next')}</nav>`;
}

function chapterDirectory(currentChapter) {
  const items = catalog.chapters.map((chapter) => {
    const content = `<b>${String(chapter.number).padStart(2, '0')}</b>${escapeHtml(chapter.shortTitle)}`;
    return chapter.id === currentChapter.id
      ? `<span class="chapter-directory__item is-current" aria-current="page">${content}</span>`
      : `<a class="chapter-directory__item" href="./${chapter.output}">${content}</a>`;
  }).join('\n');

  return `<div class="chapter-directory">
    <p class="chapter-directory__label">ĐỦ 12 CHƯƠNG</p>
    <div class="chapter-directory__links">${items}</div>
  </div>`;
}

async function buildLessonPage(chapter) {
  const rendered = await renderMarkdown(chapter, chapter.content);
  const localeData = {
    page: 'chapter',
    glossary: ui.glossary,
    backToTop: 'Về đầu trang',
    termsList: termsSummary
  };

  const page = `<!doctype html>
<html lang="vi">
${head({
  title: `${chapterLabel(chapter.number)} ${chapter.title} | SEG301m`,
  description: chapter.description,
  assetPrefix: '../',
  localeData
})}
<body data-page="chapter" data-language="vi" data-term-mode="bilingual">
  <a class="skip-link" href="#learning-goals-vi">${ui.skip}</a>
  <div class="reading-progress" aria-hidden="true"><span></span></div>
  ${chapterHeader(chapter)}
  ${chapterHero(chapter)}
  <div class="page-layout" id="lesson">
    <nav class="chapter-nav" aria-label="Mục lục"><div class="chapter-nav__sticky">
      <p class="chapter-nav__label">MỤC LỤC <span>${String(chapter.number).padStart(2, '0')} / 12</span></p>
      <div class="chapter-nav__links">${rendered.toc}</div>
      ${chapterDirectory(chapter)}
    </div></nav>
    <main class="lesson-content" id="main-content">
      <article class="lesson-language" lang="vi-VN" data-lang="vi">
        <div class="intro-mark"><span>${ui.siteLabel}</span><span>${ui.edition(chapter.number)}</span></div>
        ${rendered.article}
        <footer class="lesson-footer"><span class="lesson-footer__meta"><span>SEG301m / ${chapterLabel(chapter.number)}</span><span class="site-credit">Made by <strong>Marcus</strong></span></span><a href="#top">${ui.top}</a></footer>
      </article>
      ${chapterNavigation(chapter)}
    </main>
  </div>
</body>
</html>`;

  await writeFile(resolve(chaptersDir, chapter.output), page, 'utf8');
  return rendered;
}

function homePage() {
  const cards = catalog.chapters.map((chapter) => `<article class="chapter-card is-available">
    <a href="./chapters/${chapter.output}" aria-label="Chương ${chapter.number}: ${escapeHtml(chapter.title)}">
      <div class="chapter-card__number">${String(chapter.number).padStart(2, '0')}</div>
      <div class="chapter-card__body">
        <h2>${escapeHtml(chapter.title)}</h2>
        <span class="chapter-card__english">${escapeHtml(chapter.englishTitle)}</span>
        <div class="chapter-card__status"><span class="chapter-status is-complete">${ui.complete}</span></div>
      </div>
      <span class="chapter-card__arrow" aria-hidden="true">↗</span>
    </a>
  </article>`).join('\n');

  const localeData = {
    page: 'home',
    glossary: ui.glossary,
    backToTop: 'Về đầu trang',
    termsList: termsSummary
  };

  return `<!doctype html>
<html lang="vi">
${head({
  title: catalog.site.title,
  description: catalog.site.description,
  assetPrefix: './',
  localeData
})}
<body data-page="home" data-language="vi" data-term-mode="bilingual">
  <header class="site-header home-header">
    <a class="wordmark" href="#top" aria-label="SEG301m">SEG<span>301</span>m<span class="wordmark__dot">.</span></a>
    <span class="site-header__caption">Truy xuất thông tin <span aria-hidden="true">/</span> Công cụ tìm kiếm</span>
    ${termSwitcher()}
    <a class="site-header__link" href="#chapters">Danh sách chương <span aria-hidden="true">↓</span></a>
  </header>
  <main id="top">
    <section class="home-hero">
      <div class="home-hero__copy">
        <p class="eyebrow"><span class="eyebrow__line"></span> SEG301m / TÀI LIỆU HỌC TẬP</p>
        <h1>Hiểu công cụ tìm kiếm<br><em>từ bên trong</em></h1>
        <p>Tài liệu theo từng chương về thu thập, lập chỉ mục, xếp hạng và đánh giá thông tin. Cả 12 chương đều có đầy đủ bài giảng bằng tiếng Việt.</p>
      </div>
      <div class="home-hero__meter"><strong>${String(catalog.chapters.length).padStart(2, '0')}</strong><span>BỘ SLIDE</span><i></i><strong>${String(catalog.chapters.length).padStart(2, '0')}</strong><span>BÀI HỌC ĐÃ CÓ</span></div>
    </section>
    <section class="course-intro">
      <p>Chọn một chương để xem slide nguồn, ví dụ minh họa, câu hỏi ôn tập và bảng thuật ngữ có thể tìm kiếm. Tất cả 12 chương đã hoàn thiện nội dung tiếng Việt.</p>
    </section>
    <section class="chapter-index" id="chapters">
      <div class="chapter-index__heading"><span>01 — 12</span><h2>Toàn bộ chương học</h2></div>
      <div class="chapter-grid">${cards}</div>
    </section>
  </main>
  <footer class="home-footer"><span class="home-footer__meta"><span>SEG301m</span><span class="site-credit">Made by <strong>Marcus</strong></span></span><span>Truy xuất thông tin và công cụ tìm kiếm</span></footer>
</body>
</html>`;
}

await rm(outputDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
await mkdir(chaptersDir, { recursive: true });
await mkdir(resolve(outputDir, 'assets'), { recursive: true });
await writeFile(resolve(outputDir, '.gitignore'), '.vercel\n', 'utf8');

for (const chapter of catalog.chapters) {
  await buildLessonPage(chapter);
  if (chapter.asset) {
    const destination = resolve(outputDir, chapter.asset.output);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(resolve(root, chapter.asset.source), destination);
  }
}

await writeFile(resolve(outputDir, 'index.html'), homePage(), 'utf8');
await copyFile(resolve(root, 'web/styles.css'), resolve(outputDir, 'styles.css'));
await copyFile(resolve(root, 'web/app.js'), resolve(outputDir, 'app.js'));
await copyFile(resolve(root, 'web/favicon.svg'), resolve(outputDir, 'assets/favicon.svg'));
await copyFile(resolve(root, 'web/favicon.svg'), resolve(outputDir, 'favicon.ico'));
await copyFile(resolve(root, 'web/favicon.svg'), resolve(outputDir, 'favicon.svg'));
await copyFile(resolve(root, 'web/tutor/tutor.css'), resolve(outputDir, 'tutor.css'));
await mkdir(resolve(outputDir, 'assets/katex'), { recursive: true });
await copyFile(resolve(root, 'node_modules/katex/dist/katex.min.css'), resolve(outputDir, 'assets/katex/katex.min.css'));
await cp(resolve(root, 'node_modules/katex/dist/fonts'), resolve(outputDir, 'assets/katex/fonts'), { recursive: true });
await copyFile(resolve(root, 'node_modules/highlight.js/styles/github.min.css'), resolve(outputDir, 'assets/highlight.css'));
await build({
  entryPoints: [resolve(root, 'web/tutor/tutor.js')],
  outfile: resolve(outputDir, 'tutor.js'),
  bundle: true,
  platform: 'browser',
  format: 'iife',
  minify: true
});
console.log(`Built ${catalog.chapters.length + 1} static pages in dist/`);
