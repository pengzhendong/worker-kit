import { MoonOutlined, SunOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Dropdown, Flex } from 'antd';
import type { MenuProps } from 'antd';
import { useWorkerKitTheme } from './provider';

export function WorkerKitProLayoutFooter({ username, menu, compact = false, loading = false }: {
  username: string;
  menu: MenuProps;
  compact?: boolean;
  loading?: boolean;
}) {
  const { dark, toggle } = useWorkerKitTheme();
  return <Flex vertical={compact} align="center" gap={4} className="wk-pro-sidebar-footer">
    <Dropdown trigger={['click']} placement="topLeft" menu={menu}>
      <Button type="text" icon={<UserOutlined />} aria-label="账户菜单" loading={loading}
        className={compact ? undefined : 'wk-pro-sidebar-account'}>
        {!compact && <span>{username}</span>}
      </Button>
    </Dropdown>
    <Button type="text" icon={dark ? <SunOutlined /> : <MoonOutlined />}
      aria-label={dark ? '浅色模式' : '深色模式'} onClick={toggle} />
  </Flex>;
}
