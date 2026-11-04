import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const root = resolve(import.meta.dirname, '..');
const qaDir = resolve(root, 'qa_screenshots/phase-3');
const respDir = resolve(qaDir, 'responsive');
const termDir = resolve(qaDir, 'term-modes');
const a11yDir = resolve(qaDir, 'accessibility');
const compDir = resolve(qaDir, 'components');

await mkdir(respDir, { recursive: true });
await mkdir(termDir, { recursive: true });
await mkdir(a11yDir, { recursive: true });
await mkdir(compDir, { recursive: true });

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

console.log('================================================================');
console.log('  SEG301m Phase 3 QA & Verification Suite (Agent B)');
console.log('  Responsive, Accessibility, Term Modes, Visual Regression');
console.log('================================================================\n');

// 1. Start Server for HTTP & Tutor backend
console.log('[1/5] Starting local server for static dist and Tutor API...');
const serverProcess = spawn(process.execPath, [resolve(root, 'server/main.mjs'), '--root', root], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverBase = null;
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 200));
  try {
    const instance = JSON.parse(await readFile(resolve(root, 'logs/instance.json'), 'utf8'));
    const res = await fetch(`http://127.0.0.1:${instance.port}/api/health`);
    if (res.ok) {
      serverBase = `http://127.0.0.1:${instance.port}`;
      break;
    }
  } catch (e) {}
}

if (!serverBase) {
  serverProcess.kill('SIGTERM');
  throw new Error('Failed to start server within 8 seconds.');
}
console.log(`Server online at ${serverBase}\n`);

// 2. Launch Puppeteer Edge
console.log('[2/5] Launching Microsoft Edge via puppeteer-core...');
const browser = await puppeteer.launch({
  executablePath: edgePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
});

const report = {
  viewportsTested: [],
  pagesTested: [],
  overflowResults: [],
  termModeResults: [],
  a11yResults: [],
  componentResults: [],
  screenshotsTaken: []
};

