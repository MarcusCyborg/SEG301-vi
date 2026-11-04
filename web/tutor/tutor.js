import { marked } from 'marked';
import DOMPurify from 'dompurify';
import renderMathInElement from 'katex/contrib/auto-render';
import hljs from 'highlight.js/lib/common';

const COPY = {
  vi: {
    launch: 'Trợ giảng AI', newChat: 'Cuộc trò chuyện mới', projects: 'Dự án', newProject: 'Tạo dự án',
    recents: 'Gần đây', search: 'Tìm cuộc trò chuyện', searchPlaceholder: 'Tìm theo tiêu đề...', noChats: 'Chưa có cuộc trò chuyện.',
    noProjectChats: 'Chưa có cuộc trò chuyện', backup: 'Sao lưu dữ liệu', shutdown: 'Dừng ứng dụng', tutor: 'Trợ giảng AI',
    sidebar: 'Danh sách trò chuyện', closeSidebar: 'Đóng thanh bên', expand: 'Mở rộng', restore: 'Thu nhỏ', close: 'Đóng Trợ giảng',
    rename: 'Đổi tên', export: 'Xuất Markdown', delete: 'Xóa cuộc trò chuyện', project: 'Dự án', noProject: 'Không thuộc dự án',
    useLesson: 'Dùng bài học hiện tại', effort: 'Mức suy luận', message: 'Tin nhắn', placeholder: 'Hỏi bất kỳ điều gì... (Shift+Enter để xuống dòng)',
    attach: 'Thêm tệp', stop: 'Dừng', send: 'Gửi ↑', emptyTitle: 'Học cùng Trợ giảng AI', emptyBody: 'Hỏi về bài học hoặc trao đổi về chủ đề bất kỳ.',
    scrollBottom: 'Chuyển đến tin nhắn mới nhất',
    you: 'Bạn', source: 'Nguồn', copy: 'Sao chép', edit: 'Chỉnh sửa', regenerate: 'Tạo lại', copied: 'Đã sao chép.', downloadFile: 'Tải tệp xuống', thinking: 'Đang suy nghĩ', moreActions: 'Thao tác khác', today: 'Hôm nay', yesterday: 'Hôm qua',
    sending: 'Đang gửi', generating: 'Đang tạo', failed: 'Lỗi', stopped: 'Đã dừng', interrupted: 'Bị gián đoạn',
    low: 'Thấp', medium: 'Trung bình', high: 'Cao', xhigh: 'Rất cao', mock: 'MÔ PHỎNG · không dùng API', compact: 'Nén ngữ cảnh', compacting: 'Đang nén ngữ cảnh...', compacted: 'Đã nén ngữ cảnh.',
    askSelection: 'Hỏi AI về đoạn này', explainSelection: 'Hãy giải thích đoạn sau:', removeFile: 'Xóa tệp',
    projectName: 'Tên dự án', renameProject: 'Đổi tên dự án', deleteProject: 'Xóa dự án', confirmDeleteProject: 'Xóa dự án này? Các cuộc trò chuyện sẽ được chuyển về mục Gần đây.',
    chatName: 'Tên cuộc trò chuyện', deleteChat: 'Xóa cuộc trò chuyện này?', shutdownConfirm: 'Dừng SEG301m Tutor? Hãy dùng launcher để mở lại.',
    stoppedApp: 'Đã dừng. Hãy dùng launcher để mở lại.', fileLimit: 'Mỗi tệp tối đa 10 MB.', uploadFailed: 'Không thể tải tệp lên.',
    branchPrev: 'Nhánh trước', branchNext: 'Nhánh sau', resize: 'Thay đổi độ rộng bảng trò chuyện', newChatInProject: 'Tạo cuộc trò chuyện trong dự án này',
    contextReduced: 'Một phần nội dung cũ không được gửi do giới hạn ngữ cảnh. Lịch sử đầy đủ trên máy vẫn được giữ nguyên.', genericError: 'Không thể hoàn tất thao tác.',
    missingSettings: 'Hãy cấu hình config/settings.json rồi khởi động lại SEG301m Tutor.', invalidKey: 'API key bị từ chối. Hãy kiểm tra config/settings.json.', gatewayUnreachable: 'Không thể kết nối gateway. Hãy kiểm tra URL, mạng và 9router.', gatewayTimeout: 'Gateway không phản hồi kịp thời.'
  }
};

const state = {
  open: false, full: false, sidebarOpen: false, conversations: [], projects: [], conversation: null,
  settings: null, sending: false, generationId: null, stream: null, quote: '', selectedContext: null,
  attachments: [], collapsedProjects: new Set(), newProjectId: null, openChatMenuId: null, panelWidth: 480, compacting: false
};
let ui;
const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const ICONS = {
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"></path></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path></svg>',
  regenerate: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"></path><path d="M20 4v7h-7"></path></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"></circle><circle cx="12" cy="12" r="1.4"></circle><circle cx="19" cy="12" r="1.4"></circle></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path><path d="M10 11v5M14 11v5"></path></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>',
  paperclip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.6-9.6a4 4 0 0 1 5.7 5.7l-9.6 9.6a2 2 0 1 1-2.8-2.8l8.9-8.9"></path></svg>',
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"></path></svg>',
  export: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5"></path><path d="M5 14v6h14v-6"></path></svg>',
  layout: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M9 4v16"></path></svg>',
  expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"></path></svg>',
  compact: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9H4V4M15 9h5V4M9 15H4v5M15 15h5v5"></path></svg>',
  compress: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 19h16"></path><path d="m8 9 4 4 4-4"></path></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>',
  newChat: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="15" height="18" rx="3"></rect><path d="m14.5 4.5 5 5M11 13l7.8-7.8a1.8 1.8 0 0 1 2.5 2.5L13.5 15.5 10 16Z"></path></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7"></path></svg>'
};
const iconButton = (action, id, label, icon) => `<button type="button" class="tutor-icon-button" data-${action}="${id}" aria-label="${esc(label)}" title="${esc(label)}">${ICONS[icon]}</button>`;
const store = (key, value) => { try { localStorage.setItem(`seg301m-tutor-${key}`, value); } catch {} };
const recall = (key) => { try { return localStorage.getItem(`seg301m-tutor-${key}`); } catch { return null; } };
const language = () => 'vi';
const t = (key) => COPY.vi[key] ?? key;
const errorText = (error) => ({
  missing_settings: t('missingSettings'), invalid_key: t('invalidKey'), gateway_unreachable: t('gatewayUnreachable'),
  gateway_timeout: t('gatewayTimeout')
})[error?.code] || error?.message || t('genericError');

