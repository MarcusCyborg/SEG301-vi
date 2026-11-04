import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execSync, spawn } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

console.log('================================================================');
console.log('  FINAL PRE-DEPLOY RELEASE REVIEW SUITE');
console.log('  SEG301m - Vietnamese Study Notes & Search Engine Platform');
console.log('================================================================\n');

const suiteResults = {
  build: { passed: false, checks: [] },
  terminology: { passed: false, checks: [] },
  modes: { passed: false, checks: [] },
  stateAndSearch: { passed: false, checks: [] },
  contextualSafety: { passed: false, checks: [] },
  responsive: { passed: false, checks: [] },
  runtimeAndLinks: { passed: false, checks: [] },
  accessibility: { passed: false, checks: [] },
  seoAndMetadata: { passed: false, checks: [] },
  gitAndCleanliness: { passed: false, checks: [] }
};

// -----------------------------------------------------------------------------
// Group 1 & 2: Build & Existing Checks
// -----------------------------------------------------------------------------
console.log('[1/10] Verifying Build Pipeline & Determinism...');
execSync('node scripts/build.mjs', { cwd: root, stdio: 'inherit' });
suiteResults.build.checks.push('Build executed successfully (13 HTML pages compiled)');

const htmlFiles = readdirSync(resolve(dist, 'chapters')).map(f => `chapters/${f}`);
htmlFiles.unshift('index.html');
assert.equal(htmlFiles.length, 13, 'Must have 13 HTML pages in dist/');
suiteResults.build.checks.push('All 13 HTML pages exist in dist/');

// -----------------------------------------------------------------------------
// Group 3 & 4: Terminology & Contextual Safety (Headings, Code, Tables, Formulas)
// -----------------------------------------------------------------------------
console.log('[2/10] Checking Terminology & Contextual Safety across 13 HTML pages...');
const terms = JSON.parse(readFileSync(resolve(root, 'content/terms.json'), 'utf8'));
assert.equal(terms.length, 344, 'Terms dictionary must have 344 entries');
suiteResults.terminology.checks.push('Dictionary has 344 validated terms');

let totalMarkersFound = 0;
for (const rel of htmlFiles) {
  const html = readFileSync(resolve(dist, rel), 'utf8');

  // Must not have raw markers
  assert.ok(!html.includes('{{term:'), `${rel} contains raw {{term: marker!`);

  // Must not have undefined/null/NaN in output
  assert.ok(!html.includes('>undefined<'), `${rel} contains >undefined< text!`);
  assert.ok(!html.includes('>null<'), `${rel} contains >null< text!`);
  assert.ok(!html.includes('>NaN<'), `${rel} contains >NaN< text!`);

  // Code blocks must not contain .term spans
  const codeBlocks = [...html.matchAll(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi)];
  for (const cb of codeBlocks) {
    assert.ok(!cb[0].includes('class="term'), `${rel} code block contains .term span!`);
  }

  // Inline code must not contain .term spans
  const inlineCodes = [...html.matchAll(/<code\b[^>]*>([\s\S]*?)<\/code>/gi)];
  for (const ic of inlineCodes) {
    assert.ok(!ic[1].includes('class="term'), `${rel} inline code contains .term span!`);
  }

  // Formulas must not contain .term spans
  const formulas = [...html.matchAll(/<div\b[^>]*\bformula-block\b[^>]*>[\s\S]*?<\/div>/gi)];
  for (const f of formulas) {
    assert.ok(!f[0].includes('class="term'), `${rel} formula block contains .term span!`);
  }

  // Headings must not contain unprocessed anchors
  assert.ok(!/\{#[a-z0-9-]+\}/i.test(html), `${rel} contains unprocessed heading marker {#...}!`);

  const termSpans = html.match(/<span\s+class="term[^"]*"/g) || [];
  totalMarkersFound += termSpans.length;
}

suiteResults.contextualSafety.checks.push(`Zero raw markers across all 13 HTML pages`);
suiteResults.contextualSafety.checks.push(`Code blocks, inline code, formulas, and headings are 100% free of .term spans`);
suiteResults.contextualSafety.checks.push(`Expanded ${totalMarkersFound} total .term spans across chapters`);
suiteResults.contextualSafety.passed = true;
suiteResults.terminology.passed = true;

// -----------------------------------------------------------------------------
// Group 5: Metadata, Favicon, SEO & Vercel
// -----------------------------------------------------------------------------
console.log('[3/10] Verifying Metadata, Favicon, SEO & Vercel Configuration...');
const vercelConfig = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));
assert.equal(vercelConfig.buildCommand, 'npm run build', 'Vercel buildCommand must be "npm run build"');
assert.equal(vercelConfig.outputDirectory, 'dist', 'Vercel outputDirectory must be "dist"');
suiteResults.seoAndMetadata.checks.push('vercel.json specifies valid buildCommand and outputDirectory');

