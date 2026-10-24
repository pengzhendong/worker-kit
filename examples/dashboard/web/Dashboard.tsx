import { lazy, Suspense, useEffect, useState } from 'react';
import { App as AntApp, Button, Card, Descriptions, Flex, Result, Spin, Tag } from 'antd';
import { AdminShell, ApiClientError, LoginPage, PageHeader } from '@pengzhendong/worker-kit/web';
import { api, formatTime, Icon, useQuery } from './data';
import type { Settings } from './data';

const OverviewPage = lazy(() => import('./OverviewPage').then((module) => ({ default: module.OverviewPage })));
const ResourcesPage = lazy(() => import('./ResourcesPage').then((module) => ({ default: module.ResourcesPage })));
const FilesPage = lazy(() => import('./FilesPage').then((module) => ({ default: module.FilesPage })));
const SettingsPage = lazy(() => import('./SettingsPage').then((module) => ({ default: module.SettingsPage })));
const AuditPage = lazy(() => import('./AuditPage').then((module) => ({ default: module.AuditPage })));
const ComponentsPage = lazy(() => import('./ComponentsPage').then((module) => ({ default: module.ComponentsPage })));
type Session = { user: string; expiresAt: number };
const pages = [
  { key: 'overview', label: '工作台' }, { key: 'resources', label: '资源管理' },
  { key: 'files', label: '文件管理' }, { key: 'settings', label: '系统设置' },
  { key: 'audit', label: '操作日志' }, { key: 'components', label: '组件与交互' }, { key: 'account', label: '当前账户' },
];
function getPage() { const value = window.location.hash.slice(1); return pages.some((page) => page.key === value) ? value : 'overview'; }
const fallbackSettings: Settings = { siteName: 'WorkerKit', description: '你的应用工作台', contactEmail: '', pageSize: 20, showWelcome: true };

function Console({ session, onLogout }: { session: Session; onLogout: () => Promise<void> }) {
  const [page, setPage] = useState(getPage); const [savedSettings, setSavedSettings] = useState<Settings>();
  const { data } = useQuery<{ values: Settings }>('/api/admin/settings');
  const settings = savedSettings ?? data?.values ?? fallbackSettings;
  useEffect(() => { const change = () => setPage(getPage()); window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []);
  useEffect(() => { document.title = `${pages.find((entry) => entry.key === page)?.label ?? '工作台'} · ${settings.siteName}`; }, [page, settings.siteName]);
  function navigate(next: string) { setPage(next); window.location.hash = next; }
  return <AdminShell title={settings.siteName} username={session.user} activeKey={page} onNavigate={navigate}
    items={pages.filter((entry) => !['settings', 'account'].includes(entry.key)).map((entry) => ({ ...entry, icon: <Icon name={entry.key} /> }))}
    userMenuItems={['account', 'settings'].map((key) => ({ ...pages.find((entry) => entry.key === key)!, icon: <Icon name={key} /> }))} onLogout={onLogout}>
    <Suspense fallback={<Flex justify="center" style={{ padding: 80 }}><Spin size="large" /></Flex>}>
      {page === 'overview' && <OverviewPage onNavigate={navigate} showWelcome={settings.showWelcome} />}
      {page === 'resources' && <ResourcesPage defaultPageSize={settings.pageSize} />}
      {page === 'files' && <FilesPage />}
      {page === 'settings' && <SettingsPage onSaved={setSavedSettings} />}
      {page === 'audit' && <AuditPage />}
      {page === 'components' && <ComponentsPage />}
      {page === 'account' && <><PageHeader title="当前账户" description="查看当前管理员身份与会话信息。" /><Card title="账户信息" style={{ maxWidth: 820 }}><Descriptions column={1} items={[
        { key: 'name', label: '用户名', children: session.user }, { key: 'role', label: '访问权限', children: <Tag color="blue">管理员</Tag> },
        { key: 'expiry', label: '会话到期时间', children: formatTime(new Date(session.expiresAt * 1000).toISOString()) },
      ]} /><Button style={{ marginTop: 24 }} onClick={() => void onLogout()}>退出当前登录</Button></Card></>}
    </Suspense>
  </AdminShell>;
}

function Dashboard() {
  const [session, setSession] = useState<Session | null>(); const [error, setError] = useState(''); const { message } = AntApp.useApp();
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
    if (!session) return;
    const timer = setTimeout(() => { setSession(null); void message.info('登录已过期，请重新登录'); }, Math.max(0, session.expiresAt * 1000 - Date.now()));
    return () => clearTimeout(timer);
  }, [session, message]);
  async function logout() {
    try { await api<void>('/api/auth/logout', { method: 'POST' }); setSession(null); setError(''); }
    catch (failure) { void message.error(failure instanceof Error ? failure.message : '退出失败'); }
  }
  if (error) return <Result status="warning" title="后台暂时无法访问" subTitle={error} extra={<Button onClick={() => void loadSession()}>重试</Button>} />;
  if (session === undefined) return <Flex align="center" justify="center" style={{ minHeight: '100dvh' }}><Spin size="large" /></Flex>;
  if (!session) return <LoginPage title="WorkerKit" description="登录管理你的应用、文件与配置" onLogin={async (values) => {
    setSession(await api<Session>('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }));
  }} />;
  return <Console session={session} onLogout={logout} />;
}

export default Dashboard;
