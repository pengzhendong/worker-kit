import { createFrameStore } from './frame-store.js';
import {
  frontendPreviewPath,
  frontendViews,
  officialDemos,
  preloadLabels,
  previewCategory,
} from './catalog.js';

const integrated = document.body.dataset.workerkitMode === 'integrated';
const sonicOrigin = document.body.dataset.sonicOrigin;
const backendViews = {
  standard: '/standard/',
  payload: '/admin/',
  ...(sonicOrigin && {
    sonic: new URL('/admin', sonicOrigin).href,
  }),
  native: '/native/',
  hub: '/hub/',
  sveltekit: '/sveltekit/',
  astro: '/astro/',
  'react-router': '/react-router/',
};
const backendTabs = document.querySelector('#backend-views');
const uiTabs = document.querySelector('#ui-views');
const categorySelect = document.querySelector('#preview-category');
const backendCategory = categorySelect.querySelector('[value="backend"]');
backendCategory.hidden = backendCategory.disabled = !integrated;
for (const button of backendTabs.querySelectorAll('[data-view]'))
  button.hidden =
    !integrated || !Object.hasOwn(backendViews, button.dataset.view);

const params = new URLSearchParams(location.search);
const viewUrl = (view) =>
  new URL(backendViews[view] || frontendPreviewPath(view), location.origin)
    .href;
const stage = document.querySelector('.stage'),
  loading = document.querySelector('#loading');
const open = document.querySelector('#open');
const store = createFrameStore({
  stage,
  isMobile: () => mobile,
  onChange: () => updateTabStates(),
  onLoad(entry) {
    if (frame === entry.frame && !entry.frame.hidden) setBusy(false);
    progressWarm(entry);
    updateTabStates();
    scheduleWarm();
  },
});
const frames = store.entries,
  createFrame = store.create,
  discard = store.discard;
let frame,
  mobile = false;
let warming, idle, warmTimeout, preferred, intentTimer;
const attempted = new Set();
const preloadAllowed = () =>
  params.get('preload') !== 'off' &&
  !navigator.connection?.saveData &&
  !['slow-2g', '2g'].includes(navigator.connection?.effectiveType) &&
  document.visibilityState === 'visible' &&
  frontendViews.includes(active);
let active = params.get('view') || 'nuxt';
if (
  !frontendViews.includes(active) &&
  !(integrated && Object.hasOwn(backendViews, active))
)
  active = 'nuxt';
