import { useRef, useState } from 'react';
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
  const footer = useRef<HTMLDivElement>(null);
  const [menuWidth, setMenuWidth] = useState<number>();
  return <Flex ref={footer} vertical={compact} align="center" gap={4} className="wk-pro-sidebar-footer">
    <Dropdown trigger={['click']} placement={compact ? 'rightBottom' : 'topLeft'} menu={menu}
      align={compact ? undefined : { offset: [0, -8] }}
      onOpenChange={open => {
        if (open) setMenuWidth(footer.current?.getBoundingClientRect().width);
      }}
      classNames={{ root: 'wk-pro-account-popup' }}
      styles={{ root: { width: compact ? 200 : menuWidth, maxWidth: 'calc(100vw - 24px)' } }}>
      <Button type="text" icon={<UserOutlined />} aria-label="账户菜单" loading={loading}
        className={compact ? undefined : 'wk-pro-sidebar-account'}>
        {!compact && <span>{username}</span>}
      </Button>
    </Dropdown>
    <WorkerKitThemeToggle />
  </Flex>;
}
