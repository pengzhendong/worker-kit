import type { ReactNode } from 'react';
import { Card, Flex, Statistic, Typography, theme } from 'antd';
import { workerKitLayout } from './design';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <Flex data-workerkit-page-header justify="space-between" align="start" gap={16} wrap style={{ marginBottom: workerKitLayout.pageHeaderGap }}>
    <div><Typography.Title level={2} style={{ margin: '0 0 8px', fontSize: workerKitLayout.pageTitleSize }}>{title}</Typography.Title>{description && <Typography.Text type="secondary">{description}</Typography.Text>}</div>
    {actions && <Flex gap={8} wrap>{actions}</Flex>}
  </Flex>;
}

export function StatCard({ title, value, note, icon }: { title: string; value: string | number; note?: string; icon?: ReactNode }) {
  const { token } = theme.useToken();
  return <Card style={{ height: '100%' }}><Flex justify="space-between" align="center" gap={8}><Typography.Text type="secondary">{title}</Typography.Text>{icon && <span style={{ color: token.colorPrimary, background: token.colorPrimaryBg, width: 32, height: 32, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 10 }}>{icon}</span>}</Flex><Statistic aria-label={title} value={value} styles={{ content: { fontSize: 30, fontWeight: 650, whiteSpace: 'nowrap' } }} />{note && <Typography.Text type="secondary" style={{ display: 'block', marginTop: 14, fontSize: 12 }}>{note}</Typography.Text>}</Card>;
}
