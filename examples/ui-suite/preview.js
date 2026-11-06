import { frontendViews, frontendTitles, preloadLabels } from './catalog.js';

const views = { ...frontendTitles };
const integrated = document.body.dataset.workerkitMode === 'integrated';
if (integrated) {
  views.payload = 'Payload 原生后台 · 共享登录与真实 D1/R2';
  document.querySelector('[data-view="payload"]').hidden = false;
  if (document.body.dataset.sonicOrigin) {
    views.sonic = 'SonicJS 原生管理界面 · 独立登录与数据，同一个 Worker';
    document.querySelector('[data-view="sonic"]').hidden = false;
  }
}
const params = new URLSearchParams(location.search);
const backendControl = document.querySelector('#backend');
backendControl.hidden = !integrated;
let backend = params.get('backend') === 'sonic' ? 'sonic' : 'payload';
const backendOrigin = () =>
  backend === 'sonic' ? document.body.dataset.sonicOrigin : location.origin;
const viewUrl = (view) =>
  view === 'payload'
    ? new URL('/admin/', location.origin).href
    : view === 'sonic'
      ? new URL('/admin', document.body.dataset.sonicOrigin).href
      : integrated
        ? new URL(
            view === 'docs' ? '/docs/workspace.html' : `/${view}/workspace`,
            backendOrigin(),
          ).href
        : `/${view}/`;
const stage = document.querySelector('.stage'),
  loading = document.querySelector('#loading');
