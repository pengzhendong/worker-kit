import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar, Button, Drawer, Dropdown, Flex, Grid, Layout, Menu, Space, Tooltip, Typography, theme } from 'antd';
import { useWorkerKitTheme } from './provider';
import { workerKitLayout as ui } from './design';
import { IconBox } from './icon';
import { PageTitleInHeader } from './page';

export interface NavigationItem { key: string; label: string; icon?: ReactNode }

export function AdminShell({ title, brandIcon, items, userMenuItems = [], activeKey, onNavigate, username, onLogout, headerActions, pageTitleInHeader = false, children }: {
  title: string;
  brandIcon?: ReactNode;
  items: NavigationItem[];
  userMenuItems?: NavigationItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  username: string;
  onLogout: () => void | Promise<void>;
  /** Application-owned global actions; keep labels compact on narrow screens. */
  headerActions?: ReactNode;
  /** Render one compact page heading in the fixed header; PageHeader keeps description/actions. */
  pageTitleInHeader?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const contentRef = useRef<HTMLElement>(null);
  useEffect(() => { contentRef.current?.scrollTo({ top: 0, left: 0 }); }, [activeKey]);
  const screens = Grid.useBreakpoint();
  const { token } = theme.useToken();
  const { dark, toggle } = useWorkerKitTheme();
  useEffect(() => { setUserMenuOpen(false); setOpen(false); }, [screens.lg, activeKey]);
  function navigate(key: string) { onNavigate(key); setUserMenuOpen(false); setOpen(false); }
  const menu = <Menu items={items.map((item) => ({
    key: item.key, type: 'item' as const,
    icon: item.icon ? <IconBox>{item.icon}</IconBox> : undefined,
    label: <span style={{ display: 'block', lineHeight: '20px' }}>{item.label}</span>,
  }))} selectedKeys={[activeKey]} onClick={({ key }) => navigate(key)}
    styles={{ root: { paddingInline: 10 }, item: { display: 'flex', alignItems: 'center', height: ui.navigationHeight, marginBlock: 5 }, itemContent: { marginInlineStart: ui.iconGap, lineHeight: '20px' } }}
    style={{ borderInlineEnd: 0 }} />;
  const themeLabel = dark ? '切换到浅色模式' : '切换到深色模式';
  const themeIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
    {dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.93 4.93l1.42 1.42 M17.65 17.65l1.42 1.42 M4.93 19.07l1.42-1.42 M17.65 6.35l1.42-1.42" /></> : <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />}
  </svg>;
  const brand = <Space size={10} style={{ height: 80, padding: '0 24px' }}>{brandIcon ?? <span style={{ width: 30, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: token.colorPrimary, color: '#fff', fontWeight: 800, fontSize: 20 }}>{title.slice(0, 1).toUpperCase()}</span>}<Typography.Title level={4} style={{ margin: 0, letterSpacing: '-.5px' }}>{title}</Typography.Title></Space>;
  const logoutIcon = <IconBox><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4H4v16h5 M14 8l4 4-4 4 M9 12h12" /></svg></IconBox>;
  const avatar = <Avatar size={ui.avatarSize} style={{ flexShrink: 0, background: token.colorPrimaryBg, color: token.colorPrimaryText, fontSize: 13, fontWeight: 600 }}>{username.slice(0, 1).toUpperCase()}</Avatar>;
  const account = <div data-workerkit-region="account" style={{ flexShrink: 0, padding: 12, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
    <Dropdown trigger={['click']} placement="topLeft" open={userMenuOpen} onOpenChange={setUserMenuOpen} autoFocus
      styles={{ root: { width: ui.sidebarWidth - 24, maxWidth: 'calc(100vw - 24px)' } }}
      menu={{ selectable: true, selectedKeys: [activeKey], style: { boxShadow: 'none', padding: 0 }, items: [
        ...userMenuItems.map((item) => ({ key: item.key, label: item.label, icon: item.icon ? <IconBox>{item.icon}</IconBox> : undefined })),
        ...(userMenuItems.length ? [{ type: 'divider' as const }] : []),
        { key: 'workerkit:logout', label: '退出登录', icon: logoutIcon, disabled: loggingOut },
      ], onClick: async ({ key }) => {
        setUserMenuOpen(false);
        if (key !== 'workerkit:logout') { navigate(key); return; }
        setLoggingOut(true);
        try { await onLogout(); } finally { setLoggingOut(false); }
      } }}
      popupRender={(menu) => <div style={{ padding: 6, background: token.colorBgElevated, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 12, boxShadow: token.boxShadowSecondary }}>
        <Flex align="center" gap={10} style={{ padding: '10px 8px 12px', marginBottom: 4, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>{avatar}<div style={{ minWidth: 0 }}><Typography.Text strong ellipsis style={{ display: 'block' }}>{username}</Typography.Text><Typography.Text type="secondary" style={{ fontSize: 12 }}>当前登录</Typography.Text></div></Flex>{menu}
      </div>}>
      <Button type="text" block aria-label={`用户菜单，${username}`} aria-haspopup="menu" aria-expanded={userMenuOpen} loading={loggingOut}
        style={{ height: ui.accountHeight, padding: '8px 10px', textAlign: 'start', lineHeight: 'normal' }}>
        <Flex align="center" gap={10} style={{ width: '100%', minWidth: 0 }}>{avatar}<Typography.Text ellipsis style={{ flex: 1, textAlign: 'start' }}>{username}</Typography.Text><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, color: token.colorTextSecondary }}><path d="m8 9 4-4 4 4 M8 15l4 4 4-4" /></svg></Flex>
      </Button>
    </Dropdown>
  </div>;
  const navigation = <div data-workerkit-region="sidebar-navigation" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain' }}>{menu}</div>;
  return <Layout data-workerkit-shell style={{ height: '100dvh', minHeight: 0, overflow: 'hidden', background: token.colorBgLayout }}>
    {screens.lg ? <Layout.Sider data-workerkit-region="sidebar" width={ui.sidebarWidth} style={{ height: '100%', overflow: 'hidden', background: token.colorBgContainer, borderInlineEnd: `1px solid ${token.colorBorderSecondary}` }}><Flex vertical style={{ height: '100%' }}><div style={{ flexShrink: 0 }}>{brand}<Typography.Text type="secondary" style={{ display: 'block', margin: '8px 24px 14px', fontSize: 11, letterSpacing: 2 }}>应用管理</Typography.Text></div>{navigation}{account}</Flex></Layout.Sider>
      : <Drawer title={title} placement="left" open={open} onClose={() => { setOpen(false); setUserMenuOpen(false); }} styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', minHeight: 0 } }}>{navigation}{account}</Drawer>}
    <Layout style={{ height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
      <Layout.Header data-workerkit-region="header" style={{ height: ui.headerHeight, lineHeight: 'normal', flexShrink: 0, paddingInline: screens.md ? ui.pagePadding : ui.mobilePagePadding, background: token.colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Flex align="center" gap={8}>{!screens.lg && <Button onClick={() => setOpen(true)} aria-label="打开导航">菜单</Button>}<Typography.Text strong role={pageTitleInHeader ? 'heading' : undefined} aria-level={pageTitleInHeader ? 1 : undefined}>{[...items, ...userMenuItems].find((item) => item.key === activeKey)?.label ?? title}</Typography.Text></Flex>
        <Flex data-workerkit-header-actions align="center" gap={8} style={{ minWidth: 0 }}>{headerActions}<Tooltip title={themeLabel}><Button type="text" shape="circle" icon={themeIcon} onClick={toggle} aria-label={themeLabel} aria-pressed={dark} /></Tooltip></Flex>
      </Layout.Header>
      <Layout.Content ref={contentRef} data-workerkit-region="content" style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'auto', overscrollBehavior: 'contain', scrollbarGutter: 'stable' }}>
        <div style={{ boxSizing: 'border-box', padding: screens.md ? ui.pagePadding : ui.mobilePagePadding, width: '100%', maxWidth: ui.contentMaxWidth, marginInline: 'auto' }}><PageTitleInHeader.Provider value={pageTitleInHeader}>{children}</PageTitleInHeader.Provider></div>
      </Layout.Content>
    </Layout>
  </Layout>;
}
