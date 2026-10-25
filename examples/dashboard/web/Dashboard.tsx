import { lazy, Suspense, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { App as AntApp, Button, Card, Descriptions, Flex, Result, Spin, Tag } from 'antd';
import { AdminShell, ApiClientError, AppErrorBoundary, LoginPage, ModuleAccessProvider, PageHeader, useModuleAccess } from '@pengzhendong/worker-kit/web';
import { api, authApi, formatTime, Icon, sessionScope, useQuery } from './data';
import type { Settings } from './data';
import { defineModules, getModuleNavigation, resolveModule } from '@pengzhendong/worker-kit/modules';
import type { AccessSnapshot } from '@pengzhendong/worker-kit/modules';
import { dashboardModules } from '../modules';
import type { DashboardModuleId } from '../modules';

const OverviewPage = lazy(() => import('./OverviewPage').then((module) => ({ default: module.OverviewPage })));
const ResourcesPage = lazy(() => import('./ResourcesPage').then((module) => ({ default: module.ResourcesPage })));
const FilesPage = lazy(() => import('./FilesPage').then((module) => ({ default: module.FilesPage })));
const SettingsPage = lazy(() => import('./SettingsPage').then((module) => ({ default: module.SettingsPage })));
const AuditPage = lazy(() => import('./AuditPage').then((module) => ({ default: module.AuditPage })));
const ApiCenterPage = lazy(() => import('./ApiCenterPage').then((module) => ({ default: module.ApiCenterPage })));
const RuntimeStatusPage = lazy(() => import('@pengzhendong/worker-kit/web/runtime-status').then(({ RuntimeStatus }) => ({ default: () => <RuntimeStatus client={api} /> })));
const ComponentsPage = lazy(() => import('./ComponentsPage').then((module) => ({ default: module.ComponentsPage })));
const ToolsPage = import.meta.env.DEV ? lazy(() => import('./ToolsPage').then((module) => ({ default: module.ToolsPage }))) : null;
type Session = { user: string; expiresAt: number };
const modules = defineModules([
  ...dashboardModules,
  ...(import.meta.env.DEV ? [{ id: 'tools', label: '开发工具', path: '/tools', icon: 'tools', navigation: { placement: 'sidebar', order: 60 }, actions: {}, developmentOnly: true } as const] : []),
]);
function getPage() {
  const path = window.location.hash.slice(1);
  // Keep existing #resources links working; new navigation uses the declared /resources path.
  return path ? path.startsWith('/') ? path : `/${path}` : '/overview';
}
const fallbackSettings: Settings = { siteName: 'WorkerKit', description: '你的应用工作台', contactEmail: '', pageSize: 20, showWelcome: true };

function Console({ session, onLogout }: { session: Session; onLogout: () => Promise<void> }) {
  const [path, setPath] = useState(getPage); const [savedSettings, setSavedSettings] = useState<Settings>();
  const { access, can, canOpen } = useModuleAccess();
  const { data } = useQuery<{ values: Settings }>(can('settings:read') ? '/api/admin/settings' : null);
  const settings = savedSettings ?? data?.values ?? fallbackSettings;
  const module = resolveModule(modules, path, access);
  useEffect(() => { const change = () => setPath(getPage()); window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []);
  useEffect(() => { document.title = `${module?.label ?? '页面不存在'} · ${settings.siteName}`; }, [module, settings.siteName]);
  function navigate(id: string) { const next = modules.find((entry) => entry.id === id); if (next) { setPath(next.path); window.location.hash = next.path; } }
  const navigation = (placement: 'sidebar' | 'user') => getModuleNavigation(modules, placement, access).map((entry) => ({ key: entry.id, label: entry.label, icon: <Icon name={entry.icon ?? entry.id} /> }));
  // Exhaustive app-owned page composition; shared metadata imports neither React nor server handlers.
  const pages: Record<DashboardModuleId, () => ReactNode> = {
    overview: () => <OverviewPage onNavigate={navigate} showWelcome={settings.showWelcome} />,
    resources: () => <ResourcesPage defaultPageSize={settings.pageSize} />,
    files: () => <FilesPage />,
    settings: () => <SettingsPage onSaved={setSavedSettings} />,
    audit: () => <AuditPage />,
    runtime: () => <RuntimeStatusPage />,
    api: () => <ApiCenterPage />,
    components: () => <ComponentsPage />,
    account: () => <><PageHeader title="当前账户" description="查看当前管理员身份与会话信息。" /><Card title="账户信息" style={{ maxWidth: 820 }}><Descriptions column={1} items={[
      { key: 'name', label: '用户名', children: session.user }, { key: 'role', label: '访问权限', children: <Tag color="blue">管理员</Tag> },
      { key: 'expiry', label: '会话到期时间', children: formatTime(new Date(session.expiresAt * 1000).toISOString()) },
    ]} /><Button style={{ marginTop: 24 }} onClick={() => void onLogout()}>退出当前登录</Button></Card></>,
  };
  const renderers: Record<string, (() => ReactNode) | undefined> = { ...pages, ...(ToolsPage ? { tools: () => <ToolsPage onNavigate={navigate} /> } : {}) };
  const forbidden = module && !canOpen(module.id);
  return <AdminShell title={settings.siteName} username={session.user} activeKey={module?.id ?? path} onNavigate={navigate}
    items={navigation('sidebar')} userMenuItems={navigation('user')} onLogout={onLogout}>
    {!module ? <Result status="404" title="页面不存在" subTitle="该页面不存在或模块尚未启用。" />
      : forbidden ? <Result status="403" title="无权访问此页面" subTitle="当前账户没有此模块的访问权限。" />
      : <AppErrorBoundary resetKeys={[path, sessionScope.version]}><Suspense fallback={<Flex justify="center" style={{ padding: 80 }}><Spin size="large" /></Flex>}>{renderers[module.id]?.()}</Suspense></AppErrorBoundary>}
  </AdminShell>;
}

function AuthorizedConsole({ session, onLogout }: { session: Session; onLogout: () => Promise<void> }) {
  const { data, error, loading, refresh } = useQuery<AccessSnapshot>('/api/admin/access');
  if (loading) return <Flex align="center" justify="center" style={{ minHeight: '100dvh' }}><Spin size="large" /></Flex>;
  if (error || !data || !Array.isArray(data.permissions) || data.permissions.some((permission) => typeof permission !== 'string')) {
    return <Result status="warning" title="无法加载访问权限" subTitle={error || '权限信息无效'} extra={<Button onClick={refresh}>重试</Button>} />;
  }
  return <ModuleAccessProvider modules={modules} access={{ authenticated: true, permissions: data.permissions, development: import.meta.env.DEV }}><Console session={session} onLogout={onLogout} /></ModuleAccessProvider>;
}

function Dashboard() {
  const [session, setSession] = useState<Session | null>(); const [error, setError] = useState(''); const [epoch, setEpoch] = useState(sessionScope.version); const { message, notification } = AntApp.useApp();
  useEffect(() => sessionScope.subscribe((event) => {
    setEpoch(event.version);
    message.destroy(); notification.destroy();
    if (event.reason === 'expired') { setSession(null); setError(''); void message.info('登录已过期，请重新登录'); }
  }), [message, notification]);
  function acceptSession(next: Session) { sessionScope.reset('signed-in'); setSession(next); }
  async function loadSession(signal?: AbortSignal) {
    setError('');
    try { const next = await authApi<Session>('/api/auth/session', { signal }); if (!signal?.aborted) acceptSession(next); }
    catch (failure) {
      if (signal?.aborted) return;
      if (failure instanceof ApiClientError && failure.status === 401) { sessionScope.reset('signed-out'); setSession(null); }
      else setError(failure instanceof Error ? failure.message : '加载失败');
    }
  }
  useEffect(() => { const controller = new AbortController(); void loadSession(controller.signal); return () => controller.abort(); }, []);
  useEffect(() => {
    if (!session) return;
    const observedVersion = sessionScope.version;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const remaining = session.expiresAt * 1000 - Date.now();
      if (remaining <= 0) sessionScope.expire(observedVersion);
      else timer = setTimeout(check, Math.min(remaining, 2_147_483_647));
    };
    check(); return () => clearTimeout(timer);
  }, [session]);
  async function logout() {
    try { await authApi<void>('/api/auth/logout', { method: 'POST' }); sessionScope.reset('signed-out'); setSession(null); setError(''); }
    catch (failure) { void message.error(failure instanceof Error ? failure.message : '退出失败'); }
  }
  if (error) return <Result status="warning" title="后台暂时无法访问" subTitle={error} extra={<Button onClick={() => void loadSession()}>重试</Button>} />;
  if (session === undefined) return <Flex align="center" justify="center" style={{ minHeight: '100dvh' }}><Spin size="large" /></Flex>;
  if (!session) return <LoginPage title="WorkerKit" description="登录管理你的应用、文件与配置" onLogin={async (values, signal) => {
    acceptSession(await authApi<Session>('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values), signal }));
  }} />;
  return <AuthorizedConsole key={epoch} session={session} onLogout={logout} />;
}

export default Dashboard;
