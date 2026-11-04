import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const root = resolve(import.meta.dirname, '..');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

console.log('--- Floating Term Switcher Specialized QA Test Suite ---');

const browser = await puppeteer.launch({
  executablePath: edgePath,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
});

try {
  const page = await browser.newPage();
  const ch1Url = `file://${resolve(root, 'dist/chapters/chapter-01.html').replace(/\\/g, '/')}`;
  const homeUrl = `file://${resolve(root, 'dist/index.html').replace(/\\/g, '/')}`;

  // -------------------------------------------------------------
  // Test 1: Desktop / Tablet: computed position is 'fixed', within viewport, and stays fixed after scrolling
  // -------------------------------------------------------------
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(ch1Url, { waitUntil: 'load' });

  const fixedCheck = await page.evaluate(() => {
    const el = document.querySelector('.term-switcher');
    if (!el) return null;
    const style = window.getComputedStyle(el);
    const rectBefore = el.getBoundingClientRect();

    window.scrollTo(0, 800);
    const rectAfter = el.getBoundingClientRect();

    return {
      position: style.position,
      zIndex: style.zIndex,
      rectBefore: { top: rectBefore.top, right: rectBefore.right, width: rectBefore.width, height: rectBefore.height },
      rectAfter: { top: rectAfter.top, right: rectAfter.right },
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      panelDisplay: window.getComputedStyle(document.querySelector('.term-switcher__panel')).display,
      toggleDisplay: window.getComputedStyle(document.querySelector('.term-switcher__toggle')).display
    };
  });

  assert.ok(fixedCheck, 'Test 1: .term-switcher must exist in DOM');
  assert.equal(fixedCheck.position, 'fixed', 'Test 1: .term-switcher position must be fixed');
  assert.ok(Number(fixedCheck.zIndex) >= 40, 'Test 1: zIndex must be at least 40');
  assert.ok(fixedCheck.rectBefore.right <= fixedCheck.windowWidth, 'Test 1: right edge must be within viewport');
  assert.ok(fixedCheck.rectBefore.top >= 0, 'Test 1: top must be >= 0');
  assert.ok(fixedCheck.rectBefore.top + fixedCheck.rectBefore.height <= fixedCheck.windowHeight, 'Test 1: bottom must be <= windowHeight');
  assert.equal(Math.round(fixedCheck.rectBefore.top), Math.round(fixedCheck.rectAfter.top), 'Test 1: Top position must stay fixed after scroll');
  assert.equal(Math.round(fixedCheck.rectBefore.right), Math.round(fixedCheck.rectAfter.right), 'Test 1: Right position must stay fixed after scroll');
  assert.equal(fixedCheck.panelDisplay, 'flex', 'Test 1: Desktop panel must be visible directly (display: flex)');
  assert.equal(fixedCheck.toggleDisplay, 'none', 'Test 1: Desktop toggle must be hidden (display: none)');
  console.log('✓ Test 1 passed: Desktop fixed position, viewport bounds, scroll invariance, and direct panel display validated.');

  // -------------------------------------------------------------
  // Test 2: Mobile Viewport (390px, 360px, 320px): Toggle visible, panel closed by default, tabindex=-1
  // -------------------------------------------------------------
  for (const mobileWidth of [390, 360, 320]) {
    await page.setViewport({ width: mobileWidth, height: 740 });
    await page.goto(ch1Url, { waitUntil: 'load' });

    const mobileDefaultState = await page.evaluate(() => {
      const toggle = document.querySelector('.term-switcher__toggle');
      const panel = document.querySelector('.term-switcher__panel');
      const buttons = Array.from(document.querySelectorAll('.term-switcher__btn'));
      const switcher = document.querySelector('.term-switcher');

      return {
        toggleDisplay: toggle ? window.getComputedStyle(toggle).display : null,
        toggleAriaExpanded: toggle ? toggle.getAttribute('aria-expanded') : null,
        panelDisplay: panel ? window.getComputedStyle(panel).display : null,
        hasIsOpen: switcher ? switcher.classList.contains('is-open') : false,
        tabIndexes: buttons.map(b => b.tabIndex)
      };
    });

    assert.notEqual(mobileDefaultState.toggleDisplay, 'none', `Test 2 (${mobileWidth}px): Toggle must be visible on mobile`);
    assert.equal(mobileDefaultState.toggleAriaExpanded, 'false', `Test 2 (${mobileWidth}px): aria-expanded must be false by default`);
    assert.equal(mobileDefaultState.panelDisplay, 'none', `Test 2 (${mobileWidth}px): Panel must be display: none by default`);
    assert.equal(mobileDefaultState.hasIsOpen, false, `Test 2 (${mobileWidth}px): is-open class must not be present by default`);
    assert.ok(mobileDefaultState.tabIndexes.every(t => t === -1), `Test 2 (${mobileWidth}px): Closed panel radios must have tabIndex=-1`);
  }
  console.log('✓ Test 2 passed: Mobile (390px, 360px, 320px) default state verified (toggle visible, panel closed, tabIndex=-1).');

  // -------------------------------------------------------------
  // Test 3: Mobile Toggle click opens panel, focuses active button, and sets aria-expanded="true"
  // -------------------------------------------------------------
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(ch1Url, { waitUntil: 'load' });

  await page.click('.term-switcher__toggle');
  const openedState = await page.evaluate(() => {
    const toggle = document.querySelector('.term-switcher__toggle');
    const panel = document.querySelector('.term-switcher__panel');
    const switcher = document.querySelector('.term-switcher');
    const activeBtn = document.querySelector('.term-switcher__btn.is-active');

    return {
      isOpen: switcher.classList.contains('is-open'),
      ariaExpanded: toggle.getAttribute('aria-expanded'),
      panelDisplay: window.getComputedStyle(panel).display,
      activeElementRole: document.activeElement?.getAttribute('role'),
      activeElementMode: document.activeElement?.dataset.mode,
      activeBtnTabIndex: activeBtn?.tabIndex
    };
  });

  assert.equal(openedState.isOpen, true, 'Test 3: switcher must have is-open class');
  assert.equal(openedState.ariaExpanded, 'true', 'Test 3: aria-expanded must be true when open');
  assert.equal(openedState.panelDisplay, 'flex', 'Test 3: panel must have display: flex when open');
  assert.equal(openedState.activeElementRole, 'radio', 'Test 3: Active radio button must receive focus when opened');
  assert.equal(openedState.activeBtnTabIndex, 0, 'Test 3: Active button must have tabIndex=0 when opened');
  console.log('✓ Test 3 passed: Mobile toggle click opens panel with aria-expanded="true" and moves focus to active radio.');

  // -------------------------------------------------------------
  // Test 4: Escape key closes panel and returns focus to toggle
  // -------------------------------------------------------------
  await page.keyboard.press('Escape');
  const closedByEscape = await page.evaluate(() => {
    const toggle = document.querySelector('.term-switcher__toggle');
    const panel = document.querySelector('.term-switcher__panel');
    const switcher = document.querySelector('.term-switcher');

    return {
      isOpen: switcher.classList.contains('is-open'),
      ariaExpanded: toggle.getAttribute('aria-expanded'),
      panelDisplay: window.getComputedStyle(panel).display,
      isToggleFocused: document.activeElement === toggle
    };
  });

  assert.equal(closedByEscape.isOpen, false, 'Test 4: Escape must close panel');
  assert.equal(closedByEscape.ariaExpanded, 'false', 'Test 4: aria-expanded must be false after Escape');
  assert.equal(closedByEscape.panelDisplay, 'none', 'Test 4: panel must be display: none after Escape');
  assert.equal(closedByEscape.isToggleFocused, true, 'Test 4: Focus must return to toggle button after Escape');
  console.log('✓ Test 4 passed: Escape closes mobile panel and returns focus to toggle.');

  // -------------------------------------------------------------
  // Test 5: Click outside closes panel
  // -------------------------------------------------------------
  await page.click('.term-switcher__toggle');
  assert.equal(await page.evaluate(() => document.querySelector('.term-switcher')?.classList.contains('is-open')), true);

  await page.click('#page-title'); // Click on main content heading outside
  const closedByOutsideClick = await page.evaluate(() => {
    const toggle = document.querySelector('.term-switcher__toggle');
    const panel = document.querySelector('.term-switcher__panel');
    const switcher = document.querySelector('.term-switcher');

    return {
      isOpen: switcher.classList.contains('is-open'),
      ariaExpanded: toggle.getAttribute('aria-expanded'),
      panelDisplay: window.getComputedStyle(panel).display
    };
  });
  assert.equal(closedByOutsideClick.isOpen, false, 'Test 5: Outside click must close panel');
  assert.equal(closedByOutsideClick.ariaExpanded, 'false', 'Test 5: aria-expanded must be false after outside click');
  assert.equal(closedByOutsideClick.panelDisplay, 'none', 'Test 5: panel must be display: none after outside click');
  console.log('✓ Test 5 passed: Click outside cleanly closes mobile panel.');

  // -------------------------------------------------------------
  // Test 6: Selecting mode updates toggle label, localStorage, and auto-closes panel on mobile
  // -------------------------------------------------------------
  await page.click('.term-switcher__toggle');
  await page.click('.term-switcher__btn[data-mode="en"]');

  const enSelectedState = await page.evaluate(() => {
    const toggle = document.querySelector('.term-switcher__toggle');
    const currentSpan = document.querySelector('.term-switcher__current');
    const switcher = document.querySelector('.term-switcher');

    return {
      isOpen: switcher.classList.contains('is-open'),
      currentText: currentSpan?.textContent.trim(),
      stored: localStorage.getItem('seg301m-term-mode'),
      docMode: document.documentElement.dataset.termMode,
      isToggleFocused: document.activeElement === toggle
    };
  });

  assert.equal(enSelectedState.isOpen, false, 'Test 6: Selecting mode on mobile must auto-close panel');
  assert.equal(enSelectedState.currentText, 'EN', 'Test 6: Toggle label must update to EN');
  assert.equal(enSelectedState.stored, 'en', 'Test 6: localStorage must be en');
  assert.equal(enSelectedState.docMode, 'en', 'Test 6: docMode must be en');
  assert.equal(enSelectedState.isToggleFocused, true, 'Test 6: Focus must return to toggle button on mobile');

  // Select VI
  await page.click('.term-switcher__toggle');
  await page.click('.term-switcher__btn[data-mode="vi"]');

  const viSelectedState = await page.evaluate(() => {
    const currentSpan = document.querySelector('.term-switcher__current');
    return {
      currentText: currentSpan?.textContent.trim(),
      stored: localStorage.getItem('seg301m-term-mode'),
      docMode: document.documentElement.dataset.termMode
    };
  });
  assert.equal(viSelectedState.currentText, 'VI', 'Test 6: Toggle label must update to VI');
  assert.equal(viSelectedState.stored, 'vi', 'Test 6: localStorage must be vi');

  // Select Bilingual
  await page.click('.term-switcher__toggle');
  await page.click('.term-switcher__btn[data-mode="bilingual"]');

  const biSelectedState = await page.evaluate(() => {
    const currentSpan = document.querySelector('.term-switcher__current');
    return {
      currentText: currentSpan?.textContent.trim(),
      stored: localStorage.getItem('seg301m-term-mode'),
      docMode: document.documentElement.dataset.termMode
    };
  });
  assert.equal(biSelectedState.currentText, 'EN+VI', 'Test 6: Toggle label must update to EN+VI');
  assert.equal(biSelectedState.stored, 'bilingual', 'Test 6: localStorage must be bilingual');
  console.log('✓ Test 6 passed: Mode selection updates toggle label, localStorage, and auto-closes on mobile.');

  // -------------------------------------------------------------
  // Test 7: Horizontal overflow check across 320px, 390px, 768px, 1024px, 1440px with panel open and closed
  // -------------------------------------------------------------
  const testViewports = [320, 390, 768, 1024, 1440];
  const pagesToCheck = [homeUrl, ch1Url];

  for (const w of testViewports) {
    await page.setViewport({ width: w, height: 800 });
    for (const u of pagesToCheck) {
      await page.goto(u, { waitUntil: 'load' });

      // Check closed state overflow
      const overflowClosed = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 2;
      });
      assert.equal(overflowClosed, false, `Test 7: Overflow detected at ${w}px on ${u} (closed state)`);

      // If mobile, also test with panel OPEN
      if (w <= 720) {
        await page.click('.term-switcher__toggle');
        const overflowOpen = await page.evaluate(() => {
          const doc = document.documentElement;
          const panel = document.querySelector('.term-switcher__panel');
          const panelRect = panel ? panel.getBoundingClientRect() : null;
          return {
            hasOverflow: doc.scrollWidth > window.innerWidth + 2,
            panelLeft: panelRect ? panelRect.left : null,
            panelRight: panelRect ? panelRect.right : null,
            windowWidth: window.innerWidth
          };
        });
        assert.equal(overflowOpen.hasOverflow, false, `Test 7: Overflow detected at ${w}px on ${u} (open state)`);
        assert.ok(overflowOpen.panelLeft >= 0, `Test 7: Panel left edge (${overflowOpen.panelLeft}px) must be >= 0 at ${w}px`);
        assert.ok(overflowOpen.panelRight <= overflowOpen.windowWidth, `Test 7: Panel right edge (${overflowOpen.panelRight}px) must be <= windowWidth at ${w}px`);
      }
    }
  }
  console.log('✓ Test 7 passed: Zero horizontal overflow verified across 320px, 390px, 768px, 1024px, 1440px (both closed and open).');

  // -------------------------------------------------------------
  // Test 8: Tutor open integration: Switcher does not obscure or get obscured
  // -------------------------------------------------------------
  // 8a. Desktop Tutor open panel: switcher shifts left by tutor width
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(ch1Url, { waitUntil: 'load' });

  await page.evaluate(() => {
    document.body.classList.add('tutor-open');
    document.body.style.setProperty('--tutor-panel-width', '480px');
  });
  await new Promise(r => setTimeout(r, 260)); // allow 200ms CSS transition to complete

  const desktopTutorShift = await page.evaluate(() => {
    const switcher = document.querySelector('.term-switcher');
    const rectAfter = switcher.getBoundingClientRect();
    const rightAfter = window.innerWidth - rectAfter.right;
    const computedRight = window.getComputedStyle(switcher).right;

    document.body.classList.remove('tutor-open');
    return {
      rightAfter: Math.round(rightAfter),
      computedRight
    };
  });
  assert.ok(desktopTutorShift.rightAfter >= 480, `Test 8a: Switcher must shift left by at least 480px when Tutor opens (was ${desktopTutorShift.rightAfter}px)`);

  // 8b. Desktop Tutor full-screen: switcher hidden
  await page.evaluate(() => {
    document.body.classList.add('tutor-full');
  });
  await new Promise(r => setTimeout(r, 260));
  const desktopTutorFull = await page.evaluate(() => {
    const switcher = document.querySelector('.term-switcher');
    const comp = window.getComputedStyle(switcher);
    const hidden = comp.opacity === '0' || comp.visibility === 'hidden' || comp.display === 'none';
    document.body.classList.remove('tutor-full');
    return hidden;
  });
  assert.equal(desktopTutorFull, true, 'Test 8b: Switcher must be hidden when Tutor is full-screen');

  // 8c. Mobile/Tablet (<=900px) Tutor open: switcher hidden
  await page.setViewport({ width: 768, height: 1024 });
  await page.evaluate(() => {
    document.body.classList.add('tutor-open');
  });
  await new Promise(r => setTimeout(r, 260));
  const tabletTutorOpen = await page.evaluate(() => {
    const switcher = document.querySelector('.term-switcher');
    const comp = window.getComputedStyle(switcher);
    const hidden = comp.opacity === '0' || comp.visibility === 'hidden' || comp.display === 'none';
    document.body.classList.remove('tutor-open');
    return hidden;
  });
  assert.equal(tabletTutorOpen, true, 'Test 8c: Switcher must be hidden at <=900px when Tutor opens');

  console.log('✓ Test 8 passed: Tutor integration validated (desktop side-panel shift, full-screen hide, mobile/tablet hide).');

  // -------------------------------------------------------------
  // Test 9: Single instance check per page (Home + 12 chapters)
  // -------------------------------------------------------------
  const allHtmlPages = ['dist/index.html', ...Array.from({ length: 12 }, (_, i) => `dist/chapters/chapter-${String(i + 1).padStart(2, '0')}.html`)];
  for (const pageRel of allHtmlPages) {
    const pageUrl = `file://${resolve(root, pageRel).replace(/\\/g, '/')}`;
    await page.goto(pageUrl, { waitUntil: 'load' });
    const counts = await page.evaluate(() => ({
      switchers: document.querySelectorAll('.term-switcher').length,
      toggles: document.querySelectorAll('.term-switcher__toggle').length,
      panels: document.querySelectorAll('.term-switcher__panel').length,
      duplicateIds: Array.from(document.querySelectorAll('[id]')).map(el => el.id).filter((id, idx, arr) => arr.indexOf(id) !== idx)
    }));
    assert.equal(counts.switchers, 1, `Test 9: ${pageRel} must have exactly 1 .term-switcher`);
    assert.equal(counts.toggles, 1, `Test 9: ${pageRel} must have exactly 1 .term-switcher__toggle`);
    assert.equal(counts.panels, 1, `Test 9: ${pageRel} must have exactly 1 .term-switcher__panel`);
    assert.equal(counts.duplicateIds.length, 0, `Test 9: ${pageRel} has duplicate IDs: ${counts.duplicateIds.join(', ')}`);
  }
  console.log('✓ Test 9 passed: Exactly 1 .term-switcher and 0 duplicate IDs across index.html and all 12 chapters.');

  await page.close();
} finally {
  await browser.close();
}

console.log('\n--- ALL FLOATING TERM SWITCHER SPECIALIZED QA TESTS PASSED ---');
