import { cloudflareContext } from '../context';
import { useEffect, useState } from 'react';
import { useLoaderData } from 'react-router';
import { frameworkUser } from '../../../fullstack-shared/backend';
export async function loader({ request, context }) {
  const user = await frameworkUser(request, context.get(cloudflareContext).env);
  return {
    user: user?.username || user?.name || null,
    renderedAt: new Date().toISOString(),
  };
}
export const headers = () => ({ 'Cache-Control': 'no-store' });
export const meta = () => [{ title: 'WorkerKit · React Router' }];
export default function Home() {
  const data = useLoaderData<typeof loader>();
  const [label, setLabel] = useState(''),
    [status, setStatus] = useState(''),
    [busy, setBusy] = useState(false),
    [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  async function probe(save = false) {
    setBusy(true);
    try {
      const response = await fetch('/react-router/api/verification', {
        method: save ? 'POST' : 'GET',
        ...(save
          ? {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ label }),
            }
          : {}),
      });
      const value = await response.json();
      if (!response.ok) throw Error(value.error);
      setLabel(value.label);
      setStatus(save ? '已保存到 KV' : '读取成功 · ' + value.framework);
    } catch (e) {
      setStatus(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header>
        <strong>WorkerKit · React Router</strong>
        <a href="/">方案选择</a>
      </header>
      <main>
        <h1>React Router 全栈验证</h1>
        <p className="muted">
          真正的服务端渲染、Loader 与 API 路由、Better Auth 会话与 Cloudflare
          KV。
        </p>
        <div className="grid">
          <section>
            <h2>服务端渲染</h2>
            <p>框架：React Router 8</p>
            <p>
              服务端生成时间：<code data-ssr-time>{data.renderedAt}</code>
            </p>
            <p>当前身份：{data.user || '未登录'}</p>
            <a href="/standard/?redirect=%2Freact-router%2F">
              登录 Hono + Better Auth
            </a>
          </section>
          <section>
            <h2>原生 API 与 KV</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void probe(true);
              }}
            >
              <label htmlFor="label">验证名称</label>
              <input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
                disabled={!hydrated}
              />
              <nav>
                <button
                  type="button"
                  disabled={busy || !hydrated}
                  onClick={() => probe()}
                >
                  读取 KV
                </button>
                <button type="submit" disabled={busy || !hydrated}>
                  保存 KV
                </button>
              </nav>
            </form>
            <p role="status">{status}</p>
          </section>
        </div>
        <section>
          <h2>开发业务</h2>
          <p>
            这个示例验证全栈部署链路。用户、任务、密钥、审计和 API
            中心可以复用统一业务后端。
          </p>
          <nav>
            <a className="button" href="/standard/">
              打开管理工作台
            </a>
            <a href="/docs/frameworks.html">查看接入说明</a>
            <a href="/react-router/api/verification">查看原生 API</a>
          </nav>
        </section>
      </main>
    </>
  );
}
