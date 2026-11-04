import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const root = resolve(import.meta.dirname, '..');
const outDir = resolve(root, 'qa_screenshots');
await mkdir(outDir, { recursive: true });

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const browser = await puppeteer.launch({
  executablePath: edgePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
});

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 }
];

const pagesToTest = [
  { name: 'home', file: 'dist/index.html' },
  { name: 'chapter-01', file: 'dist/chapters/chapter-01.html' },
  { name: 'chapter-02', file: 'dist/chapters/chapter-02.html' }
];

for (const vp of viewports) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height });

  for (const p of pagesToTest) {
    const url = `file://${resolve(root, p.file).replace(/\\/g, '/')}`;
    await page.goto(url, { waitUntil: 'load' });

    // Check no horizontal scroll overflow
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2; // allowance of 2px
    });
    assert.equal(overflow, false, `${p.name} at ${vp.width}x${vp.height} has horizontal overflow!`);

    // Verify key elements
    if (p.name === 'home') {
      const hasCards = await page.evaluate(() => document.querySelectorAll('.chapter-card').length === 12);
      assert.ok(hasCards, `Home page must have 12 cards at ${vp.name}`);

      const hasVietnameseTitle = await page.evaluate(() => document.querySelector('.home-hero h1')?.textContent.includes('Hiểu công cụ tìm kiếm'));
      assert.ok(hasVietnameseTitle, `Home page must display Vietnamese title at ${vp.name}`);
    } else {
      const hasToc = await page.evaluate(() => !!document.querySelector('.chapter-nav'));
      assert.ok(hasToc, `${p.name} must have TOC at ${vp.name}`);

      const hasGlossary = await page.evaluate(() => !!document.getElementById('glossary-vi'));
      assert.ok(hasGlossary, `${p.name} must have Vietnamese glossary at ${vp.name}`);
    }

    const screenshotPath = resolve(outDir, `${p.name}_${vp.name}_${vp.width}x${vp.height}.png`);
    await page.screenshot({ path: screenshotPath });
  }

  await page.close();
}

await browser.close();
console.log(`Responsive test passed across Desktop (1440x900), Tablet (1024x768), and Mobile (390x844). Screenshots saved to qa_screenshots/`);