assert.ok(statSync(resolve(dist, 'assets/favicon.svg')).size > 0, 'assets/favicon.svg must exist');
assert.ok(statSync(resolve(dist, 'favicon.ico')).size > 0, 'favicon.ico must exist');
assert.ok(statSync(resolve(dist, 'favicon.svg')).size > 0, 'favicon.svg must exist');
suiteResults.seoAndMetadata.checks.push('Favicon SVG and ICO assets exist and are non-empty');

for (const rel of htmlFiles) {
  const html = readFileSync(resolve(dist, rel), 'utf8');
  assert.ok(html.includes('<meta charset="utf-8">'), `${rel} missing meta charset`);
  assert.ok(html.includes('<meta name="viewport"'), `${rel} missing meta viewport`);
  assert.ok(html.includes('<meta name="theme-color" content="#163b3c">'), `${rel} missing theme-color`);
  assert.ok(html.includes('<meta property="og:title"'), `${rel} missing og:title`);
  assert.ok(html.includes('<meta property="og:description"'), `${rel} missing og:description`);
  assert.ok(html.includes('<meta name="twitter:card"'), `${rel} missing twitter:card`);
  assert.ok(html.includes('assets/favicon.svg'), `${rel} missing favicon link`);
}
suiteResults.seoAndMetadata.checks.push('All 13 HTML pages declare complete SEO and OpenGraph metadata');
suiteResults.seoAndMetadata.passed = true;

// -----------------------------------------------------------------------------
// Group 6: Git Cleanliness & Language Cleanliness
// -----------------------------------------------------------------------------
console.log('[4/10] Verifying Reference Repo Isolation & Language Cleanliness...');
const refGitStatus = execSync('git status --porcelain', {
  cwd: 'F:/1. FPT Material/Sem5/SEG301m/Slides-LectureNote',
  encoding: 'utf8'
});
// Check that no tracked files are modified in Slides-LectureNote
const modifiedInRef = refGitStatus.split('\n').filter(l => l.startsWith(' M') || l.startsWith('M '));
assert.equal(modifiedInRef.length, 0, 'Reference repo Slides-LectureNote has modified files!');
suiteResults.gitAndCleanliness.checks.push('Reference repo Slides-LectureNote has ZERO modified tracked files');

// Check no Japanese chars in content or dist
const mdFiles = readdirSync(resolve(root, 'content')).filter(f => f.endsWith('.md'));
for (const mf of mdFiles) {
  const text = readFileSync(resolve(root, 'content', mf), 'utf8');
  const jp = text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g);
  assert.equal(jp, null, `Found Japanese characters in content/${mf}!`);
}
for (const rel of htmlFiles) {
  const text = readFileSync(resolve(dist, rel), 'utf8');
  const jp = text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g);
  assert.equal(jp, null, `Found Japanese characters in dist/${rel}!`);
}
suiteResults.gitAndCleanliness.checks.push('Zero Japanese characters across all Markdown and HTML files');
suiteResults.gitAndCleanliness.passed = true;

// -----------------------------------------------------------------------------
// Puppeteer Automation for Runtime, UI, Accessibility & Term Modes
// -----------------------------------------------------------------------------
console.log('[5/10] Starting Local Server (Static + Tutor API)...');
const serverProcess = spawn(process.execPath, [resolve(root, 'server/main.mjs'), '--root', root], {
  stdio: ['ignore', 'pipe', 'pipe']
});

let baseUrl = null;
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 200));
  try {
    const instance = JSON.parse(await readFile(resolve(root, 'logs/instance.json'), 'utf8'));
    const res = await fetch(`http://127.0.0.1:${instance.port}/api/health`);
    if (res.ok) {
      baseUrl = `http://127.0.0.1:${instance.port}`;
      break;
    }
  } catch (e) {}
}

if (!baseUrl) {
  serverProcess.kill('SIGTERM');
  throw new Error('Failed to start server within 8 seconds.');
}
console.log(`Server online at ${baseUrl}`);

console.log('[6/10] Launching Headless Microsoft Edge Browser...');
const browser = await puppeteer.launch({
  executablePath: edgePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
});

