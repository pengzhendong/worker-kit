import { UserOutlined } from '@ant-design/icons';
import { Button, Dropdown, Flex } from 'antd';
import type { MenuProps } from 'antd';
import { WorkerKitThemeToggle } from './theme-toggle';

export function WorkerKitProLayoutFooter({ username, menu, compact = false, loading = false }: {
  username: string;
  menu: MenuProps;
  compact?: boolean;
  loading?: boolean;
}) {
  return <Flex vertical={compact} align="center" gap={4} className="wk-pro-sidebar-footer">
    <Dropdown trigger={['click']} placement="topLeft" menu={menu}>
      <Button type="text" icon={<UserOutlined />} aria-label="账户菜单" loading={loading}
        className={compact ? undefined : 'wk-pro-sidebar-account'}>
        {!compact && <span>{username}</span>}
      </Button>
    </Dropdown>
    <WorkerKitThemeToggle />
  </Flex>;
}
