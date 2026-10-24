import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Alert, App as AntApp, Button, Card, Descriptions, Flex, Result, Space, Spin, Tag, Typography } from 'antd';
import { AdminShell, ApiClientError, createApiClient, LoginPage, WorkerKitProvider } from '@pengzhendong/worker-kit/web';
import './style.css';

const api = createApiClient();
type Session = { user: string; expiresAt: number };
type Overview = { user: string; runtime: string; message: string; now: string };

function Dashboard() {
  const [session, setSession] = useState<Session | null>();
  const [error, setError] = useState('');
  const [page, setPage] = useState('overview');
  const [overview, setOverview] = useState<Overview>();
  const { message } = AntApp.useApp();
  async function loadSession(signal?: AbortSignal) {
    setError('');
    try { setSession(await api<Session>('/api/auth/session', { signal })); }
    catch (failure) {
      if (signal?.aborted) return;
      if (failure instanceof ApiClientError && failure.status === 401) setSession(null);
      else setError(failure instanceof Error ? failure.message : '加载失败');
    }
  }
  useEffect(() => { const controller = new AbortController(); void loadSession(controller.signal); return () => controller.abort(); }, []);
  useEffect(() => {
    if (!session) { setOverview(undefined); return; }
    const controller = new AbortController();
    api<Overview>('/api/admin/overview', { signal: controller.signal }).then(setOverview).catch((failure: unknown) => {
      if (controller.signal.aborted) return;
      if (failure instanceof ApiClientError && failure.status === 401) setSession(null);
      else setError(failure instanceof Error ? failure.message : '加载失败');
    });
    return () => controller.abort();
  }, [session]);
  if (!session && error) return <Result status="warning" title="后台暂时无法访问" subTitle={error} extra={<Button onClick={() => void loadSession()}>重试</Button>} />;
  if (session === undefined) return <Flex align="center" justify="center" style={{ minHeight: '100dvh' }}><Spin size="large" /></Flex>;
  if (!session) return <LoginPage title="WorkerKit" onLogin={async (values) => {
    setSession(await api<Session>('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }));
  }} />;
  return <AdminShell title="WorkerKit" username={session.user} activeKey={page} onNavigate={setPage}
    items={[{ key: 'overview', label: '应用概览' }, { key: 'about', label: '接入说明' }]}
    onLogout={async () => {
      try { await api<void>('/api/auth/logout', { method: 'POST' }); setSession(null); setError(''); }
      catch (failure) { void message.error(failure instanceof Error ? failure.message : '退出失败'); }
    }}>
    {error && <Alert type="error" title={error} style={{ marginBottom: 24 }} />}
    {page === 'overview' ? <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <div><Tag color="blue">SHARED FOUNDATIONS</Tag><Typography.Title level={2}>业务从这里开始。</Typography.Title><Typography.Paragraph type="secondary">登录、布局和请求处理来自 WorkerKit；接口与页面由当前应用定义。</Typography.Paragraph></div>
      <Card title="运行状态" extra={<Tag color="green">已登录</Tag>}>
        {overview ? <Descriptions column={1} items={[
          { key: 'runtime', label: '运行环境', children: overview.runtime },
          { key: 'user', label: '当前用户', children: overview.user },
          { key: 'time', label: '响应时间', children: new Date(overview.now).toLocaleString('zh-CN') },
          { key: 'message', label: '业务接口', children: overview.message },
        ]} /> : <Spin />}
      </Card>
    </Space> : <Card title="应用与共享库的边界"><Typography.Paragraph>通过 Git submodule 引入共享库。当前应用保留自己的路由、页面、数据库迁移、域名和资源绑定。</Typography.Paragraph><Typography.Paragraph>更新共享库提交后，在当前应用完成检查，再独立部署。</Typography.Paragraph></Card>}
  </AdminShell>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><WorkerKitProvider><Dashboard /></WorkerKitProvider></StrictMode>);
