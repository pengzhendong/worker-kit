import type { ReactNode } from 'react';
import { Card, Flex, Statistic, Typography } from 'antd';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <Flex justify="space-between" align="start" gap={16} wrap style={{ marginBottom: 24 }}>
    <div><Typography.Title level={2} style={{ margin: '0 0 8px', fontSize: 28 }}>{title}</Typography.Title>{description && <Typography.Text type="secondary">{description}</Typography.Text>}</div>
    {actions && <Flex gap={8} wrap>{actions}</Flex>}
  </Flex>;
}

export function StatCard({ title, value, note, icon }: { title: string; value: string | number; note?: string; icon?: ReactNode }) {
  return <Card style={{ height: '100%' }}><Flex justify="space-between" gap={12}><Statistic title={title} value={value} styles={{ content: { fontSize: 30, fontWeight: 650 } }} />{icon && <span style={{ color: '#4669db', background: '#edf2ff', width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 12 }}>{icon}</span>}</Flex>{note && <Typography.Text type="secondary" style={{ display: 'block', marginTop: 14, fontSize: 12 }}>{note}</Typography.Text>}</Card>;
}
