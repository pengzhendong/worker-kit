import { LogoutOutlined } from '@ant-design/icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Grid, Typography, type MenuProps } from 'antd';
import { ProLayout } from '@ant-design/pro-components';
import { useWorkerKitProLayout } from './pro-layout';
import { WorkerKitProLayoutFooter } from './pro-layout-footer';
import { ProLayoutSidebarHeader } from './sidebar-toggle';
import { PageTitleInHeader } from './page';

export type ConsoleNavigationItem = { key: string; label: string; icon?: ReactNode };

export function WorkerKitConsoleLayout({
  name, logo, pageTitle, activeKey, items, username, accountItems, onAccountAction,
  sidebarStorageKey, onNavigate, english = false, signingOut, children,
}: {
  name: string;
  logo: ReactNode;
  pageTitle: string;
  activeKey: string;
  items: ConsoleNavigationItem[];
  username: string;
  accountItems: MenuProps['items'];
  onAccountAction: (key: string) => void;
  sidebarStorageKey: string;
  onNavigate?: (key: string) => void;
  english?: boolean;
  signingOut?: boolean;
  children: ReactNode;
}) {
  const layout = useWorkerKitProLayout();
  const mobile = Grid.useBreakpoint().md === false;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(sidebarStorageKey) === 'true'; }
    catch { return false; }
  });
  useEffect(() => { setDrawerOpen(false); }, [activeKey, mobile]);
  function collapse(value: boolean) {
    if (mobile) { setDrawerOpen(!value); return; }
    setCollapsed(value);
    try { localStorage.setItem(sidebarStorageKey, String(value)); } catch {}
  }

  const accountMenuItems = accountItems?.map(item =>
    item && 'key' in item && item.key === 'logout' && (!('icon' in item) || !item.icon)
      ? { ...item, icon: <LogoutOutlined /> }
      : item,
  );

  return <ProLayout {...layout} title={name} logo={logo} layout="side" fixSiderbar fixedHeader
    className="wk-pro-continuous-header"
    logoStyle={mobile ? undefined : { height: layout.token.header.heightLayoutHeader }}
    locale={english ? 'en-US' : 'zh-CN'}
    location={{ pathname: '/' + activeKey }}
    route={{ path: '/', routes: items.map(item => ({ path: '/' + item.key, name: item.label, icon: item.icon })) }}
    menuItemRender={(item, node) => <a className="wk-pro-nav-item" href={'#' + item.path?.slice(1)}
      aria-label={item.name} aria-current={item.path === '/' + activeKey ? 'page' : undefined}
      onClick={event => {
        setDrawerOpen(false);
        if (onNavigate && item.path) { event.preventDefault(); onNavigate(item.path.slice(1)); }
      }}>{node}</a>}
    menuFooterRender={() => <WorkerKitProLayoutFooter username={username} loading={signingOut}
      compact={!mobile && collapsed} menu={{ items: accountMenuItems, onClick: ({ key }) => {
        setDrawerOpen(false);
        onAccountAction(key);
      } }} />}
    collapsed={mobile ? !drawerOpen : collapsed}
    onCollapse={collapse}
    breakpoint={false}
    collapsedButtonRender={false}
    headerContentRender={() => <Typography.Text strong role="heading" aria-level={1}>{pageTitle}</Typography.Text>}
    contentStyle={{ minWidth: 0, ...(mobile ? {} : { padding: 0 }) }}
  >
    {!mobile && <ProLayoutSidebarHeader title={pageTitle} english={english}
      collapsed={collapsed} onToggle={() => collapse(!collapsed)} />}
    <PageTitleInHeader.Provider value={true}>
      <div style={mobile ? undefined : { padding: 24 }}>{children}</div>
    </PageTitleInHeader.Provider>
  </ProLayout>;
}