if (location.hostname === '127.0.0.1') void initTutor();

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { ...options,
    headers: { 'X-SEG301m-Client': '1', ...(options.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error?.message || `HTTP ${response.status}`), { code: result.error?.code });
  return result;
}

function markdown(text) {
  const code = [], math = [];
  let source = String(text || '').replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g, (value) => {
    const token = `SEG301MCODE${code.length}TOKEN`; code.push(value); return token;
  });
  source = source.replace(/\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\\([\s\S]*?\\\)/g, (value) => {
    const token = `SEG301MMATH${math.length}TOKEN`; math.push(value); return token;
  });
  source = source.replace(/SEG301MCODE(\d+)TOKEN/g, (_token, index) => code[Number(index)]);
  let html = marked.parse(source, { gfm: true, breaks: true });
  html = html.replace(/SEG301MMATH(\d+)TOKEN/g, (_token, index) => esc(math[Number(index)]));
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['img', 'iframe', 'form', 'style', 'svg', 'math'], FORBID_ATTR: ['style', 'srcset'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|\/|#)/i
  });
}

function renderRich(target) {
  target.querySelectorAll('pre code').forEach((code) => {
    const name = [...code.classList].find((item) => item.startsWith('language-'))?.slice(9);
    if (name && hljs.getLanguage(name)) code.innerHTML = hljs.highlight(code.textContent, { language: name }).value;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'tutor-code-copy'; button.textContent = t('copy');
    button.addEventListener('click', () => void navigator.clipboard.writeText(code.textContent));
    code.parentElement.append(button);
  });
  target.querySelectorAll('a').forEach((link) => { link.target = '_blank'; link.rel = 'noopener noreferrer'; });
  renderMathInElement(target, { delimiters: [
    { left: '$$', right: '$$', display: true }, { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false }, { left: '$', right: '$', display: false }
  ], throwOnError: false });
}

function lessonContext() {
  if (document.body.dataset.page !== 'chapter') return null;
  const panel = document.querySelector('.lesson-language');
  const headings = [...(panel?.querySelectorAll('h2[data-section-heading]') ?? [])];
  const nearest = headings.reduce((best, heading) => {
    const distance = Math.abs(heading.getBoundingClientRect().top - window.innerHeight * .3);
    return !best || distance < best.distance ? { heading, distance } : best;
  }, null)?.heading;
  if (!nearest) return null;
  const nodes = [];
  for (let node = nearest.nextElementSibling; node && !node.matches('h2[data-section-heading]'); node = node.nextElementSibling) {
    nodes.push(node.textContent);
    if (nodes.join('\n').length > 12000) break;
  }
  const chapter = location.pathname.match(/chapter-(\d+)\.html/)?.[1];
  const contentLanguage = 'vi';
  return { title: nearest.textContent.trim(), language: contentLanguage,
    citation: chapter ? `/chapters/chapter-${chapter}.html#${nearest.dataset.sectionHeading}-${contentLanguage}` : '',
    text: nodes.join('\n').slice(0, 12000), quote: state.quote };
}

function selectedPath() {
  if (!state.conversation?.selectedLeafId) return [];
  const lookup = new Map(state.conversation.messages.map((message) => [message.id, message]));
  const path = []; let item = lookup.get(state.conversation.selectedLeafId);
  while (item) { path.unshift(item); item = lookup.get(item.parentId); }
  return path;
}

function branchSiblings(message) {
  return state.conversation.messages.filter((item) => item.parentId === message.parentId && item.role === message.role);
}

function deepestLeaf(startId) {
  let item = state.conversation.messages.find((message) => message.id === startId);
  while (item) {
    const children = state.conversation.messages.filter((child) => child.parentId === item.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!children.length) return item.id;
    item = children[0];
  }
  return startId;
}

function chatButton(item) {
  const menuOpen = state.openChatMenuId === item.id;
  return `<div class="tutor-history-entry ${menuOpen ? 'is-menu-open' : ''}" data-chat-entry="${item.id}">
    <button type="button" class="tutor-history-item ${state.conversation?.id === item.id ? 'is-current' : ''}" data-open-chat="${item.id}"><span>${esc(item.title)}</span><small>${new Date(item.updatedAt).toLocaleDateString('vi-VN')}</small></button>
    <button type="button" class="tutor-history-more" data-chat-menu="${item.id}" aria-label="${esc(t('moreActions'))}" title="${esc(t('moreActions'))}" aria-expanded="${menuOpen}">${ICONS.more}</button>
    ${menuOpen ? `<div class="tutor-history-menu" role="menu"><button type="button" data-chat-rename="${item.id}" role="menuitem">${ICONS.edit}<span>${t('rename')}</span></button><button type="button" data-chat-export="${item.id}" role="menuitem">${ICONS.export}<span>${t('export')}</span></button><button type="button" class="is-danger" data-chat-delete="${item.id}" role="menuitem">${ICONS.trash}<span>${t('delete')}</span></button></div>` : ''}
  </div>`;
}

