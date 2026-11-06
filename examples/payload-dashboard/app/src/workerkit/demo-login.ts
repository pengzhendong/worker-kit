// Public credentials for the local comparison only. Authentication remains native.
export const demoUsername = 'admin'
export const demoPassword = 'password'
export const demoEmail = 'admin@workerkit.test'
export function isLocalPreview(origin: string) {
  const host = new URL(origin).hostname
  return host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '[::1]'
}
