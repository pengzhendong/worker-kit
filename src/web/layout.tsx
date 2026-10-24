import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Drawer, Grid, Layout, Menu, Space, Typography, theme } from 'antd';
import { useWorkerKitTheme } from './provider';

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
  const screens = Grid.useBreakpoint();
  const { token } = theme.useToken();
  const { dark, toggle } = useWorkerKitTheme();
  const menu = <Menu items={items.map((item) => ({ ...item, type: 'item' as const }))} selectedKeys={[activeKey]} onClick={({ key }) => { onNavigate(key); setOpen(false); }} style={{ borderInlineEnd: 0 }} />;
  const brand = <Typography.Title level={4} style={{ margin: 0, padding: '26px 24px' }}>{title}</Typography.Title>;
  return <Layout style={{ minHeight: '100dvh', background: token.colorBgLayout }}>
    {screens.lg && <Layout.Sider width={224} style={{ background: token.colorBgContainer, borderInlineEnd: `1px solid ${token.colorBorderSecondary}` }}>{brand}{menu}</Layout.Sider>}
    <Drawer title={title} placement="left" open={open} onClose={() => setOpen(false)} styles={{ body: { padding: 0 } }}>{menu}</Drawer>
    <Layout>
      <Layout.Header style={{ height: 72, paddingInline: screens.md ? 32 : 16, background: token.colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Space>{!screens.lg && <Button onClick={() => setOpen(true)} aria-label="打开导航">菜单</Button>}<Typography.Text strong>{items.find((item) => item.key === activeKey)?.label ?? title}</Typography.Text></Space>
        <Space><Button type="text" onClick={toggle} aria-label="切换主题">{dark ? '浅色' : '深色'}</Button><Typography.Text>{username}</Typography.Text><Button onClick={() => void onLogout()}>退出</Button></Space>
      </Layout.Header>
      <Layout.Content style={{ padding: screens.md ? 32 : 16, width: '100%', maxWidth: 1440, marginInline: 'auto' }}>{children}</Layout.Content>
    </Layout>
  </Layout>;
}
