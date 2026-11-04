const localeData = JSON.parse(document.getElementById('locale-data').textContent);
const progress = document.querySelector('.reading-progress span');
const backToTop = document.body.dataset.page === 'chapter' ? document.createElement('button') : null;
let sectionObserver;

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
  const filter = () => {
    const term = input.value.trim().toLocaleLowerCase('vi');
    let shown = 0;
    rows.forEach((row) => {
      const match = row.textContent.toLocaleLowerCase('vi').includes(term);
      row.hidden = !match;
      if (match) shown++;
    });
    count.textContent = copy.count.replace('{shown}', shown).replace('{total}', rows.length);
  };
  input.addEventListener('input', filter);
  filter();
}

window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);

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
