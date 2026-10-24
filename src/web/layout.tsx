import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Drawer, Flex, Grid, Layout, Menu, Space, Tooltip, Typography, theme } from 'antd';
import { useWorkerKitTheme } from './provider';
import { workerKitLayout as ui } from './design';
import { IconBox } from './icon';

export interface NavigationItem { key: string; label: string; icon?: ReactNode }

export function AdminShell({ title, items, activeKey, onNavigate, username, onLogout, children }: {
  title: string;
  items: NavigationItem[];
  activeKey: string;
  onNavigate: (key: string) => void;
  username: string;
  onLogout: () => void | Promise<void>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);
  useEffect(() => { contentRef.current?.scrollTo({ top: 0, left: 0 }); }, [activeKey]);
  const screens = Grid.useBreakpoint();
  const { token } = theme.useToken();
  const { dark, toggle } = useWorkerKitTheme();
  const menu = <Menu items={items.map((item) => ({
    key: item.key, type: 'item' as const,
    icon: item.icon ? <IconBox>{item.icon}</IconBox> : undefined,
    label: <span style={{ display: 'block', lineHeight: '20px' }}>{item.label}</span>,
  }))} selectedKeys={[activeKey]} onClick={({ key }) => { onNavigate(key); setOpen(false); }}
    styles={{ root: { paddingInline: 10 }, item: { display: 'flex', alignItems: 'center', height: ui.navigationHeight, marginBlock: 5 }, itemContent: { marginInlineStart: ui.iconGap, lineHeight: '20px' } }}
    style={{ borderInlineEnd: 0 }} />;
  const themeLabel = dark ? '切换到浅色模式' : '切换到深色模式';
  const themeIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
    {dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.93 4.93l1.42 1.42 M17.65 17.65l1.42 1.42 M4.93 19.07l1.42-1.42 M17.65 6.35l1.42-1.42" /></> : <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />}
  </svg>;
  const brand = <Space size={10} style={{ height: 80, padding: '0 24px' }}><span style={{ width: 30, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: token.colorPrimary, color: '#fff', fontWeight: 800, fontSize: 20 }}>W</span><Typography.Title level={4} style={{ margin: 0, letterSpacing: '-.5px' }}>{title}</Typography.Title></Space>;
  return <Layout data-workerkit-shell style={{ height: '100dvh', minHeight: 0, overflow: 'hidden', background: token.colorBgLayout }}>
    {screens.lg && <Layout.Sider data-workerkit-region="sidebar" width={ui.sidebarWidth} style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', background: token.colorBgContainer, borderInlineEnd: `1px solid ${token.colorBorderSecondary}` }}>{brand}<Typography.Text type="secondary" style={{ display: 'block', margin: '8px 24px 14px', fontSize: 11, letterSpacing: 2 }}>应用管理</Typography.Text>{menu}<div style={{ padding: 24, marginTop: 36 }}><Typography.Text type="secondary" style={{ fontSize: 12 }}>当前应用工作空间</Typography.Text></div></Layout.Sider>}
    <Drawer title={title} placement="left" open={open} onClose={() => setOpen(false)} styles={{ body: { padding: 0 } }}>{menu}</Drawer>
    <Layout style={{ height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
      <Layout.Header data-workerkit-region="header" style={{ height: ui.headerHeight, lineHeight: 'normal', flexShrink: 0, paddingInline: screens.md ? ui.pagePadding : ui.mobilePagePadding, background: token.colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Flex align="center" gap={8}>{!screens.lg && <Button onClick={() => setOpen(true)} aria-label="打开导航">菜单</Button>}<Typography.Text strong>{items.find((item) => item.key === activeKey)?.label ?? title}</Typography.Text></Flex>
        <Flex align="center" gap={8} role="group" aria-label="账户操作"><Tooltip title={themeLabel}><Button type="text" shape="circle" icon={themeIcon} onClick={toggle} aria-label={themeLabel} aria-pressed={dark} /></Tooltip><Typography.Text>{username}</Typography.Text><Button onClick={() => void onLogout()}>退出</Button></Flex>
      </Layout.Header>
      <Layout.Content ref={contentRef} data-workerkit-region="content" style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'auto', overscrollBehavior: 'contain', scrollbarGutter: 'stable' }}>
        <div style={{ boxSizing: 'border-box', padding: screens.md ? ui.pagePadding : ui.mobilePagePadding, width: '100%', maxWidth: ui.contentMaxWidth, marginInline: 'auto' }}>{children}</div>
      </Layout.Content>
    </Layout>
  </Layout>;
}
