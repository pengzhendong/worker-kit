import { Button, Flex, Tooltip, Typography, theme } from 'antd';
import { workerKitLayout } from './design';

export function SidebarToggle({ collapsed, controls, english, onToggle }: {
  collapsed: boolean;
  controls?: string;
  english?: boolean;
  onToggle: () => void;
}) {
  const labels = english ? ['Expand sidebar', 'Collapse sidebar'] : ['展开侧栏', '收起侧栏'];
  const label = labels[collapsed ? 0 : 1];
  return <Tooltip title={label}><Button type="text" aria-label={label} aria-expanded={!collapsed}
    aria-controls={controls} onClick={onToggle}
    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 4v16" /></svg>} /></Tooltip>;
}

export function ProLayoutSidebarHeader({ title, ...toggle }: Parameters<typeof SidebarToggle>[0] & { title: string }) {
  const { token } = theme.useToken();
  return <Flex component="header" align="center" gap={8}
    style={{ position: 'sticky', top: 0, zIndex: 2, height: workerKitLayout.headerHeight, paddingInline: workerKitLayout.pagePadding,
      background: token.colorBgContainer, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
    <SidebarToggle {...toggle} />
    <Typography.Text strong role="heading" aria-level={1}>{title}</Typography.Text>
  </Flex>;
}
