/** DOM lifetime and bounded frame ownership. No authentication or scheduling. */
export function createFrameStore({
  stage,
  integrated,
  isMobile,
  onLoad,
  onChange,
}) {
  const entries = new Map();
  function discard(entry) {
    entry.finish?.(false);
    entry.frame.remove();
    entries.delete(entry.key);
    onChange();
  }
  function touch(entry, limit) {
    entries.delete(entry.key);
    entries.set(entry.key, entry);
    while (entries.size > limit) discard(entries.values().next().value);
  }
  function create(key, url, background = false) {
    const element = document.createElement('iframe');
    element.title = 'WorkerKit 界面预览';
    element.classList.toggle('mobile', isMobile());
    element.hidden = true;
    const entry = {
      key,
      frame: element,
      refreshable: false,
      loaded: false,
      settled: false,
    };
    entries.set(key, entry);
    if (background) {
      element.name = integrated ? 'workerkit-preload' : '';
      element.dataset.preloadState = 'loading';
      element.hidden = false;
      element.setAttribute('aria-hidden', 'true');
      // A real offscreen viewport lets native responsive layouts initialize correctly.
      const width = Math.max(
        1,
        Math.min(stage.clientWidth - 20, isMobile() ? 390 : Infinity),
      );
      element.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;height:${Math.max(1, stage.clientHeight - 18)}px;visibility:hidden;pointer-events:none`;
    }
    element.onload = () => {
      entry.loaded = true;
      onLoad(entry);
    };
    element.src = url;
    stage.append(element);
    onChange();
    return entry;
  }
  return { entries, create, discard, touch };
}
