const localeData = JSON.parse(document.getElementById('locale-data').textContent);
const progress = document.querySelector('.reading-progress span');
const backToTop = document.body.dataset.page === 'chapter' ? document.createElement('button') : null;
let sectionObserver;

const TERM_STORAGE_KEY = 'seg301m-term-mode';
const VALID_MODES = ['en', 'bilingual', 'vi'];
const DEFAULT_MODE = 'bilingual';

function readStoredTermMode() {
  try {
    const value = localStorage.getItem(TERM_STORAGE_KEY);
    if (value && VALID_MODES.includes(value)) {
      return value;
    }
  } catch (e) {
    // Storage access may be restricted
  }
  return DEFAULT_MODE;
}

function writeStoredTermMode(mode) {
  try {
    localStorage.setItem(TERM_STORAGE_KEY, mode);
  } catch (e) {
    // Storage access may be restricted
  }
}

function updateTermMode(mode) {
  const targetMode = VALID_MODES.includes(mode) ? mode : DEFAULT_MODE;

  document.documentElement.dataset.termMode = targetMode;
  if (document.body) {
    document.body.dataset.termMode = targetMode;
  }

  writeStoredTermMode(targetMode);

  const buttons = document.querySelectorAll('.term-switcher__btn');
  buttons.forEach((btn) => {
    const isCurrent = btn.dataset.mode === targetMode;
    btn.classList.toggle('is-active', isCurrent);
    btn.setAttribute('aria-checked', String(isCurrent));
    btn.tabIndex = isCurrent ? 0 : -1;
  });
}

function setupTermSwitcher() {
  const switcher = document.querySelector('.term-switcher');
  if (!switcher) return;

  const buttons = Array.from(switcher.querySelectorAll('.term-switcher__btn'));
  if (!buttons.length) return;

  const docMode = document.documentElement.dataset.termMode;
  const initialMode = (docMode && VALID_MODES.includes(docMode)) ? docMode : readStoredTermMode();
  updateTermMode(initialMode);

  buttons.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      updateTermMode(btn.dataset.mode);
      btn.focus();
    });

    btn.addEventListener('keydown', (e) => {
      let nextIndex = -1;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = (index + 1) % buttons.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = (index - 1 + buttons.length) % buttons.length;
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = buttons.length - 1;
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          updateTermMode(btn.dataset.mode);
          return;
        default:
          return;
      }

      if (nextIndex >= 0) {
        const nextBtn = buttons[nextIndex];
        updateTermMode(nextBtn.dataset.mode);
        nextBtn.focus();
      }
    });
  });

  window.addEventListener('storage', (e) => {
    if (e.key === TERM_STORAGE_KEY) {
      if (e.newValue && VALID_MODES.includes(e.newValue)) {
        updateTermMode(e.newValue);
      } else {
        updateTermMode(DEFAULT_MODE);
      }
    }
  });
}

if (backToTop) {
  backToTop.type = 'button';
  backToTop.className = 'back-to-top';
  backToTop.innerHTML = '<span aria-hidden="true">↑</span>';
  backToTop.setAttribute('aria-label', localeData.backToTop || 'Về đầu trang');
  backToTop.setAttribute('title', localeData.backToTop || 'Về đầu trang');
  document.body.append(backToTop);
  backToTop.addEventListener('click', () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  });
}

function updateProgress() {
  if (progress) {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${scrollable > 0 ? Math.min(100, window.scrollY / scrollable * 100) : 0}%`;
  }
  if (backToTop) {
    const visible = window.scrollY > 80;
    backToTop.classList.toggle('is-visible', visible);
    backToTop.tabIndex = visible ? 0 : -1;
    backToTop.setAttribute('aria-hidden', String(!visible));
  }
}

function visibleHeadings() {
  return [...document.querySelectorAll('.lesson-language h2[data-section-heading]')];
}

function startSectionObserver() {
  sectionObserver?.disconnect();
  if (!('IntersectionObserver' in window)) return;
  const links = [...document.querySelectorAll('.chapter-nav__links a')];
  sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (!visible.length) return;
    const activeId = visible[0].target.dataset.sectionHeading;
    links.forEach((link) => {
      const active = link.dataset.section === activeId;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-12% 0px -65% 0px' });
  visibleHeadings().forEach((heading) => sectionObserver.observe(heading));
}

function setupGlossary() {
  const heading = document.getElementById('glossary-vi');
  const tableWrap = heading?.nextElementSibling?.classList.contains('source-note')
    ? heading.nextElementSibling.nextElementSibling
    : heading?.nextElementSibling;
  const table = tableWrap?.querySelector('table');
  if (!table) return;

  const rows = [...table.querySelectorAll('tbody tr')];
  const copy = localeData.glossary || {
    label: 'Tìm thuật ngữ',
    placeholder: 'Nhập từ tiếng Việt hoặc tiếng Anh',
    count: 'Đang hiển thị {shown} / {total} thuật ngữ'
  };
  const container = document.createElement('div');
  container.className = 'glossary-search';
  container.innerHTML = `<label for="glossary-filter">${copy.label}</label><input id="glossary-filter" type="search" placeholder="${copy.placeholder}" autocomplete="off"><p class="glossary-count" aria-live="polite"></p>`;
  tableWrap.before(container);
  const input = container.querySelector('input');
  const count = container.querySelector('.glossary-count');

  const termsMap = new Map((localeData.termsList || []).map((item) => [item.id, item]));

  const indexedRows = rows.map((row) => {
    const text = row.textContent.toLocaleLowerCase('vi');
    const termId = (row.dataset.termId || '').toLocaleLowerCase('vi');
    const termIdSpaced = termId.replace(/-/g, ' ');
    const aliases = (row.dataset.aliases || '').toLocaleLowerCase('vi');
    const termData = row.dataset.termId ? termsMap.get(row.dataset.termId) : null;

    let extraAliases = '';
    if (termData?.aliases && Array.isArray(termData.aliases)) {
      extraAliases = termData.aliases.join(' ').toLocaleLowerCase('vi');
    }
    const extraEn = termData?.en ? termData.en.toLocaleLowerCase('vi') : '';
    const extraVi = termData?.vi ? termData.vi.toLocaleLowerCase('vi') : '';

    return {
      row,
      text,
      termId,
      termIdSpaced,
      aliases,
      extraAliases,
      extraEn,
      extraVi
    };
  });

  const filter = () => {
    const term = input.value.trim().toLocaleLowerCase('vi');
    let shown = 0;
    indexedRows.forEach((item) => {
      const match = !term ||
        item.text.includes(term) ||
        item.aliases.includes(term) ||
        item.termId.includes(term) ||
        item.termIdSpaced.includes(term) ||
        item.extraAliases.includes(term) ||
        item.extraEn.includes(term) ||
        item.extraVi.includes(term);

      item.row.hidden = !match;
      if (match) shown++;
    });
    count.textContent = copy.count.replace('{shown}', shown).replace('{total}', rows.length);
  };
  input.addEventListener('input', filter);
  filter();
}

window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);

setupTermSwitcher();

if (document.body.dataset.page === 'chapter') {
  setupGlossary();
  startSectionObserver();
  updateProgress();

  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) {
      const scrollToTarget = () => target.scrollIntoView({ block: 'start', behavior: 'auto' });
      requestAnimationFrame(() => requestAnimationFrame(scrollToTarget));
      window.addEventListener('load', scrollToTarget, { once: true });
      document.fonts?.ready.then(scrollToTarget);
    }
  }
}