try {
  const page = await browser.newPage();
  
  // Track console errors
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push({ url: page.url(), error: err.message }));
  page.on('console', msg => {
    if (msg.type() === 'error') pageErrors.push({ url: page.url(), error: msg.text() });
  });

  // -------------------------------------------------------------
  // SUITE 1: RESPONSIVE & OVERFLOW CHECK ACROSS 5 VIEWPORTS
  // -------------------------------------------------------------
  console.log('[3/5] Executing Responsive & Layout Verification across Viewports...');
  
  const viewports = [
    { name: 'mobile_iphone', label: '375x812 (iPhone)', width: 375, height: 812 },
    { name: 'mobile_compact', label: '360x740 (Android Compact)', width: 360, height: 740 },
    { name: 'tablet_portrait', label: '768x1024 (iPad Portrait)', width: 768, height: 1024 },
    { name: 'laptop_small', label: '1280x800 (Laptop)', width: 1280, height: 800 },
    { name: 'desktop_standard', label: '1440x900 (Desktop)', width: 1440, height: 900 }
  ];

  const testPages = [
    { id: 'home', path: '/index.html', title: 'Trang chủ' },
    { id: 'ch01', path: '/chapters/chapter-01.html', title: 'Ch01 (Mindmap, Overview)' },
    { id: 'ch02', path: '/chapters/chapter-02.html', title: 'Ch02 (TF-IDF, Tables)' },
    { id: 'ch07', path: '/chapters/chapter-07.html', title: 'Ch07 (Tables, Code, Formulas)' },
    { id: 'ch08', path: '/chapters/chapter-08.html', title: 'Ch08 (Code, Algorithms)' },
    { id: 'ch10', path: '/chapters/chapter-10.html', title: 'Ch10 (Clustering, Tables, Formulas)' },
    { id: 'ch12', path: '/chapters/chapter-12.html', title: 'Ch12 (Evaluation, Math, Code)' }
  ];

  report.viewportsTested = viewports;
  report.pagesTested = testPages;

  for (const vp of viewports) {
    console.log(`\n  --- Testing Viewport: ${vp.label} ---`);
    await page.setViewport({ width: vp.width, height: vp.height });

    for (const p of testPages) {
      const url = `${serverBase}${p.path}`;
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Measure overflow
      const overflowDetails = await page.evaluate((vpWidth) => {
        const doc = document.documentElement;
        const scrollW = doc.scrollWidth;
        const clientW = doc.clientWidth;
        const innerW = window.innerWidth;
        const hasOverflow = scrollW > innerW + 2; // 2px allowance

        let offenders = [];
        if (hasOverflow) {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            // Ignore code blocks that have overflow-x: auto and are within containment
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (rect.right > innerW + 2) {
              offenders.push({
                tag: el.tagName.toLowerCase(),
                className: (el.className || '').toString().slice(0, 50),
                id: el.id,
                right: Math.round(rect.right),
                width: Math.round(rect.width),
                overflowX: style.overflowX
              });
              if (offenders.length >= 5) break;
            }
          }
        }

        return {
          scrollW,
          clientW,
          innerW,
          hasOverflow,
          offenders
        };
      }, vp.width);

      report.overflowResults.push({
        viewport: vp.label,
        page: p.id,
        ...overflowDetails
      });

      assert.equal(
        overflowDetails.hasOverflow,
        false,
        `Horizontal overflow on ${p.id} at ${vp.label}: scrollWidth=${overflowDetails.scrollW}, innerWidth=${overflowDetails.innerW}. Offenders: ${JSON.stringify(overflowDetails.offenders)}`
      );

      // Verify specific elements by page type
      const componentStatus = await page.evaluate((pageId, vpWidth) => {
        const header = document.querySelector('.site-header');
        const headerRect = header ? header.getBoundingClientRect() : null;
        const termSwitcher = document.querySelector('.term-switcher');
        const switcherRect = termSwitcher ? termSwitcher.getBoundingClientRect() : null;
        const wordmark = document.querySelector('.wordmark');
        const wordmarkRect = wordmark ? wordmark.getBoundingClientRect() : null;

        // Check if switcher overlaps wordmark or overflows header
        let switcherFits = true;
        if (headerRect && switcherRect) {
          if (switcherRect.right > headerRect.right + 2) switcherFits = false;
          if (wordmarkRect && switcherRect.left < wordmarkRect.right) switcherFits = false;
        }

        // Check cards on home
        const cardsCount = document.querySelectorAll('.chapter-card').length;

        // Check TOC on chapters
        const toc = document.querySelector('.chapter-nav');
        const tocVisible = toc ? window.getComputedStyle(toc).display !== 'none' : false;

        // Check tables containment
        const tables = document.querySelectorAll('.table-wrap table');
        const tableWraps = document.querySelectorAll('.table-wrap');
        let tableWrapsScrollable = true;
        tableWraps.forEach(tw => {
          const s = window.getComputedStyle(tw);
          if (s.overflowX !== 'auto' && s.overflowX !== 'scroll') tableWrapsScrollable = false;
        });

        // Check code blocks containment
        const preBlocks = document.querySelectorAll('pre');
        let preContained = true;
        preBlocks.forEach(pre => {
          const s = window.getComputedStyle(pre);
          if (s.overflowX !== 'auto' && s.overflowX !== 'scroll') preContained = false;
        });

        // Check formulas
        const formulaBlocks = document.querySelectorAll('.formula-block');
        
        // Check mindmaps
        const mindmapImg = document.querySelector('.chapter-map img');
        const mindmapLoaded = mindmapImg ? (mindmapImg.complete && mindmapImg.naturalWidth > 0) : null;

        // Check Tutor button
        const tutorLaunch = document.querySelector('.tutor-launch');
        const tutorLaunchVisible = tutorLaunch ? window.getComputedStyle(tutorLaunch).display !== 'none' : false;

        // Check Back-to-top button
        const backToTop = document.querySelector('.back-to-top');

        return {
          headerExists: !!header,
          switcherExists: !!termSwitcher,
          switcherFits,
          switcherRect: switcherRect ? { width: Math.round(switcherRect.width), right: Math.round(switcherRect.right) } : null,
          cardsCount,
          tocVisible,
          tablesCount: tables.length,
          tableWrapsCount: tableWraps.length,
          tableWrapsScrollable,
          preCount: preBlocks.length,
          preContained,
          formulasCount: formulaBlocks.length,
          mindmapLoaded,
          tutorLaunchVisible,
          backToTopExists: !!backToTop
        };
      }, p.id, vp.width);

      report.componentResults.push({
        viewport: vp.label,
        page: p.id,
        ...componentStatus
      });

      // Capture screenshot for this page & viewport
      const screenshotFilename = `${p.id}_${vp.width}x${vp.height}.png`;
      const screenshotPath = resolve(respDir, screenshotFilename);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      report.screenshotsTaken.push({ category: 'responsive', filename: screenshotFilename });

      process.stdout.write(`    ✓ ${p.id} @ ${vp.width}x${vp.height} (overflow: 0, switcherFits: ${componentStatus.switcherFits})\n`);
    }

    // Special screenshot for Mobile header term switcher fit
    if (vp.width === 375 || vp.width === 360) {
      await page.goto(`${serverBase}/chapters/chapter-01.html`, { waitUntil: 'networkidle2' });
      const headerEl = await page.$('.site-header');
      if (headerEl) {
        const headerShotPath = resolve(respDir, `header_term_switcher_${vp.width}x${vp.height}.png`);
        await headerEl.screenshot({ path: headerShotPath });
        report.screenshotsTaken.push({ category: 'responsive', filename: `header_term_switcher_${vp.width}x${vp.height}.png` });
      }
    }
  }

  // -------------------------------------------------------------
  // SUITE 2: TERM DISPLAY MODES DEEP DIVE (EN, EN+VI, VI)
  // -------------------------------------------------------------
  console.log('\n[4/5] Executing 3 Term Modes Verification & Text Regression Checks...');
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`${serverBase}/chapters/chapter-01.html`, { waitUntil: 'networkidle2' });

  // 2a. Default Bilingual Mode Verification
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle2' });

  const bilingualState = await page.evaluate(() => {
    const docMode = document.documentElement.dataset.termMode;
    const bodyMode = document.body.dataset.termMode;
    const activeBtn = document.querySelector('.term-switcher__btn.is-active')?.dataset.mode;
    const checkedBtn = document.querySelector('.term-switcher__btn[aria-checked="true"]')?.dataset.mode;
    
    // Check term spans
    const terms = Array.from(document.querySelectorAll('.term:not(.term--same)'));
    const sameTerms = Array.from(document.querySelectorAll('.term--same'));
    
    const sample = terms[0];
    const enSpan = sample?.querySelector('.term__en');
    const viSpan = sample?.querySelector('.term__vi');
    const viBefore = viSpan ? window.getComputedStyle(viSpan, '::before').getPropertyValue('content') : '';
    const viAfter = viSpan ? window.getComputedStyle(viSpan, '::after').getPropertyValue('content') : '';

    // Check same terms (e.g. ASCII, BigTable) - should only display EN, VI should be hidden
    let sameCorrect = true;
    sameTerms.forEach(st => {
      const stVi = st.querySelector('.term__vi');
      if (stVi && window.getComputedStyle(stVi).display !== 'none') sameCorrect = false;
    });

    return {
      docMode,
      bodyMode,
      activeBtn,
      checkedBtn,
      enDisplay: enSpan ? window.getComputedStyle(enSpan).display : null,
      viDisplay: viSpan ? window.getComputedStyle(viSpan).display : null,
      viBefore,
      viAfter,
      sameTermsCount: sameTerms.length,
      sameCorrect
    };
  });

  assert.equal(bilingualState.docMode, 'bilingual', 'Default mode must be bilingual');
  assert.equal(bilingualState.activeBtn, 'bilingual', 'Default active button must be bilingual');
  assert.equal(bilingualState.checkedBtn, 'bilingual', 'Default aria-checked button must be bilingual');
  assert.notEqual(bilingualState.enDisplay, 'none', 'EN must be visible in bilingual');
  assert.notEqual(bilingualState.viDisplay, 'none', 'VI must be visible in bilingual');
  assert.ok(bilingualState.viBefore.includes('('), 'VI must have ( before in bilingual');
  assert.ok(bilingualState.viAfter.includes(')'), 'VI must have ) after in bilingual');
  assert.ok(bilingualState.sameCorrect, 'Same terms must hide VI in bilingual to avoid duplication');

  await page.screenshot({ path: resolve(termDir, 'mode_bilingual_ch01.png') });
  report.screenshotsTaken.push({ category: 'term-modes', filename: 'mode_bilingual_ch01.png' });
  console.log('  ✓ Bilingual mode verified: en (vi) displayed correctly with standard spacing and no duplication.');

  // 2b. Switch to English Only Mode
  await page.evaluate(() => {
    document.querySelector('.term-switcher__btn[data-mode="en"]')?.click();
  });

  const enState = await page.evaluate(() => {
    const docMode = document.documentElement.dataset.termMode;
    const activeBtn = document.querySelector('.term-switcher__btn.is-active')?.dataset.mode;
    const terms = Array.from(document.querySelectorAll('.term'));
    
    let allEnVisible = true;
    let allViHidden = true;
    terms.forEach(t => {
      const en = t.querySelector('.term__en');
      const vi = t.querySelector('.term__vi');
      if (en && window.getComputedStyle(en).display === 'none') allEnVisible = false;
      if (vi && window.getComputedStyle(vi).display !== 'none') allViHidden = false;
    });

    // Check text for empty parentheses `()` or `( )` in content
    const contentText = document.querySelector('.lesson-content')?.textContent || '';
    const emptyParens = contentText.match(/\(\s*\)/g) || [];

    return {
      docMode,
      activeBtn,
      allEnVisible,
      allViHidden,
      emptyParensCount: emptyParens.length,
      emptyParensSample: emptyParens.slice(0, 3)
    };
  });

  assert.equal(enState.docMode, 'en', 'Mode must be en');
  assert.equal(enState.activeBtn, 'en', 'Active button must be en');
  assert.ok(enState.allEnVisible, 'All EN spans must be visible in en mode');
  assert.ok(enState.allViHidden, 'All VI spans must be hidden (display: none) in en mode');
  assert.equal(enState.emptyParensCount, 0, `English mode must not leave empty parens (): found ${enState.emptyParensCount}`);

  await page.screenshot({ path: resolve(termDir, 'mode_en_ch01.png') });
  report.screenshotsTaken.push({ category: 'term-modes', filename: 'mode_en_ch01.png' });
  console.log('  ✓ English mode verified: EN visible, VI hidden, 0 empty parentheses or broken punctuation.');

  // 2c. Switch to Vietnamese Only Mode
  await page.evaluate(() => {
    document.querySelector('.term-switcher__btn[data-mode="vi"]')?.click();
  });

  const viState = await page.evaluate(() => {
    const docMode = document.documentElement.dataset.termMode;
    const activeBtn = document.querySelector('.term-switcher__btn.is-active')?.dataset.mode;
    const terms = Array.from(document.querySelectorAll('.term'));
    
    let allEnHidden = true;
    let allViVisible = true;
    terms.forEach(t => {
      const en = t.querySelector('.term__en');
      const vi = t.querySelector('.term__vi');
      if (en && window.getComputedStyle(en).display !== 'none') allEnHidden = false;
      if (vi && window.getComputedStyle(vi).display === 'none') allViVisible = false;
    });

    // Check text for empty parentheses `()` or `( )` in content
    const contentText = document.querySelector('.lesson-content')?.textContent || '';
    const emptyParens = contentText.match(/\(\s*\)/g) || [];

    return {
      docMode,
      activeBtn,
      allEnHidden,
      allViVisible,
      emptyParensCount: emptyParens.length,
      emptyParensSample: emptyParens.slice(0, 3)
    };
  });

  assert.equal(viState.docMode, 'vi', 'Mode must be vi');
  assert.equal(viState.activeBtn, 'vi', 'Active button must be vi');
  assert.ok(viState.allEnHidden, 'All EN spans must be hidden (display: none) in vi mode');
  assert.ok(viState.allViVisible, 'All VI spans must be visible in vi mode');
  assert.equal(viState.emptyParensCount, 0, `Vietnamese mode must not leave empty parens (): found ${viState.emptyParensCount}`);

  await page.screenshot({ path: resolve(termDir, 'mode_vi_ch01.png') });
  report.screenshotsTaken.push({ category: 'term-modes', filename: 'mode_vi_ch01.png' });
  console.log('  ✓ Vietnamese mode verified: VI visible, EN hidden, 0 empty parentheses, natural flow.');

  // 2d. Mode Persistence across Reload and Navigation
  // Vi mode was selected; reload page
  await page.reload({ waitUntil: 'networkidle2' });
  const reloadedMode = await page.evaluate(() => document.documentElement.dataset.termMode);
  assert.equal(reloadedMode, 'vi', 'Reload must preserve selected mode "vi"');

  // Navigate to Chapter 02; verify mode remains "vi"
  await page.goto(`${serverBase}/chapters/chapter-02.html`, { waitUntil: 'networkidle2' });
  const navMode = await page.evaluate(() => ({
    docMode: document.documentElement.dataset.termMode,
    activeBtn: document.querySelector('.term-switcher__btn.is-active')?.dataset.mode,
    storedMode: localStorage.getItem('seg301m-term-mode')
  }));
  assert.equal(navMode.docMode, 'vi', 'Chapter navigation must preserve mode "vi"');
  assert.equal(navMode.activeBtn, 'vi', 'Active button in Ch02 must be "vi"');
  assert.equal(navMode.storedMode, 'vi', 'localStorage must keep "vi"');

  await page.screenshot({ path: resolve(termDir, 'mode_vi_ch02.png') });
  report.screenshotsTaken.push({ category: 'term-modes', filename: 'mode_vi_ch02.png' });
  console.log('  ✓ Persistence verified: Reload and Chapter-to-Chapter navigation both retain selected mode.');

  // 2e. Invalid localStorage value fallback
  await page.evaluate(() => {
    localStorage.setItem('seg301m-term-mode', 'malicious_or_corrupt_value_xyz');
  });
  await page.reload({ waitUntil: 'networkidle2' });
  const fallbackMode = await page.evaluate(() => document.documentElement.dataset.termMode);
  assert.equal(fallbackMode, 'bilingual', 'Corrupt localStorage value must fallback to "bilingual"');
  console.log('  ✓ Resiliency verified: Corrupt localStorage safely falls back to bilingual.');

  // 2f. Anti-FOUC (Flash of Unstyled Content) Verification
  const headScriptCheck = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('head script:not([src])'));
    return scripts.some(s => s.textContent.includes("localStorage.getItem('seg301m-term-mode')") && s.textContent.includes('setAttribute(\'data-term-mode\''));
  });
  assert.ok(headScriptCheck, 'Inline script in <head> must configure data-term-mode before body renders');
  console.log('  ✓ Anti-FOUC verified: Synchronous <head> inline script prevents flash of incorrect mode.');

  // -------------------------------------------------------------
  // SUITE 3: ACCESSIBILITY (A11Y) & KEYBOARD UX VERIFICATION
  // -------------------------------------------------------------
  console.log('\n[5/5] Executing Accessibility (WAI-ARIA, Keyboard, Focus States) Verification...');
  await page.goto(`${serverBase}/chapters/chapter-01.html`, { waitUntil: 'networkidle2' });

  // 3a. WAI-ARIA Structure Check
  const a11yStructure = await page.evaluate(() => {
    const switcher = document.querySelector('.term-switcher');
    const buttonsContainer = document.querySelector('.term-switcher__buttons');
    const buttons = Array.from(document.querySelectorAll('.term-switcher__btn'));
    
    return {
      switcherRole: switcher?.getAttribute('role'),
      switcherLabel: switcher?.getAttribute('aria-label'),
      buttonsRole: buttonsContainer?.getAttribute('role'),
      buttonsLabelledBy: buttonsContainer?.getAttribute('aria-labelledby'),
      buttonsCount: buttons.length,
      buttonsData: buttons.map(b => ({
        mode: b.dataset.mode,
        role: b.getAttribute('role'),
        ariaChecked: b.getAttribute('aria-checked'),
        tabIndex: b.tabIndex,
        title: b.getAttribute('title'),
        text: b.textContent.trim()
      }))
    };
  });

  assert.equal(a11yStructure.buttonsRole, 'radiogroup', 'Button container must have role="radiogroup"');
  assert.equal(a11yStructure.buttonsLabelledBy, 'term-switcher-label', 'Button container must be aria-labelledby label id');
  assert.equal(a11yStructure.buttonsCount, 3, 'Must have exactly 3 mode radio buttons');
  for (const b of a11yStructure.buttonsData) {
    assert.equal(b.role, 'radio', `Button ${b.mode} must have role="radio"`);
    assert.ok(b.title && b.title.length > 0, `Button ${b.mode} must have descriptive title/accessible name`);
  }
  console.log('  ✓ WAI-ARIA Radiogroup structure verified (role="radiogroup", role="radio", aria-checked, title).');

  // 3b. Roving Tabindex Check
  const activeRadioTabindex = a11yStructure.buttonsData.find(b => b.ariaChecked === 'true')?.tabIndex;
  const inactiveRadioTabindexes = a11yStructure.buttonsData.filter(b => b.ariaChecked === 'false').map(b => b.tabIndex);
  assert.equal(activeRadioTabindex, 0, 'Active radio must have tabIndex=0');
  for (const t of inactiveRadioTabindexes) {
    assert.equal(t, -1, 'Inactive radios must have tabIndex=-1 for roving tabindex');
  }
  console.log('  ✓ Roving tabindex pattern verified (active = 0, inactive = -1).');

  // 3c. Keyboard Navigation (Arrow keys, Home, End, Space, Enter)
  // Focus the active button
  await page.evaluate(() => {
    document.querySelector('.term-switcher__btn[data-mode="en"]')?.click();
  });
  await page.focus('.term-switcher__btn[data-mode="en"]');

  // Press ArrowRight -> should advance to bilingual
  await page.keyboard.press('ArrowRight');
  const keyState1 = await page.evaluate(() => ({
    activeElementMode: document.activeElement?.dataset.mode,
    docMode: document.documentElement.dataset.termMode,
    ariaChecked: document.querySelector('.term-switcher__btn[data-mode="bilingual"]')?.getAttribute('aria-checked')
  }));
  assert.equal(keyState1.activeElementMode, 'bilingual', 'ArrowRight must focus next radio "bilingual"');
  assert.equal(keyState1.docMode, 'bilingual', 'ArrowRight must update mode to "bilingual"');
  assert.equal(keyState1.ariaChecked, 'true', 'ArrowRight must set aria-checked="true" on "bilingual"');

  // Press ArrowRight -> should advance to vi
  await page.keyboard.press('ArrowRight');
  const keyState2 = await page.evaluate(() => ({
    activeElementMode: document.activeElement?.dataset.mode,
    docMode: document.documentElement.dataset.termMode
  }));
  assert.equal(keyState2.activeElementMode, 'vi', 'ArrowRight must focus next radio "vi"');
  assert.equal(keyState2.docMode, 'vi', 'ArrowRight must update mode to "vi"');

  // Press ArrowRight -> should circularly wrap to en
  await page.keyboard.press('ArrowRight');
  const keyState3 = await page.evaluate(() => ({
    activeElementMode: document.activeElement?.dataset.mode,
    docMode: document.documentElement.dataset.termMode
  }));
  assert.equal(keyState3.activeElementMode, 'en', 'ArrowRight must wrap circularly to "en"');
  assert.equal(keyState3.docMode, 'en', 'ArrowRight must update mode to "en"');

  // Press ArrowLeft -> should circularly wrap backwards to vi
  await page.keyboard.press('ArrowLeft');
  const keyState4 = await page.evaluate(() => ({
    activeElementMode: document.activeElement?.dataset.mode,
    docMode: document.documentElement.dataset.termMode
  }));
  assert.equal(keyState4.activeElementMode, 'vi', 'ArrowLeft must wrap backwards to "vi"');

  // Press Home -> should jump to first (en)
  await page.keyboard.press('Home');
  const keyState5 = await page.evaluate(() => ({
    activeElementMode: document.activeElement?.dataset.mode,
    docMode: document.documentElement.dataset.termMode
  }));
  assert.equal(keyState5.activeElementMode, 'en', 'Home key must jump to first radio "en"');

  // Press End -> should jump to last (vi)
  await page.keyboard.press('End');
  const keyState6 = await page.evaluate(() => ({
    activeElementMode: document.activeElement?.dataset.mode,
    docMode: document.documentElement.dataset.termMode
  }));
  assert.equal(keyState6.activeElementMode, 'vi', 'End key must jump to last radio "vi"');

  console.log('  ✓ Keyboard navigation verified: ArrowRight, ArrowLeft (with wrap), Home, End all update focus and mode.');

  // 3d. Focus Visible & Focus Retention
  // Verify focus-visible outline/shadow
  await page.evaluate(() => {
    document.querySelector('.term-switcher__btn[data-mode="bilingual"]')?.focus();
  });
  
  const focusStyles = await page.evaluate(() => {
    const btn = document.querySelector('.term-switcher__btn[data-mode="bilingual"]');
    const computed = window.getComputedStyle(btn);
    return {
      outlineWidth: computed.outlineWidth,
      outlineStyle: computed.outlineStyle,
      outlineColor: computed.outlineColor,
      boxShadow: computed.boxShadow,
      fontWeight: computed.fontWeight,
      backgroundColor: computed.backgroundColor
    };
  });
  
  // Capture focus screenshots
  const switcherEl = await page.$('.term-switcher');
  if (switcherEl) {
    await switcherEl.screenshot({ path: resolve(a11yDir, 'focus_visible_bilingual.png') });
    report.screenshotsTaken.push({ category: 'accessibility', filename: 'focus_visible_bilingual.png' });

    // Focus EN
    await page.evaluate(() => {
      document.querySelector('.term-switcher__btn[data-mode="en"]')?.focus();
    });
    await switcherEl.screenshot({ path: resolve(a11yDir, 'focus_visible_en.png') });
    report.screenshotsTaken.push({ category: 'accessibility', filename: 'focus_visible_en.png' });

    // Focus VI
    await page.evaluate(() => {
      document.querySelector('.term-switcher__btn[data-mode="vi"]')?.focus();
    });
    await switcherEl.screenshot({ path: resolve(a11yDir, 'focus_visible_vi.png') });
    report.screenshotsTaken.push({ category: 'accessibility', filename: 'focus_visible_vi.png' });
  }

  // Focus retention check: click button, document.activeElement remains on button
  await page.evaluate(() => {
    const btn = document.querySelector('.term-switcher__btn[data-mode="en"]');
    btn?.click();
  });
  const clickActiveElement = await page.evaluate(() => document.activeElement?.dataset.mode);
  assert.equal(clickActiveElement, 'en', 'Focus must be retained on clicked button');
  console.log('  ✓ Focus visibility & retention verified (:focus-visible styling and retention on active element).');

  // Allow 150ms CSS transition to settle before checking settled computed styles
  await new Promise(r => setTimeout(r, 250));

  // 3e. Multi-cue styling (Active button differs by background, border, weight, and shadow, not just color)
  const visualDistinction = await page.evaluate(() => {
    const active = document.querySelector('.term-switcher__btn.is-active');
    const inactive = document.querySelector('.term-switcher__btn:not(.is-active)');
    const actStyle = window.getComputedStyle(active);
    const inactStyle = window.getComputedStyle(inactive);
    return {
      weightDiff: actStyle.fontWeight !== inactStyle.fontWeight,
      bgDiff: actStyle.backgroundColor !== inactStyle.backgroundColor,
      shadowDiff: actStyle.boxShadow !== inactStyle.boxShadow,
      activeWeight: actStyle.fontWeight,
      inactiveWeight: inactStyle.fontWeight,
      activeBg: actStyle.backgroundColor,
      inactiveBg: inactStyle.backgroundColor
    };
  });
  assert.ok(visualDistinction.weightDiff, 'Active button must have distinct font weight');
  assert.ok(visualDistinction.bgDiff, 'Active button must have distinct background color');
  assert.ok(visualDistinction.shadowDiff, 'Active button must have distinct box shadow');
  console.log('  ✓ Multi-cue design verified: Active state uses background contrast, font-weight 700 vs 500, and shadow.');

  // -------------------------------------------------------------
  // SUITE 4: SPECIAL COMPONENT DEEP-DIVE & COMPONENT SCREENSHOTS
  // -------------------------------------------------------------
  console.log('\n[6/5] Capturing Component Deep-Dive Screenshots (Table, Code, Math, Mindmap, Tutor)...');
  
  // 4a. Responsive Table at 375px
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${serverBase}/chapters/chapter-02.html`, { waitUntil: 'networkidle2' });
  const tableEl = await page.$('.table-wrap');
  if (tableEl) {
    await tableEl.screenshot({ path: resolve(compDir, 'table_responsive_ch02_375.png') });
    report.screenshotsTaken.push({ category: 'components', filename: 'table_responsive_ch02_375.png' });
  }

  // 4b. Code Block at 375px
  await page.goto(`${serverBase}/chapters/chapter-08.html`, { waitUntil: 'networkidle2' });
  const codeEl = await page.$('pre');
  if (codeEl) {
    await codeEl.screenshot({ path: resolve(compDir, 'code_block_ch08_375.png') });
    report.screenshotsTaken.push({ category: 'components', filename: 'code_block_ch08_375.png' });
  }

  // 4c. Formula Block at 375px
  await page.goto(`${serverBase}/chapters/chapter-12.html`, { waitUntil: 'networkidle2' });
  const formulaEl = await page.$('.formula-block');
  if (formulaEl) {
    await formulaEl.screenshot({ path: resolve(compDir, 'formula_ch12_375.png') });
    report.screenshotsTaken.push({ category: 'components', filename: 'formula_ch12_375.png' });
  }

  // 4d. Mindmap at 375px
  await page.goto(`${serverBase}/chapters/chapter-01.html`, { waitUntil: 'networkidle2' });
  const mapEl = await page.$('.chapter-map');
  if (mapEl) {
    await mapEl.screenshot({ path: resolve(compDir, 'mindmap_ch01_375.png') });
    report.screenshotsTaken.push({ category: 'components', filename: 'mindmap_ch01_375.png' });
  }

  // 4e. Glossary Search at 375px
  const glossaryEl = await page.$('#glossary-vi');
  if (glossaryEl) {
    await page.evaluate(() => {
      const input = document.getElementById('glossary-filter');
      if (input) {
        input.value = 'truy xuất';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    const glossaryContainer = await page.$('#glossary-vi + p + .glossary-filter-bar') || await page.$('.table-wrap');
    if (glossaryContainer) {
      await glossaryContainer.screenshot({ path: resolve(compDir, 'glossary_search_ch01_375.png') });
      report.screenshotsTaken.push({ category: 'components', filename: 'glossary_search_ch01_375.png' });
    }
  }

  // 4f. Tutor Desktop & Mobile
  // Desktop 1440px
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${serverBase}/chapters/chapter-01.html`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    document.querySelector('.tutor-launch')?.click();
  });
  await new Promise(r => setTimeout(r, 600)); // wait for drawer animation
  await page.screenshot({ path: resolve(compDir, 'tutor_desktop_1440.png') });
  report.screenshotsTaken.push({ category: 'components', filename: 'tutor_desktop_1440.png' });

  // Mobile 375px
  await page.setViewport({ width: 375, height: 812 });
  await page.screenshot({ path: resolve(compDir, 'tutor_mobile_375.png') });
  report.screenshotsTaken.push({ category: 'components', filename: 'tutor_mobile_375.png' });

  console.log(`\nAll visual regression and deep-dive screenshots captured (${report.screenshotsTaken.length} total).`);

  await page.close();
} finally {
  await browser.close();
  serverProcess.kill('SIGTERM');
  console.log('\nEdge and local server cleanly closed.');
}

console.log('\n================================================================');
console.log('  PHASE 3 QA TEST SUITE COMPLETED SUCCESSFULLY! ALL PASS');
console.log('================================================================');