function renderHistory() {
  const list = ui.querySelector('[data-history]');
  const projectBlocks = state.projects.map((project) => {
    const chats = state.conversations.filter((item) => item.projectId === project.id);
    const collapsed = state.collapsedProjects.has(project.id);
    return `<section class="tutor-project ${collapsed ? 'is-collapsed' : ''}">
      <div class="tutor-project-row"><button data-project-toggle="${project.id}" aria-expanded="${!collapsed}"><span class="tutor-project-caret">⌄</span><span class="tutor-project-icon">▱</span><strong>${esc(project.name)}</strong><small>${chats.length}</small></button><div>
        <button data-project-new-chat="${project.id}" title="${esc(t('newChatInProject'))}" aria-label="${esc(t('newChatInProject'))}">＋</button>
        <button data-project-rename="${project.id}" title="${esc(t('renameProject'))}" aria-label="${esc(t('renameProject'))}">…</button>
        <button data-project-delete="${project.id}" title="${esc(t('deleteProject'))}" aria-label="${esc(t('deleteProject'))}">×</button>
      </div></div>
      <div class="tutor-project-chats">${chats.map(chatButton).join('') || `<p class="tutor-muted">${t('noProjectChats')}</p>`}</div>
    </section>`;
  }).join('');
  const recents = state.conversations.filter((item) => !item.projectId);
  list.innerHTML = `<div class="tutor-section-title"><span>${t('projects')}</span><button data-project-create aria-label="${esc(t('newProject'))}">＋</button></div>
    ${projectBlocks}<div class="tutor-section-title tutor-section-title--recents"><span>${t('recents')}</span></div>
    <div class="tutor-recents">${recents.map(chatButton).join('') || `<p class="tutor-muted">${t('noChats')}</p>`}</div>`;
}

function renderProjectSelect() {
  const select = ui.querySelector('[data-project-select]');
  if (!select) return;
  const value = state.conversation?.projectId ?? '';
  select.innerHTML = `<option value="">${t('noProject')}</option>${state.projects.map((project) => `<option value="${project.id}">${esc(project.name)}</option>`).join('')}`;
  select.value = value;
  select.disabled = !state.conversation;
}

function formatMessageTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((today - messageDay) / 86400000);
  const locale = 'vi-VN';
  const day = dayDifference === 0 ? t('today') : dayDifference === 1 ? t('yesterday')
    : date.toLocaleDateString(locale, { year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric', month: 'short', day: 'numeric' });
  return `${day} ${date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}`;
}

function isNearMessageBottom(target) {
  return target.scrollHeight - target.scrollTop - target.clientHeight <= 80;
}

function updateScrollBottomButton() {
  const target = ui.querySelector('[data-messages]');
  const button = ui.querySelector('[data-scroll-bottom]');
  button.hidden = isNearMessageBottom(target) || target.scrollHeight <= target.clientHeight;
}

function scrollMessagesToBottom(behavior = 'auto') {
  const target = ui.querySelector('[data-messages]');
  target.scrollTo({ top: target.scrollHeight, behavior });
  updateScrollBottomButton();
}

function renderStreamingMessage(message) {
  const target = ui.querySelector('[data-messages]');
  const keepAtBottom = isNearMessageBottom(target);
  const article = target.querySelector(`[data-message="${message.id}"]`);
  const body = article?.querySelector('.tutor-message-body');
  if (!body) { renderMessages(); return; }
  body.textContent = message.content;
  const status = article.querySelector('.tutor-message-status');
  if (status) status.textContent = t('generating');
  if (keepAtBottom) target.scrollTop = target.scrollHeight;
  updateScrollBottomButton();
}

function renderMessages({ forceBottom = false } = {}) {
  const target = ui.querySelector('[data-messages]');
  const keepAtBottom = forceBottom || isNearMessageBottom(target);
  const previousScrollTop = target.scrollTop;
  const statusCopy = { sending: t('sending'), generating: t('generating'), failed: t('failed'), stopped: t('stopped'), interrupted: t('interrupted') };
  const path = selectedPath();
  target.innerHTML = path.length ? path.map((message, index) => {
    const previous = path[index - 1];
    const showTime = !previous || new Date(message.createdAt) - new Date(previous.createdAt) >= 6 * 60 * 60 * 1000;
    const timeDivider = showTime ? `<div class="tutor-time-divider"><span>${esc(formatMessageTime(message.createdAt))}</span></div>` : '';
    const siblings = branchSiblings(message);
    const busy = ['sending', 'generating'].includes(message.status);
    const branch = siblings.length > 1 ? `<span class="tutor-branch">${siblings.findIndex((item) => item.id === message.id) + 1}/${siblings.length} <button data-branch-prev="${message.id}" aria-label="${t('branchPrev')}">‹</button><button data-branch-next="${message.id}" aria-label="${t('branchNext')}">›</button></span>` : '';
    const context = message.context?.title ? `<div class="tutor-context-note">${t('source')}: <a href="${esc(message.context.citation || '#')}" target="_blank" rel="noopener">${esc(message.context.title)}</a>${message.context.quote ? `<blockquote>${esc(message.context.quote)}</blockquote>` : ''}</div>` : '';
    const files = message.attachments?.length ? `<div class="tutor-files">${message.attachments.map((item) => item.downloadUrl
      ? `<a href="${esc(item.downloadUrl)}" download="${esc(item.name)}" title="${esc(t('downloadFile'))}"><span aria-hidden="true">${message.role === 'assistant' ? '↓' : '📎'}</span>${esc(item.name)}</a>`
      : `<span>📎 ${esc(item.name)}</span>`).join('')}</div>` : '';
    const status = message.status !== 'complete' ? `<small class="tutor-message-status">${esc(statusCopy[message.status] || message.status)}</small>` : '';
    const head = status ? `<div class="tutor-message-head">${status}</div>` : '';
    const body = message.role === 'assistant' && busy && !message.content
      ? `<div class="tutor-thinking" role="status" aria-label="${esc(t('thinking'))}"><span></span><span></span><span></span><em>${t('thinking')}</em></div>`
      : markdown(message.content);
    const failure = message.role === 'assistant' && message.errorMessage
      ? `<p class="tutor-message-error">${esc(message.errorMessage)}</p>` : '';
    const actions = busy ? '' : `<div class="tutor-message-actions">${branch}${iconButton('copy', message.id, t('copy'), 'copy')}${message.role === 'user' ? iconButton('edit', message.id, t('edit'), 'edit') : iconButton('regenerate', message.id, t('regenerate'), 'regenerate')}</div>`;
    return `${timeDivider}<article class="tutor-message tutor-message--${message.role}" data-message="${message.id}"><div class="tutor-message-bubble">${head}${context}${files}<div class="tutor-message-body">${body}</div>${failure}</div>${actions}</article>`;
  }).join('') : `<div class="tutor-empty"><span>✦</span><h2>${t('emptyTitle')}</h2><p>${t('emptyBody')}</p></div>`;
  target.querySelectorAll('.tutor-message-body').forEach(renderRich);
  if (keepAtBottom) target.scrollTop = target.scrollHeight;
  else target.scrollTop = previousScrollTop;
  updateScrollBottomButton();
}

function setPanelWidth(width) {
  const maximum = Math.min(900, window.innerWidth - 80);
  state.panelWidth = Math.max(360, Math.min(maximum, width));
  ui.style.setProperty('--tutor-width', `${state.panelWidth}px`);
  document.body.style.setProperty('--tutor-panel-width', `${state.panelWidth}px`);
  store('width', String(state.panelWidth));
}

function renderHeader() {
  ui.classList.toggle('is-open', state.open);
  ui.classList.toggle('is-full', state.full);
  ui.classList.toggle('is-sidebar-open', state.sidebarOpen);
  document.body.classList.toggle('tutor-open', state.open && !state.full);
  document.body.classList.toggle('tutor-full', state.open && state.full);
  const fullButton = ui.querySelector('[data-full-header]');
  const fullLabel = state.full ? t('restore') : t('expand');
  fullButton.innerHTML = state.full ? ICONS.compact : ICONS.expand;
  fullButton.setAttribute('aria-label', fullLabel);
  fullButton.setAttribute('title', fullLabel);
  const compactButton = ui.querySelector('[data-compact-context]');
  compactButton.disabled = !state.conversation || state.compacting || state.sending || !!state.generationId;
  compactButton.querySelector('span').textContent = state.compacting ? t('compacting') : t('compact');
  ui.querySelector('[data-stop]').hidden = !state.generationId;
  ui.querySelector('[data-send]').disabled = state.sending || !!state.generationId;
  const context = lessonContext();
  const chip = ui.querySelector('[data-context-chip]');
  chip.textContent = ui.querySelector('[data-use-lesson]').checked && context ? `${context.title} · ${context.language.toUpperCase()}` : '';
  chip.hidden = !chip.textContent;
  renderProjectSelect();
}

function resizeComposer() {
  const composer = ui.querySelector('[data-composer]');
  composer.style.overflowY = 'hidden';
  composer.style.height = 'auto';
  composer.style.height = `${Math.min(composer.scrollHeight, 120)}px`;
  composer.style.overflowY = composer.scrollHeight > 120 ? 'auto' : 'hidden';
}

function applyLocale() {
  const labels = {
    launch: t('launch'), newChat: t('newChat'), search: t('search'), backup: t('backup'), shutdown: t('shutdown'), tutor: t('tutor'),
    rename: t('rename'), export: t('export'), delete: t('delete'), project: t('project'), useLesson: t('useLesson'),
    effort: t('effort'), message: t('message'), attach: t('attach'), stop: t('stop'), send: t('send'), askSelection: t('askSelection')
  };
  for (const [name, value] of Object.entries(labels)) ui.querySelectorAll(`[data-i18n="${name}"]`).forEach((element) => { element.textContent = value; });
  ui.querySelector('[data-search]').placeholder = t('searchPlaceholder');
  ui.querySelector('[data-search-toggle]').setAttribute('aria-label', t('search'));
  ui.querySelector('[data-search-toggle]').setAttribute('title', t('search'));
  ui.querySelector('[data-composer]').placeholder = t('placeholder');
  ui.querySelector('[data-composer]').setAttribute('aria-label', t('message'));
  ui.querySelector('[data-attach-toggle]').setAttribute('aria-label', t('attach'));
  ui.querySelector('[data-attach-toggle]').setAttribute('title', t('attach'));
  ui.querySelector('[data-effort]').setAttribute('aria-label', t('effort'));
  ui.querySelector('[data-effort]').setAttribute('title', t('effort'));
  ui.querySelector('[data-send]').setAttribute('aria-label', t('send'));
  ui.querySelector('[data-send]').setAttribute('title', t('send'));
  ui.querySelector('[data-scroll-bottom]').setAttribute('aria-label', t('scrollBottom'));
  ui.querySelector('[data-scroll-bottom]').setAttribute('title', t('scrollBottom'));
  ui.querySelector('[data-sidebar-toggle]').setAttribute('aria-label', t('sidebar'));
  ui.querySelector('[data-sidebar-close]').setAttribute('aria-label', t('closeSidebar'));
  ui.querySelector('[data-sidebar-dismiss]').setAttribute('aria-label', t('closeSidebar'));
  ui.querySelectorAll('[data-close]').forEach((button) => button.setAttribute('aria-label', t('close')));
  ui.querySelector('[data-resize-handle]').setAttribute('aria-label', t('resize'));
  const effort = ui.querySelector('[data-effort]');
  const selected = effort.value || recall('effort') || state.settings?.defaultEffort || 'medium';
  effort.innerHTML = ['low', 'medium', 'high', 'xhigh'].map((value) => `<option value="${value}">${t(value)}</option>`).join('');
  effort.value = selected;
  renderHistory(); renderMessages(); renderHeader(); renderAttachments();
}

async function refreshSidebar() {
  [state.projects, state.conversations] = await Promise.all([api('/projects'), api('/conversations')]);
  renderHistory(); renderProjectSelect();
}

async function openConversation(id, { forceBottom = true } = {}) {
  if (state.conversation?.id !== id && state.stream) { state.stream.close(); state.stream = null; state.generationId = null; }
  state.conversation = id ? await api(`/conversations/${id}`) : null;
  if (id) state.newProjectId = null;
  store('conversation', id || '');
  renderHistory(); renderMessages({ forceBottom }); renderHeader();
  if (state.conversation?.activeGenerationId && !state.generationId) connectStream(state.conversation.activeGenerationId);
}

async function send({ content, userMessageId, editMessageId, parentId } = {}) {
  if (state.sending || state.generationId) return;
  content ??= ui.querySelector('[data-composer]').value;
  if (!content.trim() && !userMessageId && !state.attachments.length) return;
  state.sending = true; renderHeader();
  try {
    if (!state.conversation) {
      const created = await api('/conversations', { method: 'POST', body: JSON.stringify({ projectId: state.newProjectId }) });
      await refreshSidebar(); await openConversation(created.id);
    }
    const context = userMessageId ? undefined : state.selectedContext || (ui.querySelector('[data-use-lesson]').checked ? lessonContext() : state.quote ? { quote: state.quote } : null);
    const result = await api(`/conversations/${state.conversation.id}/generations`, { method: 'POST', body: JSON.stringify({
      idempotencyKey: crypto.randomUUID(), content, userMessageId, editMessageId, parentId, context,
      attachmentIds: state.attachments.map((item) => item.id), effort: ui.querySelector('[data-effort]').value
    }) });
    ui.querySelector('[data-composer]').value = '';
    resizeComposer();
    store('draft', ''); state.quote = ''; state.selectedContext = null; state.attachments = []; renderAttachments();
    await openConversation(state.conversation.id); await refreshSidebar(); connectStream(result.id);
  } catch (error) { notice(errorText(error)); }
  finally { state.sending = false; renderHeader(); }
}

function connectStream(id) {
  state.stream?.close(); state.generationId = id; renderHeader();
  const current = state.conversation?.messages.find((message) => message.id === state.conversation.selectedLeafId);
  if (current) { current.content = ''; renderMessages(); }
  const stream = new EventSource(`/api/generations/${id}/events`); state.stream = stream;
  stream.addEventListener('snapshot', (event) => {
    const data = JSON.parse(event.data); const item = state.conversation?.messages.find((message) => message.id === state.conversation.selectedLeafId);
    if (item && data.text) { item.content = data.text; renderMessages(); }
    if (data.status && !['sending', 'generating'].includes(data.status)) void finishStream();
  });
  stream.addEventListener('delta', (event) => {
    const item = state.conversation?.messages.find((message) => message.id === state.conversation.selectedLeafId);
    if (item) { item.content += JSON.parse(event.data).text; item.status = 'generating'; renderStreamingMessage(item); }
  });
  stream.addEventListener('done', (event) => { const data = JSON.parse(event.data); if (data.error) notice(errorText(data.error)); void finishStream(); });
  stream.addEventListener('context', () => notice(t('contextReduced')));
  stream.onerror = () => { stream.close(); void finishStream(); };
}

async function finishStream() {
  state.stream?.close(); state.stream = null; state.generationId = null;
  if (state.conversation) { await openConversation(state.conversation.id, { forceBottom: false }); await refreshSidebar(); }
  renderHeader();
}

function notice(message) {
  const element = ui.querySelector('[data-notice]'); element.textContent = message; element.hidden = false;
  clearTimeout(notice.timer); notice.timer = setTimeout(() => { element.hidden = true; }, 7000);
}

function renderAttachments() {
  ui.querySelector('[data-attachments]').innerHTML = state.attachments.map((item) => `<span>${item.previewUrl ? `<img src="${esc(item.previewUrl)}" alt="">` : ''}${esc(item.name)} <button data-remove-attachment="${item.id}" aria-label="${t('removeFile')}">×</button></span>`).join('');
}

async function uploadFiles(files) {
  for (const file of [...files].slice(0, 5 - state.attachments.length)) {
    if (file.size > 10 * 1024 * 1024) { notice(`${file.name}: ${t('fileLimit')}`); continue; }
    try {
      const response = await fetch('/api/attachments', { method: 'POST', headers: { 'X-SEG301m-Client': '1', 'X-File-Name': encodeURIComponent(file.name), 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      const result = await response.json(); if (!response.ok) throw new Error(result.error?.message || t('uploadFailed'));
      state.attachments.push(result); renderAttachments();
    } catch (error) { notice(errorText(error)); }
  }
}

function beginResize(event) {
  if (state.full || window.innerWidth <= 900 || event.button !== 0) return;
  event.preventDefault(); ui.classList.add('is-resizing');
  const move = (moveEvent) => setPanelWidth(window.innerWidth - moveEvent.clientX);
  const end = () => { ui.classList.remove('is-resizing'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', end, { once: true });
}

function setupEvents() {
  ui.addEventListener('click', async (event) => {
    const button = event.target.closest('button'); if (!button) return;
    try {
      if (button.matches('[data-launch]')) { state.open = true; store('open', '1'); renderHeader(); ui.querySelector('[data-composer]').focus(); }
      else if (button.matches('[data-close]')) { state.open = false; store('open', '0'); renderHeader(); }
      else if (button.matches('[data-sidebar-toggle]')) { state.sidebarOpen = !state.sidebarOpen; store('sidebar', state.sidebarOpen ? '1' : '0'); renderHeader(); }
      else if (button.matches('[data-sidebar-close]')) { state.sidebarOpen = false; store('sidebar', '0'); renderHeader(); }
      else if (button.matches('[data-sidebar-dismiss]')) { state.sidebarOpen = false; store('sidebar', '0'); renderHeader(); }
      else if (button.matches('[data-search-toggle]')) { const panel = ui.querySelector('[data-search-panel]'); panel.hidden = !panel.hidden; button.setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) ui.querySelector('[data-search]').focus(); }
      else if (button.matches('[data-full]')) { state.full = !state.full; store('full', state.full ? '1' : '0'); const menu = ui.querySelector('[data-attach-popover]'); menu.hidden = true; ui.querySelector('[data-attach-toggle]').setAttribute('aria-expanded', 'false'); renderHeader(); }
      else if (button.matches('[data-compact-context]') && state.conversation) {
        const menu = ui.querySelector('[data-attach-popover]'); menu.hidden = true; ui.querySelector('[data-attach-toggle]').setAttribute('aria-expanded', 'false');
        state.compacting = true; notice(t('compacting')); renderHeader();
        try { await api(`/conversations/${state.conversation.id}/compact`, { method: 'POST', body: '{}' }); state.conversation = await api(`/conversations/${state.conversation.id}`); notice(t('compacted')); }
        finally { state.compacting = false; renderHeader(); }
      }
      else if (button.matches('[data-new]')) { state.newProjectId = null; await openConversation(null); ui.querySelector('[data-composer]').focus(); }
      else if (button.matches('[data-project-new-chat]')) { state.newProjectId = button.dataset.projectNewChat; await openConversation(null); ui.querySelector('[data-composer]').focus(); }
      else if (button.matches('[data-chat-menu]')) { state.openChatMenuId = state.openChatMenuId === button.dataset.chatMenu ? null : button.dataset.chatMenu; renderHistory(); }
      else if (button.matches('[data-chat-rename]')) { const chat = state.conversations.find((item) => item.id === button.dataset.chatRename); state.openChatMenuId = null; const title = prompt(t('chatName'), chat?.title || ''); if (chat && title?.trim()) { const updated = await api(`/conversations/${chat.id}`, { method: 'PATCH', body: JSON.stringify({ title: title.trim() }) }); if (state.conversation?.id === chat.id) state.conversation = updated; await refreshSidebar(); } else renderHistory(); }
      else if (button.matches('[data-chat-export]')) { state.openChatMenuId = null; renderHistory(); window.location.href = `/api/conversations/${button.dataset.chatExport}/export`; }
      else if (button.matches('[data-chat-delete]')) { const chat = state.conversations.find((item) => item.id === button.dataset.chatDelete); state.openChatMenuId = null; if (chat && confirm(t('deleteChat'))) { await api(`/conversations/${chat.id}`, { method: 'DELETE' }); if (state.conversation?.id === chat.id) await openConversation(null); await refreshSidebar(); } else renderHistory(); }
      else if (button.matches('[data-open-chat]')) { state.openChatMenuId = null; await openConversation(button.dataset.openChat); if (!state.full) state.sidebarOpen = false; renderHeader(); }
      else if (button.matches('[data-project-toggle]')) { const id = button.dataset.projectToggle; state.collapsedProjects.has(id) ? state.collapsedProjects.delete(id) : state.collapsedProjects.add(id); renderHistory(); }
      else if (button.matches('[data-project-create]')) { const name = prompt(t('projectName')); if (name?.trim()) { await api('/projects', { method: 'POST', body: JSON.stringify({ name: name.trim() }) }); await refreshSidebar(); } }
      else if (button.matches('[data-project-rename]')) { const project = state.projects.find((item) => item.id === button.dataset.projectRename); const name = prompt(t('renameProject'), project?.name || ''); if (project && name?.trim()) { await api(`/projects/${project.id}`, { method: 'PATCH', body: JSON.stringify({ name: name.trim() }) }); await refreshSidebar(); } }
      else if (button.matches('[data-project-delete]')) { const project = state.projects.find((item) => item.id === button.dataset.projectDelete); if (project && confirm(t('confirmDeleteProject'))) { await api(`/projects/${project.id}`, { method: 'DELETE' }); const reloadCurrent = state.conversation?.projectId === project.id; await refreshSidebar(); if (reloadCurrent) await openConversation(state.conversation.id); } }
      else if (button.matches('[data-backup]')) { const response = await fetch('/api/backup', { method: 'POST', headers: { 'X-SEG301m-Client': '1' } }); if (!response.ok) throw new Error((await response.json()).error?.message || 'Backup failed.'); const link = document.createElement('a'); link.href = URL.createObjectURL(await response.blob()); link.download = 'seg301m-tutor-backup.zip'; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 60000); }
      else if (button.matches('[data-shutdown]') && confirm(t('shutdownConfirm'))) { await api('/shutdown-ui', { method: 'POST' }); notice(t('stoppedApp')); }
      else if (button.matches('[data-send]')) await send();
      else if (button.matches('[data-scroll-bottom]')) scrollMessagesToBottom('smooth');
      else if (button.matches('[data-attach-toggle]')) { const menu = ui.querySelector('[data-attach-popover]'); menu.hidden = !menu.hidden; button.setAttribute('aria-expanded', String(!menu.hidden)); }
      else if (button.matches('[data-stop]')) await api(`/generations/${state.generationId}/stop`, { method: 'POST' });
      else if (button.matches('[data-rename]') && state.conversation) { const title = prompt(t('chatName'), state.conversation.title); if (title?.trim()) { state.conversation = await api(`/conversations/${state.conversation.id}`, { method: 'PATCH', body: JSON.stringify({ title: title.trim() }) }); await refreshSidebar(); } }
      else if (button.matches('[data-delete]') && state.conversation && confirm(t('deleteChat'))) { await api(`/conversations/${state.conversation.id}`, { method: 'DELETE' }); await openConversation(null); await refreshSidebar(); }
      else if (button.matches('[data-copy]')) { const message = state.conversation.messages.find((item) => item.id === button.dataset.copy); await navigator.clipboard.writeText(message.content); notice(t('copied')); }
      else if (button.matches('[data-edit]')) { const message = state.conversation.messages.find((item) => item.id === button.dataset.edit); const content = prompt(t('edit'), message.content); if (content?.trim() && content !== message.content) await send({ content, editMessageId: message.id }); }
      else if (button.matches('[data-regenerate]')) { const message = state.conversation.messages.find((item) => item.id === button.dataset.regenerate); await send({ userMessageId: message.parentId }); }
      else if (button.matches('[data-branch-prev],[data-branch-next]')) { const current = state.conversation.messages.find((item) => item.id === (button.dataset.branchPrev || button.dataset.branchNext)); const siblings = branchSiblings(current); const index = siblings.findIndex((item) => item.id === current.id); const next = siblings[(index + (button.dataset.branchNext ? 1 : -1) + siblings.length) % siblings.length]; state.conversation = await api(`/conversations/${state.conversation.id}`, { method: 'PATCH', body: JSON.stringify({ selectedLeafId: deepestLeaf(next.id) }) }); renderMessages(); }
      else if (button.matches('[data-remove-attachment]')) { state.attachments = state.attachments.filter((item) => item.id !== button.dataset.removeAttachment); renderAttachments(); }
      else if (button.matches('[data-export]') && state.conversation) window.location.href = `/api/conversations/${state.conversation.id}/export`;
      else if (button.matches('[data-ask-selection]')) { state.open = true; state.quote = state.pendingQuote; state.selectedContext = { ...lessonContext(), quote: state.quote }; ui.querySelector('[data-use-lesson]').checked = true; ui.querySelector('[data-composer]').value = `${t('explainSelection')} "${state.quote.slice(0, 300)}"`; renderHeader(); ui.querySelector('[data-composer]').focus(); button.hidden = true; }
    } catch (error) { notice(errorText(error)); }
  });
  ui.querySelector('[data-composer]').addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); void send(); } });
  ui.querySelector('[data-messages]').addEventListener('scroll', updateScrollBottomButton, { passive: true });
  ui.querySelector('[data-composer]').addEventListener('input', (event) => { store('draft', event.target.value); resizeComposer(); });
  ui.querySelector('[data-effort]').addEventListener('change', (event) => store('effort', event.target.value));
  ui.querySelector('[data-use-lesson]').addEventListener('change', renderHeader);
  ui.querySelector('[data-search]').addEventListener('input', async (event) => { state.conversations = await api(`/conversations?q=${encodeURIComponent(event.target.value)}`); renderHistory(); });
  ui.querySelector('[data-file]').addEventListener('change', (event) => { void uploadFiles(event.target.files); event.target.value = ''; const menu = ui.querySelector('[data-attach-popover]'); menu.hidden = true; ui.querySelector('[data-attach-toggle]').setAttribute('aria-expanded', 'false'); });
  ui.querySelector('[data-composer]').addEventListener('paste', (event) => { const files = [...event.clipboardData.files].filter((item) => item.type.startsWith('image/')); if (files.length) { event.preventDefault(); void uploadFiles(files); } });
  ui.querySelector('[data-composer]').addEventListener('dragover', (event) => event.preventDefault());
  ui.querySelector('[data-composer]').addEventListener('drop', (event) => { event.preventDefault(); void uploadFiles(event.dataTransfer.files); });
  ui.querySelector('[data-resize-handle]').addEventListener('pointerdown', beginResize);
  document.addEventListener('selectionchange', () => { const selection = window.getSelection(); const button = ui.querySelector('[data-ask-selection]'); const valid = selection && String(selection).trim().length >= 5 && document.querySelector('.lesson-content')?.contains(selection.anchorNode); if (valid) state.pendingQuote = String(selection).slice(0, 4000); button.hidden = !valid; });
  document.addEventListener('click', (event) => { if (state.openChatMenuId && !event.target.closest('[data-chat-entry]')) { state.openChatMenuId = null; renderHistory(); } const menu = ui.querySelector('[data-attach-popover]'); if (!menu.hidden && !event.target.closest('.tutor-attach-control')) { menu.hidden = true; ui.querySelector('[data-attach-toggle]').setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('keydown', (event) => { if (event.key !== 'Escape' || !state.open) return; const menu = ui.querySelector('[data-attach-popover]'); if (!menu.hidden) { menu.hidden = true; ui.querySelector('[data-attach-toggle]').setAttribute('aria-expanded', 'false'); } else if (state.openChatMenuId) { state.openChatMenuId = null; renderHistory(); } else if (state.sidebarOpen) state.sidebarOpen = false; else state.open = false; renderHeader(); });
  window.addEventListener('resize', () => { if (!state.full) setPanelWidth(state.panelWidth); updateScrollBottomButton(); });
  // single-locale
}

async function initTutor() {
  try { await api('/health'); } catch { return; }
  state.settings = await api('/settings');
  state.open = recall('open') === '1'; state.full = recall('full') === '1';
  state.sidebarOpen = recall('sidebar') === null ? state.full : recall('sidebar') === '1';
  state.panelWidth = Number(recall('width')) || 480;
  ui = document.createElement('div'); ui.className = 'tutor-root';
  ui.innerHTML = `<button class="tutor-launch" data-launch><span>✦</span> <span data-i18n="launch"></span></button>
    <button class="tutor-selection" data-ask-selection data-i18n="askSelection" hidden></button>
    <section class="tutor-shell" aria-label="AI Tutor"><div class="tutor-resize-handle" data-resize-handle role="separator" aria-orientation="vertical"></div>
      <aside class="tutor-sidebar"><div class="tutor-sidebar-head"><strong>AI Tutor <span>✦</span></strong><div class="tutor-sidebar-actions"><button data-search-toggle aria-expanded="false">${ICONS.search}</button><button class="tutor-sidebar-close" data-sidebar-close>${ICONS.layout}</button></div></div>
        <button class="tutor-primary-action" data-new><span class="tutor-primary-icon">${ICONS.newChat}</span><span data-i18n="newChat"></span></button>
        <div class="tutor-search-panel" data-search-panel hidden><input data-search type="search"></div>
        <div data-history class="tutor-history"></div>
        <div class="tutor-sidebar-footer"><button data-backup data-i18n="backup"></button><button data-shutdown data-i18n="shutdown"></button><p class="tutor-sponsor">AI access sponsored by <strong>Marcus</strong></p></div>
      </aside><button type="button" class="tutor-sidebar-scrim" data-sidebar-dismiss aria-label="${esc(t('closeSidebar'))}"></button>
      <div class="tutor-main"><header class="tutor-header"><button class="tutor-header-button tutor-sidebar-toggle" data-sidebar-toggle>${ICONS.layout}</button><div class="tutor-header-actions"><button data-full data-full-header></button><button data-close aria-label="Close">×</button></div></header>
        <div data-notice class="tutor-notice" role="status" hidden></div><div class="tutor-chat-pane">
          <div class="tutor-message-region"><div data-messages class="tutor-messages" aria-live="polite"></div><button type="button" class="tutor-scroll-bottom" data-scroll-bottom hidden>${ICONS.down}</button></div><div class="tutor-compose"><div class="tutor-compose-options"><label class="tutor-inline"><input data-use-lesson type="checkbox" ${document.body.dataset.page === 'chapter' ? 'checked' : ''}><span data-i18n="useLesson"></span></label><span data-context-chip class="tutor-chip" hidden></span></div>
            <div data-attachments class="tutor-attachments"></div><div class="tutor-composer-shell"><div class="tutor-attach-control"><button type="button" class="tutor-attach-toggle" data-attach-toggle aria-expanded="false">${ICONS.plus}</button><div class="tutor-attach-popover" data-attach-popover hidden><label class="tutor-attach-menu-action">${ICONS.paperclip}<span data-i18n="attach"></span><input data-file type="file" multiple accept="image/png,image/jpeg,image/webp,.txt,.md,.csv,.json,.js,.py,.java,.pdf"></label><button type="button" class="tutor-attach-menu-action" data-compact-context>${ICONS.compress}<span></span></button></div></div><textarea data-composer rows="1"></textarea><div class="tutor-composer-controls"><select data-effort></select><button class="tutor-stop" data-stop data-i18n="stop" hidden></button><button type="button" class="tutor-send" data-send>${ICONS.send}</button></div></div>
          </div></div></div></section>`;
  document.body.append(ui); setPanelWidth(state.panelWidth); setupEvents(); renderHeader();
  ui.querySelector('[data-composer]').value = recall('draft') || '';
  resizeComposer();
  await refreshSidebar();
  const saved = recall('conversation');
  if (saved && state.conversations.some((item) => item.id === saved)) await openConversation(saved); else renderMessages();
  applyLocale();
}