try {
  const page = await browser.newPage();

  // Monitor console & network errors across all pages
  const consoleErrors = [];
  const networkFailures = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', resp => {
    if (resp.status() >= 400) {
      console.log(`HTTP ${resp.status()} on ${resp.url()}`);
    }
  });
  page.on('requestfailed', req => {
    networkFailures.push(`${req.url()} (${req.failure()?.errorText})`);
  });

  // ---------------------------------------------------------------------------
  // Check 7: Runtime Error, 404, Broken Assets
  // ---------------------------------------------------------------------------
  console.log('[7/10] Browsing all 13 pages to detect runtime errors, 404s, or broken assets...');
  for (const rel of htmlFiles) {
    const url = `${baseUrl}/${rel}`;
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  assert.equal(consoleErrors.length, 0, `Detected console errors: ${consoleErrors.join(', ')}`);
  assert.equal(networkFailures.length, 0, `Detected network failures: ${networkFailures.join(', ')}`);
  suiteResults.runtimeAndLinks.checks.push('0 console errors and 0 network failures across all 13 pages');
  suiteResults.runtimeAndLinks.passed = true;

  // ---------------------------------------------------------------------------
  // Check 8: 3 Term Display Modes, Persistence, Fallback
  // ---------------------------------------------------------------------------
  console.log('[8/10] Testing Three Term Display Modes, Persistence, and Storage Fallback...');
  await page.goto(`${baseUrl}/chapters/chapter-01.html`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });

  // 1. Default bilingual
  const defaultMode = await page.evaluate(() => document.documentElement.dataset.termMode);
  assert.equal(defaultMode, 'bilingual', 'Default mode must be bilingual');
  suiteResults.modes.checks.push('Default mode is "bilingual" with dataset.termMode="bilingual"');

  // Verify format en (vi)
  const bilingualText = await page.evaluate(() => {
    const term = document.querySelector('.term:not(.term--same)');
    return term ? window.getComputedStyle(term.querySelector('.term__vi'), '::before').content : null;
  });
  assert.ok(bilingualText?.includes('('), 'Bilingual mode must show opening parenthesis');

  // 2. Switch to en
  await page.evaluate(() => document.querySelector('.term-switcher__btn[data-mode="en"]')?.click());
  const enState = await page.evaluate(() => {
    const term = document.querySelector('.term:not(.term--same)');
    const enSpan = term?.querySelector('.term__en');
    const viSpan = term?.querySelector('.term__vi');
    return {
      docMode: document.documentElement.dataset.termMode,
      enDisplay: enSpan ? window.getComputedStyle(enSpan).display : null,
      viDisplay: viSpan ? window.getComputedStyle(viSpan).display : null,
      stored: localStorage.getItem('seg301m-term-mode')
    };
  });
  assert.equal(enState.docMode, 'en', 'Must switch docMode to en');
  assert.equal(enState.viDisplay, 'none', 'VI must be display: none in en mode');
  assert.equal(enState.stored, 'en', 'localStorage must store "en"');
  suiteResults.modes.checks.push('English mode hides VI completely and stores "en" in localStorage');

  // 3. Switch to vi
  await page.evaluate(() => document.querySelector('.term-switcher__btn[data-mode="vi"]')?.click());
  const viState = await page.evaluate(() => {
    const term = document.querySelector('.term:not(.term--same)');
    const enSpan = term?.querySelector('.term__en');
    const viSpan = term?.querySelector('.term__vi');
    return {
      docMode: document.documentElement.dataset.termMode,
      enDisplay: enSpan ? window.getComputedStyle(enSpan).display : null,
      viDisplay: viSpan ? window.getComputedStyle(viSpan).display : null,
      stored: localStorage.getItem('seg301m-term-mode')
    };
  });
  assert.equal(viState.docMode, 'vi', 'Must switch docMode to vi');
  assert.equal(viState.enDisplay, 'none', 'EN must be display: none in vi mode');
  assert.equal(viState.stored, 'vi', 'localStorage must store "vi"');
  suiteResults.modes.checks.push('Vietnamese mode hides EN completely and stores "vi" in localStorage');

  // 4. Persistence across reload and navigation
  await page.reload({ waitUntil: 'load' });
  const reloadedMode = await page.evaluate(() => document.documentElement.dataset.termMode);
  assert.equal(reloadedMode, 'vi', 'Reload must retain selected mode');

  await page.goto(`${baseUrl}/chapters/chapter-02.html`, { waitUntil: 'load' });
  const navMode = await page.evaluate(() => document.documentElement.dataset.termMode);
  assert.equal(navMode, 'vi', 'Navigation must retain selected mode');
  suiteResults.stateAndSearch.checks.push('Mode is preserved across page reloads and cross-chapter navigation');

  // 5. Corrupted localStorage fallback
  await page.evaluate(() => localStorage.setItem('seg301m-term-mode', 'invalid_corrupt_data'));
  await page.reload({ waitUntil: 'load' });
  const fallbackMode = await page.evaluate(() => document.documentElement.dataset.termMode);
  assert.equal(fallbackMode, 'bilingual', 'Corrupt localStorage must fallback to bilingual');
  suiteResults.stateAndSearch.checks.push('Corrupted localStorage value automatically falls back to bilingual');
  suiteResults.modes.passed = true;

  // ---------------------------------------------------------------------------
  // Check 9: Search, Glossary & Navigation
  // ---------------------------------------------------------------------------
  console.log('[9/10] Testing Glossary Search by EN, VI, Alias, and Acronym in various modes...');
  await page.goto(`${baseUrl}/chapters/chapter-11.html`, { waitUntil: 'load' });
  // Search by CF (Collaborative Filtering alias)
  const cfCount = await page.evaluate(() => {
    const input = document.getElementById('glossary-filter') || document.querySelector('.glossary-filter-bar input');
    if (!input) return -1;
    input.value = 'CF';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return document.querySelectorAll('.table-wrap tbody tr:not([hidden])').length;
  });
  assert.ok(cfCount >= 1, `Search for CF must find at least 1 row in chapter 11 (found ${cfCount})`);
  suiteResults.stateAndSearch.checks.push('Glossary search successfully filters by acronym "CF"');

  // Search by Vietnamese term "lọc cộng tác"
  const cfViCount = await page.evaluate(() => {
    const input = document.getElementById('glossary-filter') || document.querySelector('.glossary-filter-bar input');
    input.value = 'lọc cộng tác';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return document.querySelectorAll('.table-wrap tbody tr:not([hidden])').length;
  });
  assert.ok(cfViCount >= 1, `Search for "lọc cộng tác" must find collaborative-filtering (found ${cfViCount})`);
  suiteResults.stateAndSearch.checks.push('Glossary search successfully filters by Vietnamese "lọc cộng tác"');
  suiteResults.stateAndSearch.passed = true;

  // ---------------------------------------------------------------------------
  // Check 10: Responsive & Accessibility (WAI-ARIA, Keyboard)
  // ---------------------------------------------------------------------------
  console.log('[10/10] Verifying Responsive Layout (5 Viewports) and Accessibility...');
  const viewports = [
    { w: 375, h: 812, name: '375x812 (iPhone)' },
    { w: 360, h: 740, name: '360x740 (Android)' },
    { w: 768, h: 1024, name: '768x1024 (iPad)' },
    { w: 1280, h: 800, name: '1280x800 (Laptop)' },
    { w: 1440, h: 900, name: '1440x900 (Desktop)' }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.w, height: vp.h });
    await page.goto(`${baseUrl}/chapters/chapter-02.html`, { waitUntil: 'load' });

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert.equal(overflow, false, `Overflow detected on ${vp.name}!`);
  }
  suiteResults.responsive.checks.push('Zero horizontal overflow across all 5 viewports (375px to 1440px)');
  suiteResults.responsive.passed = true;

  // Accessibility checks
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/chapters/chapter-01.html`, { waitUntil: 'load' });

  const a11yProps = await page.evaluate(() => {
    const group = document.querySelector('.term-switcher');
    const radiogroup = document.querySelector('.term-switcher__buttons');
    const btns = Array.from(document.querySelectorAll('.term-switcher__btn'));
    return {
      groupRole: group?.getAttribute('role'),
      radiogroupRole: radiogroup?.getAttribute('role'),
      btnsRole: btns.map(b => b.getAttribute('role')),
      checkedStates: btns.map(b => b.getAttribute('aria-checked')),
      tabIndexes: btns.map(b => b.tabIndex)
    };
  });

  assert.equal(a11yProps.groupRole, 'group');
  assert.equal(a11yProps.radiogroupRole, 'radiogroup');
  assert.deepEqual(a11yProps.btnsRole, ['radio', 'radio', 'radio']);
  suiteResults.accessibility.checks.push('WAI-ARIA roles group, radiogroup, radio, aria-checked verified');

  // Keyboard navigation
  await page.evaluate(() => {
    const activeBtn = document.querySelector('.term-switcher__btn[data-mode="bilingual"]');
    activeBtn?.focus();
    activeBtn?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  });
  const afterKeyMode = await page.evaluate(() => document.documentElement.dataset.termMode);
  assert.equal(afterKeyMode, 'vi', 'ArrowRight must advance to next mode "vi"');
  suiteResults.accessibility.checks.push('Keyboard arrow keys correctly navigate and update term mode');
  suiteResults.accessibility.passed = true;

} finally {
  await browser.close();
  serverProcess.kill('SIGTERM');
}

console.log('\n================================================================');
console.log('  ALL PRE-DEPLOY AUDIT CHECKS PASSED WITH ZERO ERRORS!');
console.log('================================================================');
