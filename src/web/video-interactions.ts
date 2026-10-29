/** Only the gaps beyond Video.js controls: hold-to-speed and touch swipe. */
export function bindVideoInteractions(video: HTMLVideoElement, options: {
  fullscreen: () => boolean; live: () => boolean; notice: (message: string) => void;
}) {
  const listeners = new AbortController();
  let hold: { id: number; x: number; y: number; timer: ReturnType<typeof setTimeout>; rate?: number } | null = null;
  let touch: { id: number; x: number; y: number; time: number; held?: boolean } | null = null;
  let suppressUntil = 0;
  const listen = (target: EventTarget, type: string, handler: EventListener) =>
    target.addEventListener(type, handler, { signal: listeners.signal });
  const stopHold = () => {
    if (!hold) return;
    const old = hold; hold = null; clearTimeout(old.timer);
    if (old.rate !== undefined) {
      video.playbackRate = old.rate;
      suppressUntil = performance.now() + 800;
      options.notice(`已恢复 ${old.rate} 倍速`);
    }
    if (video.hasPointerCapture(old.id)) video.releasePointerCapture(old.id);
  };
  listen(video, 'pointerdown', ((event: PointerEvent) => {
    if (event.button !== 0 || !event.isPrimary) return;
    if (event.pointerType !== 'mouse') touch = { id: event.pointerId, x: event.clientX, y: event.clientY, time: video.currentTime };
    const rect = video.getBoundingClientRect();
    if (!options.fullscreen() || video.paused || event.clientX < rect.left + rect.width / 2) return;
    stopHold();
    hold = { id: event.pointerId, x: event.clientX, y: event.clientY, timer: setTimeout(() => {
      if (!hold || video.paused || !options.fullscreen()) return stopHold();
      hold.rate = video.playbackRate; video.playbackRate = 2;
      if (touch?.id === hold.id) touch.held = true;
      options.notice('正在 2 倍速播放 · 松开恢复');
    }, 450) };
    video.setPointerCapture(event.pointerId);
  }) as EventListener);
  listen(video, 'pointermove', ((event: PointerEvent) => {
    if (hold?.id === event.pointerId && Math.hypot(event.clientX - hold.x, event.clientY - hold.y) > 16) stopHold();
  }) as EventListener);
  const finish = ((event: PointerEvent) => {
    const held = hold?.rate !== undefined;
    if (hold?.id === event.pointerId) stopHold();
    if (event.type === 'lostpointercapture') return;
    if (touch?.id !== event.pointerId) return;
    const before = touch; touch = null;
    if (event.type !== 'pointerup' || held || before.held) return;
    const dx = event.clientX - before.x, dy = event.clientY - before.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.25) return;
    suppressUntil = performance.now() + 800;
    if (!options.live() && Number.isFinite(video.duration) && video.duration > 0) {
      video.currentTime = Math.max(0, Math.min(video.duration - .1, before.time + Math.sign(dx) * 10));
      options.notice(dx > 0 ? '快进 10 秒' : '快退 10 秒');
    }
  }) as EventListener;
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(video, type, finish);
  const cancel = () => { stopHold(); touch = null; };
  for (const type of ['pause', 'ended', 'emptied']) listen(video, type, cancel);
  listen(window, 'blur', cancel);
  listen(document, 'fullscreenchange', cancel);
  listen(document, 'visibilitychange', () => { if (document.hidden) cancel(); });
  listen(video, 'contextmenu', event => { if (hold || performance.now() < suppressUntil) event.preventDefault(); });
  return {
    cancel,
    suppressClick: () => {
      if (performance.now() >= suppressUntil) return false;
      suppressUntil = 0; // Consume the synthetic release click; do not swallow the next intentional tap.
      return true;
    },
    dispose() { cancel(); listeners.abort(); },
  };
}
