// Cloudflare Node v2 exposes console.createTask as a throwing stub. Hookable
// feature-detects it, although it is optional profiling only. Keep native logging
// and hide that one unsupported method inside this Nitro bundle, without mutating
// the Worker global or the other applications' console.
export const console = new Proxy(globalThis.console, {
 get(target, key, receiver) {
  if (key === 'createTask') return undefined;
  const value = Reflect.get(target, key, receiver);
  return typeof value === 'function' ? value.bind(target) : value;
 },
});