const frames = new Map();
let frame,
  selection = 0,
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
if (!views[active]) active = 'nuxt';
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
    if (!button.querySelector('.preload-indicator')) continue;
    const entry = frames.get(viewUrl(view));
    const status = entry
      ? entry.loaded && (!integrated || entry.prepared || entry.refreshable)
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
    button.title = views[view] + ' · ' + label;
    document.getElementById('preview-status-' + view).textContent = label;
  }
}
const discard = (entry) => {
  entry.finish?.(false);
  entry.frame.remove();
  frames.delete(entry.key);
  updateTabStates();
};
// Warm one frontend at a time, after foreground rendering/data have settled.
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
  if (warming !== entry || !entry.loaded || (integrated && !entry.refreshable))
    return;
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
    stage.getAttribute('aria-busy') === 'true' ||
    (integrated && !current.settled)
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
    warming = createFrame(url, url, true);
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
function createFrame(key, url, background = false) {
  const element = document.createElement('iframe');
  element.title = 'WorkerKit 界面预览';
  element.classList.toggle('mobile', mobile);
  element.hidden = true;
  const entry = {
    key,
    frame: element,
    refreshable: false,
    loaded: false,
    settled: false,
  };
  frames.set(key, entry);
  if (background) {
    element.name = integrated ? 'workerkit-preload' : '';
    element.dataset.preloadState = 'loading';
    element.hidden = false;
    element.setAttribute('aria-hidden', 'true');
    // A real offscreen viewport lets native responsive layouts initialize correctly.
    const width = Math.max(
      1,
      Math.min(stage.clientWidth - 20, mobile ? 390 : Infinity),
    );
    element.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;height:${Math.max(1, stage.clientHeight - 18)}px;visibility:hidden;pointer-events:none`;
  }
  element.onload = () => {
    entry.loaded = true;
    if (frame === element && !element.hidden) setBusy(false);
    progressWarm(entry);
    updateTabStates();
    scheduleWarm();
  };
  element.src = url;
  stage.append(element);
  updateTabStates();
  return entry;
}
window.addEventListener('message', (event) => {
  const entry = [...frames.values()].find(
    (item) =>
      item.frame.contentWindow === event.source &&
      new URL(item.key, location.href).origin === event.origin,
  );
  if (!entry) return;
  if (event.data?.type === 'workerkit:preview-ready') {
    entry.refreshable = event.data.ready === true;
    if (entry.refreshable) entry.prepared = true;
    progressWarm(entry);
    if (entry.refreshable && entry.finish)
      entry.frame.contentWindow.postMessage(
        { type: 'workerkit:preview-refresh', id: entry.request },
        event.origin,
      );
    updateTabStates();
  }
  if (
    event.data?.type === 'workerkit:preview-settled' &&
    (event.data.id ?? undefined) === entry.request
  ) {
    entry.settled = true;
    scheduleWarm();
  }
  if (
    ['workerkit:preview-cleared', 'workerkit:preview-refreshed'].includes(
      event.data?.type,
    ) &&
    event.data.id === entry.request
  ) {
    entry.frame.name = '';
    if (event.data.public) entry.settled = true;
    entry.finish?.(true);
  }
});
async function selectView(view, nextBackend = backend) {
  const previousBackend = backend;
  backend = nextBackend;
  active = view;
  if (view === 'payload' || view === 'sonic') backend = view;
  backendControl.value = backend;
  for (const button of document.querySelectorAll('[data-view]')) {
    button.setAttribute('aria-selected', String(button.dataset.view === view));
    button.tabIndex = button.dataset.view === view ? 0 : -1;
  }
  document
    .querySelector(`[data-view="${view}"]`)
    .scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const url = viewUrl(view);
  document.querySelector('#open').href = url;
  history.replaceState(
    null,
    '',
    `?view=${view}${integrated ? '&backend=' + backend : ''}${params.get('preload') === 'off' ? '&preload=off' : ''}`,
  );
  if (frame?.getAttribute('src') === url && !frame.hidden) return;
  const ticket = ++selection;
  stopWarm(url);
  setBusy(true);
  // CMS login/logout and backend changes discard mounted business data.
  if (previousBackend !== backend || ['payload', 'sonic'].includes(view)) {
    attempted.clear();
    for (const entry of [...frames.values()]) discard(entry);
  }
  for (const entry of [...frames.values()]) {
    entry.finish?.(false);
    entry.frame.hidden = true;
    entry.frame.removeAttribute('id');
    if (
      ['/admin/', '/admin'].includes(new URL(entry.key, location.href).pathname)
    )
      discard(entry);
  }
  let entry = frames.get(url),
    reused = !!entry;
  if (!entry) entry = createFrame(url, url);
  // Touch the LRU, leaving at most eight mounted apps in memory.
  frames.delete(url);
  frames.set(url, entry);
  while (frames.size > 8) discard(frames.values().next().value);
  frame = entry.frame;
  frame.id = 'preview';
  if (frame.dataset.preloadState) frame.dataset.preloadState = 'foreground';
  frame.removeAttribute('style');
  frame.removeAttribute('aria-hidden');
  entry.settled = false;
  if (reused && integrated) {
    const refreshed = await new Promise((resolve) => {
      const finish = (ok) => {
        clearTimeout(activationTimeout);
        if (entry.finish === finish) entry.finish = undefined;
        resolve(ok);
      };
      const activationTimeout = setTimeout(() => finish(false), 6000);
      entry.finish = finish;
      entry.request = crypto.randomUUID();
      frame.contentWindow.postMessage(
        { type: 'workerkit:preview-refresh', id: entry.request },
        new URL(url).origin,
      );
    });
    if (ticket !== selection) return;
    if (!refreshed) {
      discard(entry);
      entry = createFrame(url, url);
      frame = entry.frame;
      frame.id = 'preview';
    }
  }
  if (ticket !== selection) return;
  frame.hidden = false;
  if (entry.loaded) setBusy(false);
  scheduleWarm();
}
backendControl.onchange = () =>
  selectView(
    ['payload', 'sonic'].includes(active) ? backendControl.value : active,
    backendControl.value,
  );
const tabs = [...document.querySelectorAll('[data-view]')].filter(
  (button) => !button.hidden,
);
for (const button of tabs) {
  button.title = views[button.dataset.view];
  if (frontendViews.includes(button.dataset.view)) {
    const marker = document.createElement('span');
    marker.className = 'preload-indicator';
    marker.setAttribute('aria-hidden', 'true');
    button.append(marker);
    const description = document.createElement('span');
    description.id = 'preview-status-' + button.dataset.view;
    description.hidden = true;
    button.after(description);
    button.setAttribute('aria-describedby', description.id);
  } else button.title += ' · 原生页面按需打开，不预加载';
  button.onpointerenter = button.onfocus = () =>
    prioritizeView(button.dataset.view);
  button.onpointerleave = button.onblur = () => clearTimeout(intentTimer);
  button.onclick = () => selectView(button.dataset.view);
  button.onkeydown = (e) => {
    const i = tabs.indexOf(button);
    const next =
      e.key === 'ArrowRight'
        ? (i + 1) % tabs.length
        : e.key === 'ArrowLeft'
          ? (i + tabs.length - 1) % tabs.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? tabs.length - 1
              : -1;
    if (next >= 0) {
      e.preventDefault();
      tabs[next].focus();
      selectView(tabs[next].dataset.view);
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
