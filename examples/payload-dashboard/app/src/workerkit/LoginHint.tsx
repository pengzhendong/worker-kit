import { getCloudflareContext } from '@opennextjs/cloudflare'
import { demoPassword, demoUsername, isLocalPreview } from './demo-login'
export async function DemoLoginHint() {
  const { env } = await getCloudflareContext({ async: true })
  if (!isLocalPreview(env.WORKERKIT_ORIGIN) && !('WORKERKIT_DEMO' in env && env.WORKERKIT_DEMO === '1')) return null
  return <p style={{ textAlign: 'center', marginBottom: 24 }}>演示账号：<code>{demoUsername}</code> · 密码：<code>{demoPassword}</code></p>
}