const lastView = {
  components: 'nuxt',
  templates: 'prime',
  docs: 'docs',
  backend: 'standard',
};
const categoryLabels = {
  components: '组件库方案',
  templates: '后台模板方案',
  docs: '文档方案',
};
const setBusy = (value) => {
  stage.setAttribute('aria-busy', String(value));
  loading.hidden = !value;
};
function updateTabStates() {
  const disabled =
    params.get('preload') === 'off' ||
    navigator.connection?.saveData ||
    ['slow-2g', '2g'].includes(navigator.connection?.effectiveType);
  for (const view of frontendViews) {
    const button = document.querySelector(`[data-view="${view}"]`);
    const entry = frames.get(viewUrl(view));
    const status = entry
      ? entry.loaded
        ? 'ready'
        : 'loading'
      : attempted.has(viewUrl(view))
        ? 'failed'
        : disabled
          ? 'disabled'
          : document.visibilityState === 'hidden'
            ? 'paused'
            : 'waiting';
    if (button.dataset.preloadStatus === status) continue;
    const label = preloadLabels[status];
    button.dataset.preloadStatus = status;
    button.title = label;
    document.getElementById('preview-status-' + view).textContent = label;
  }
}
// Warm public demos one at a time after the visible frame has loaded.
function cancelIdle() {
  if (idle !== undefined) {
    if (window.cancelIdleCallback) cancelIdleCallback(idle);
    else clearTimeout(idle);
    idle = undefined;
  }
}
function conceal(entry) {
  entry.frame.hidden = true;
  entry.frame.removeAttribute('style');
  entry.frame.removeAttribute('aria-hidden');
}
function stopWarm(target) {
  cancelIdle();
  clearTimeout(intentTimer);
  clearTimeout(warmTimeout);
  if (warming) {
    const old = warming;
    warming = undefined;
    if (old.key !== target) discard(old);
  }
}
function prioritizeView(view) {
  clearTimeout(intentTimer);
  if (!frontendViews.includes(view) || frames.has(viewUrl(view))) return;
  preferred = view;
  intentTimer = setTimeout(() => {
    if (warming && warming.key !== viewUrl(view)) stopWarm();
    scheduleWarm(view);
  }, 120);
}
function progressWarm(entry) {
  if (warming !== entry || !entry.loaded) return;
  clearTimeout(warmTimeout);
  warming = undefined;
  entry.frame.dataset.preloadState = 'ready';
  conceal(entry);
  updateTabStates();
  scheduleWarm();
}
function scheduleWarm(view) {
  if (view && frontendViews.includes(view)) preferred = view;
  cancelIdle();
  updateTabStates();
  const current = [...frames.values()].find((entry) => entry.frame === frame);
  if (
    !preloadAllowed() ||
    warming ||
    !current?.loaded ||
    stage.getAttribute('aria-busy') === 'true'
  )
    return;
  const run = () => {
    idle = undefined;
    if (
      !preloadAllowed() ||
      warming ||
      stage.getAttribute('aria-busy') === 'true'
    )
      return;
    const next = [preferred, ...frontendViews].find(
      (name) =>
        name &&
        name !== active &&
        !frames.has(viewUrl(name)) &&
        !attempted.has(viewUrl(name)),
    );
    if (!next) return;
    const url = viewUrl(next);
    warming = createFrame(url, url, { background: true });
    const entry = warming;
    warmTimeout = setTimeout(() => {
      if (warming === entry) {
        warming = undefined;
        attempted.add(url);
        discard(entry);
        scheduleWarm();
      }
    }, 15000);
  };
  idle = window.requestIdleCallback
    ? requestIdleCallback(run, { timeout: 1500 })
    : setTimeout(run, 300);
}
function selectView(view) {
  const category = previewCategory(view);
  const isUi = category !== 'backend';
  active = view;
  lastView[category] = view;
  categorySelect.value = category;
  uiTabs.hidden = !isUi;
  backendTabs.hidden = isUi;
  if (isUi) {
    uiTabs.setAttribute('aria-label', categoryLabels[category]);
    for (const button of uiTabs.querySelectorAll('[data-view]'))
      button.hidden = previewCategory(button.dataset.view) !== category;
  }
  for (const button of document.querySelectorAll('[data-view]')) {
    button.setAttribute('aria-selected', String(button.dataset.view === view));
    button.tabIndex = button.dataset.view === view ? 0 : -1;
  }
  document
    .querySelector(`[data-view="${view}"]`)
    .scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const url = viewUrl(view);
  open.href = isUi ? officialDemos[view] : url;
  open.textContent = isUi ? '官方演示 ↗' : '独立打开 ↗';
  open.rel = isUi ? 'noopener noreferrer' : 'noopener';
  history.replaceState(
    null,
    '',
    `?view=${view}${params.get('preload') === 'off' ? '&preload=off' : ''}`,
  );
  if (frame?.getAttribute('src') === url && !frame.hidden) return;
  stopWarm(url);
  for (const entry of [...frames.values()]) {
    entry.frame.hidden = true;
    entry.frame.removeAttribute('id');
    // Backend pages can contain private data. Only public UI demos are cached.
    if (Object.keys(backendViews).some((name) => entry.key === viewUrl(name)))
      discard(entry);
  }
  setBusy(true);
  const entry = frames.get(url) || createFrame(url, url);
  frame = entry.frame;
  frame.id = 'preview';
  frame.title = isUi ? 'WorkerKit 组件预览' : 'WorkerKit 后端展示';
  delete frame.dataset.preloadState;
  frame.removeAttribute('style');
  frame.removeAttribute('aria-hidden');
  frame.hidden = false;
  if (entry.loaded) setBusy(false);
  scheduleWarm();
}
categorySelect.onchange = () => selectView(lastView[categorySelect.value]);
const tabs = [...document.querySelectorAll('[data-view]')].filter(
  (button) => !button.hidden,
);
for (const button of tabs) {
  const view = button.dataset.view;
  if (frontendViews.includes(view)) {
    const marker = document.createElement('span');
    marker.className = 'preload-indicator';
    marker.setAttribute('aria-hidden', 'true');
    button.append(marker);
    const description = document.createElement('span');
    description.id = 'preview-status-' + button.dataset.view;
    description.hidden = true;
    button.after(description);
    button.setAttribute('aria-describedby', description.id);
  } else button.title = button.textContent + ' · 按需打开，不预加载';
  button.onpointerenter = button.onfocus = () =>
    prioritizeView(button.dataset.view);
  button.onpointerleave = button.onblur = () => clearTimeout(intentTimer);
  button.onclick = () => selectView(button.dataset.view);
  button.onkeydown = (e) => {
    const siblings = tabs.filter(
      (tab) => !tab.hidden && tab.parentElement === button.parentElement,
    );
    const i = siblings.indexOf(button);
    const next =
      e.key === 'ArrowRight'
        ? (i + 1) % siblings.length
        : e.key === 'ArrowLeft'
          ? (i + siblings.length - 1) % siblings.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? siblings.length - 1
              : -1;
    if (next >= 0) {
      e.preventDefault();
      siblings[next].focus();
      selectView(siblings[next].dataset.view);
    }
  };
}
for (const mode of ['desktop', 'mobile'])
  document.querySelector('#' + mode).onclick = () => {
    mobile = mode === 'mobile';
    for (const entry of frames.values())
      entry.frame.classList.toggle('mobile', mobile);
    for (const m of ['desktop', 'mobile'])
      document
        .querySelector('#' + m)
        .setAttribute('aria-pressed', String(mode === m));
  };
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') stopWarm();
  else scheduleWarm();
  updateTabStates();
});
navigator.connection?.addEventListener?.('change', () => {
  if (
    navigator.connection.saveData ||
    ['slow-2g', '2g'].includes(navigator.connection.effectiveType)
  )
    stopWarm();
  else scheduleWarm();
  updateTabStates();
});
// The selector owns the active view; a late iframe load must not undo a new selection.
updateTabStates();
selectView(active);
