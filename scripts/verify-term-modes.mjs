import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const root = resolve(import.meta.dirname, '..');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

console.log('--- Phase 2 Term Modes & QA Test Suite (12 Required Cases) ---');

const browser = await puppeteer.launch({
  executablePath: edgePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
});

try {
  const page = await browser.newPage();
  const ch1Url = `file://${resolve(root, 'dist/chapters/chapter-01.html').replace(/\\/g, '/')}`;
  const ch2Url = `file://${resolve(root, 'dist/chapters/chapter-02.html').replace(/\\/g, '/')}`;
  const homeUrl = `file://${resolve(root, 'dist/index.html').replace(/\\/g, '/')}`;

  // Helper to get display state of terms and switcher
  const getTermDisplayState = async () => {
    return page.evaluate(() => {
      const docMode = document.documentElement.dataset.termMode;
      const terms = Array.from(document.querySelectorAll('.term:not(.term--same)'));
      if (terms.length === 0) return { docMode, count: 0 };
      const sample = terms[0];
      const enSpan = sample.querySelector('.term__en');
      const viSpan = sample.querySelector('.term__vi');
      return {
        docMode,
        count: terms.length,
        enDisplay: enSpan ? window.getComputedStyle(enSpan).display : null,
        viDisplay: viSpan ? window.getComputedStyle(viSpan).display : null,
        activeButton: document.querySelector('.term-switcher__btn.is-active')?.dataset.mode,
        storedMode: localStorage.getItem('seg301m-term-mode')
      };
    });
  };

  // -------------------------------------------------------------
  // Case 1: Mặc định là bilingual (data-term-mode="bilingual", nút active là 'bilingual', .term__en và .term__vi đều hiển thị)
  // -------------------------------------------------------------
  await page.goto(ch1Url, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });

  const state1 = await getTermDisplayState();
  assert.equal(state1.docMode, 'bilingual', 'Case 1: data-term-mode must be "bilingual" by default');
  assert.equal(state1.activeButton, 'bilingual', 'Case 1: Active switcher button must be "bilingual"');
  assert.notEqual(state1.enDisplay, 'none', 'Case 1: .term__en must be visible in bilingual mode');
  assert.notEqual(state1.viDisplay, 'none', 'Case 1: .term__vi must be visible in bilingual mode');
  console.log('✓ Case 1 passed: Default mode is bilingual with both EN and VI visible.');

  // -------------------------------------------------------------
  // Case 2: Chuyển sang en (click nút English, data-term-mode="en", .term__en hiển thị, .term__vi bị ẩn display: none)
  // -------------------------------------------------------------
  await page.evaluate(() => {
    document.querySelector('.term-switcher__btn[data-mode="en"]')?.click();
  });
  const state2 = await getTermDisplayState();
  assert.equal(state2.docMode, 'en', 'Case 2: data-term-mode must be "en"');
  assert.equal(state2.activeButton, 'en', 'Case 2: Active switcher button must be "en"');
  assert.notEqual(state2.enDisplay, 'none', 'Case 2: .term__en must be visible in en mode');
  assert.equal(state2.viDisplay, 'none', 'Case 2: .term__vi must be hidden (display: none) in en mode');
  assert.equal(state2.storedMode, 'en', 'Case 2: localStorage must store "en"');
  console.log('✓ Case 2 passed: Switch to en hides VI and shows EN.');

  // -------------------------------------------------------------
  // Case 3: Chuyển sang vi (click nút Tiếng Việt, data-term-mode="vi", .term__en bị ẩn, .term__vi hiển thị)
  // -------------------------------------------------------------
  await page.evaluate(() => {
    document.querySelector('.term-switcher__btn[data-mode="vi"]')?.click();
  });
  const state3 = await getTermDisplayState();
  assert.equal(state3.docMode, 'vi', 'Case 3: data-term-mode must be "vi"');
  assert.equal(state3.activeButton, 'vi', 'Case 3: Active switcher button must be "vi"');
  assert.equal(state3.enDisplay, 'none', 'Case 3: .term__en must be hidden (display: none) in vi mode');
  assert.notEqual(state3.viDisplay, 'none', 'Case 3: .term__vi must be visible in vi mode');
  assert.equal(state3.storedMode, 'vi', 'Case 3: localStorage must store "vi"');
  console.log('✓ Case 3 passed: Switch to vi hides EN and shows VI.');

  // -------------------------------------------------------------
  // Case 4: Chuyển lại bilingual (click nút Anh + Việt, cả hai đều hiển thị)
  // -------------------------------------------------------------
  await page.evaluate(() => {
    document.querySelector('.term-switcher__btn[data-mode="bilingual"]')?.click();
  });
  const state4 = await getTermDisplayState();
  assert.equal(state4.docMode, 'bilingual', 'Case 4: data-term-mode must be "bilingual"');
  assert.equal(state4.activeButton, 'bilingual', 'Case 4: Active switcher button must be "bilingual"');
  assert.notEqual(state4.enDisplay, 'none', 'Case 4: .term__en must be visible in bilingual mode');
  assert.notEqual(state4.viDisplay, 'none', 'Case 4: .term__vi must be visible in bilingual mode');
  assert.equal(state4.storedMode, 'bilingual', 'Case 4: localStorage must store "bilingual"');
  console.log('✓ Case 4 passed: Switch back to bilingual shows both EN and VI.');

  // -------------------------------------------------------------
  // Case 5: Reload trang vẫn giữ nguyên mode đã chọn
  // -------------------------------------------------------------
  await page.evaluate(() => {
    document.querySelector('.term-switcher__btn[data-mode="vi"]')?.click();
  });
  await page.reload({ waitUntil: 'load' });
  const state5 = await getTermDisplayState();
  assert.equal(state5.docMode, 'vi', 'Case 5: Reload must preserve selected mode "vi"');
  assert.equal(state5.activeButton, 'vi', 'Case 5: Active button must remain "vi" after reload');
  assert.equal(state5.enDisplay, 'none', 'Case 5: .term__en remains hidden after reload in vi mode');
  assert.notEqual(state5.viDisplay, 'none', 'Case 5: .term__vi remains visible after reload in vi mode');
  console.log('✓ Case 5 passed: Reload preserves selected mode.');

  // -------------------------------------------------------------
  // Case 6: Chuyển sang chương khác (navigation) vẫn giữ nguyên mode đã chọn
  // -------------------------------------------------------------
  await page.goto(ch2Url, { waitUntil: 'load' });
  const state6 = await getTermDisplayState();
  assert.equal(state6.docMode, 'vi', 'Case 6: Navigation to chapter-02 must preserve mode "vi"');
  assert.equal(state6.activeButton, 'vi', 'Case 6: Switcher button on chapter-02 must be "vi"');
  assert.equal(state6.enDisplay, 'none', 'Case 6: .term__en must be hidden on chapter-02 in vi mode');
  assert.notEqual(state6.viDisplay, 'none', 'Case 6: .term__vi must be visible on chapter-02 in vi mode');
  console.log('✓ Case 6 passed: Navigation between chapters preserves selected mode.');

  // -------------------------------------------------------------
  // Case 7: Giá trị localStorage không hợp lệ tự động fallback về bilingual
  // -------------------------------------------------------------
  await page.evaluate(() => {
    localStorage.setItem('seg301m-term-mode', 'invalid_mode_xyz');
  });
  await page.reload({ waitUntil: 'load' });
  const state7 = await getTermDisplayState();
  assert.equal(state7.docMode, 'bilingual', 'Case 7: Invalid localStorage mode must fallback to "bilingual"');
  assert.equal(state7.activeButton, 'bilingual', 'Case 7: Active button must fallback to "bilingual"');
  assert.notEqual(state7.enDisplay, 'none', 'Case 7: .term__en must be visible upon fallback');
  assert.notEqual(state7.viDisplay, 'none', 'Case 7: .term__vi must be visible upon fallback');
  console.log('✓ Case 7 passed: Invalid localStorage value falls back to bilingual.');

  // -------------------------------------------------------------
  // Case 8: Trang không có term (trang chủ index.html) vẫn hoạt động bình thường, không có lỗi console
  // -------------------------------------------------------------
  const consoleErrors = [];
  const errorHandler = (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  };
  const pageErrorHandler = (err) => {
    consoleErrors.push(err.message);
  };
  page.on('console', errorHandler);
  page.on('pageerror', pageErrorHandler);

  await page.goto(homeUrl, { waitUntil: 'load' });
  const homeTermsCount = await page.evaluate(() => document.querySelectorAll('.term').length);
  assert.equal(homeTermsCount, 0, 'Case 8: index.html must have 0 .term elements');

  // Verify switcher interaction on index.html
  await page.evaluate(() => {
    document.querySelector('.term-switcher__btn[data-mode="en"]')?.click();
    document.querySelector('.term-switcher__btn[data-mode="vi"]')?.click();
    document.querySelector('.term-switcher__btn[data-mode="bilingual"]')?.click();
  });
  assert.equal(consoleErrors.length, 0, `Case 8: index.html produced console errors: ${consoleErrors.join('; ')}`);
  page.off('console', errorHandler);
  page.off('pageerror', pageErrorHandler);
  console.log('✓ Case 8 passed: Home page (without terms) operates cleanly with zero console errors.');

  // -------------------------------------------------------------
  // Case 9: Term trong code block (<pre><code>) không bị gắn thẻ .term và giữ nguyên code
  // -------------------------------------------------------------
  const chaptersDir = resolve(root, 'dist/chapters');
  const chapterFiles = readdirSync(chaptersDir).filter(f => f.endsWith('.html'));
  for (const file of chapterFiles) {
    const content = readFileSync(resolve(chaptersDir, file), 'utf8');
    const codeBlocks = content.match(/<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>/gi) || [];
    for (const block of codeBlocks) {
      assert.equal(
        /<span\b[^>]*class=["'][^"']*\bterm\b[^"']*["']/i.test(block),
        false,
        `Case 9: Found .term span inside code block in ${file}: ${block.slice(0, 100)}`
      );
    }
  }
  console.log('✓ Case 9 passed: Code blocks across all chapters are pristine and free of .term spans.');

  // -------------------------------------------------------------
  // Case 10: Term trong URL / liên kết (<a>) không bị hỏng
  // -------------------------------------------------------------
  for (const file of chapterFiles) {
    const content = readFileSync(resolve(chaptersDir, file), 'utf8');
    const aTags = content.match(/<a\b[^>]*>/gi) || [];
    for (const tag of aTags) {
      assert.equal(
        /<span\b|class=["'][^"']*\bterm\b|{{term:/i.test(tag),
        false,
        `Case 10: <a> tag in ${file} contains term markup: ${tag}`
      );
      const hrefMatch = tag.match(/href=["']([^"']*)["']/i);
      if (hrefMatch) {
        const href = hrefMatch[1];
        assert.equal(
          href.includes('<') || href.includes('>') || href.includes('{{'),
          false,
          `Case 10: Malformed href in ${file}: ${href}`
        );
      }
    }
  }
  console.log('✓ Case 10 passed: Links and URLs across all chapters are well-formed and undamaged.');

  // -------------------------------------------------------------
  // Case 11: Search trong glossary theo English, Tiếng Việt, alias và acronym đều hoạt động và lọc chính xác
  // -------------------------------------------------------------
  await page.goto(ch1Url, { waitUntil: 'load' });
  const searchFilter = async (query) => {
    return page.evaluate((q) => {
      const input = document.getElementById('glossary-filter');
      input.value = q;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const rows = Array.from(document.querySelectorAll('#glossary-vi ~ .table-wrap table tbody tr'));
      const visible = rows.filter(r => !r.hidden);
      return {
        total: rows.length,
        visibleCount: visible.length,
        matchedIds: visible.map(r => r.dataset.termId),
        countText: document.querySelector('.glossary-count')?.textContent
      };
    }, query);
  };

  // 11a: English query
  const resEn = await searchFilter('Information Retrieval');
  assert.ok(resEn.visibleCount > 0, 'Case 11a: Search English must find results');
  assert.ok(resEn.matchedIds.includes('information-retrieval'), 'Case 11a: "information-retrieval" must match English query');
  assert.ok(resEn.visibleCount < resEn.total, 'Case 11a: Non-matching rows must be hidden');

  // 11b: Vietnamese query
  const resVi = await searchFilter('truy xuất thông tin');
  assert.ok(resVi.visibleCount > 0, 'Case 11b: Search Vietnamese must find results');
  assert.ok(resVi.matchedIds.includes('information-retrieval'), 'Case 11b: "information-retrieval" must match Vietnamese query');

  // 11c: Alias query ("IR")
  const resAlias = await searchFilter('IR');
  assert.ok(resAlias.visibleCount > 0, 'Case 11c: Search alias must find results');
  assert.ok(resAlias.matchedIds.includes('information-retrieval'), 'Case 11c: "IR" alias must find "information-retrieval"');

  // 11d: Acronym query on chapter-02 ("tf-idf")
  await page.goto(ch2Url, { waitUntil: 'load' });
  const resAcronym = await searchFilter('tf-idf');
  assert.ok(resAcronym.visibleCount > 0, 'Case 11d: Search acronym must find results');
  assert.ok(resAcronym.matchedIds.includes('tf-idf'), 'Case 11d: "tf-idf" acronym must find tf-idf row');

  // 11e: Search in 'vi' mode
  await page.evaluate(() => {
    document.querySelector('.term-switcher__btn[data-mode="vi"]')?.click();
  });
  const resModeVi = await searchFilter('crawler');
  assert.ok(resModeVi.visibleCount > 0, 'Case 11e: Search English term while in vi mode must work');
  assert.ok(resModeVi.matchedIds.includes('crawler'), 'Case 11e: crawler row must match even in vi mode');

  // 11f: Clear query
  const resClear = await searchFilter('');
  assert.equal(resClear.visibleCount, resClear.total, 'Case 11f: Clearing search must show all rows');
  console.log('✓ Case 11 passed: Glossary search by EN, VI, alias, and acronym filters correctly in all modes.');

  // -------------------------------------------------------------
  // Case 12: Layout không bị vỡ trên mobile (390x844 và 360x740), không có horizontal overflow (scrollWidth <= clientWidth + 2)
  // -------------------------------------------------------------
  const mobileViewports = [
    { name: 'iPhone 12/13/14 (390x844)', width: 390, height: 844 },
    { name: 'Android Standard (360x740)', width: 360, height: 740 }
  ];
  const testPages = [
    'dist/index.html',
    'dist/chapters/chapter-01.html',
    'dist/chapters/chapter-02.html'
  ];

  for (const vp of mobileViewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    for (const p of testPages) {
      const pageUrl = `file://${resolve(root, p).replace(/\\/g, '/')}`;
      await page.goto(pageUrl, { waitUntil: 'load' });
      const overflowInfo = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          overflow: doc.scrollWidth > doc.clientWidth + 2,
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth
        };
      });
      assert.equal(
        overflowInfo.overflow,
        false,
        `Case 12: Horizontal overflow on ${p} at ${vp.name}: scrollWidth=${overflowInfo.scrollWidth}, clientWidth=${overflowInfo.clientWidth}`
      );
    }
  }
  console.log('✓ Case 12 passed: Responsive layout validated on mobile viewports (390x844 and 360x740) without overflow.');

  await page.close();
} finally {
  await browser.close();
}

console.log('\n--- All 12 Term Mode & QA Verification Tests PASSED ---');
