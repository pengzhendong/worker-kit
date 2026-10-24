import { useState } from 'react';
import { Button, Card, Select, Table, Tag, Typography } from 'antd';
import { PageHeader } from '@pengzhendong/worker-kit/web';
import { actionLabels, formatTime, QueryError, useQuery } from './data';
import type { AuditEvent } from './data';

export function AuditPage() {
  const [page, setPage] = useState(1); const [action, setAction] = useState<string>();
  const { data, loading, error, refresh } = useQuery<{ items: AuditEvent[]; total: number }>(`/api/admin/audit?page=${page}&action=${encodeURIComponent(action ?? '')}`);
  return <>
    <PageHeader title="操作日志" description="查看资源、文件与应用设置的变更记录。" actions={<Button onClick={refresh}>刷新</Button>} />
    <QueryError error={error} retry={refresh} />
    <Card><div className="table-toolbar"><Select aria-label="筛选操作类型" placeholder="全部操作" allowClear value={action} onChange={(value) => { setAction(value); setPage(1); }} options={Object.entries(actionLabels).map(([value, label]) => ({ value, label }))} style={{ width: 180 }} /><Typography.Text type="secondary">共 {data?.total ?? 0} 条记录</Typography.Text></div>
      <Table<AuditEvent> rowKey="id" loading={loading} dataSource={data?.items} scroll={{ x: 650 }} pagination={{ current: page, pageSize: 20, total: data?.total, showSizeChanger: false, onChange: setPage }} columns={[
        { title: '操作时间', dataIndex: 'created_at', width: 200, render: formatTime },
        { title: '操作人', dataIndex: 'actor', width: 130 },
        { title: '操作', dataIndex: 'action', width: 140, render: (value: string) => <Tag color={value.endsWith('delete') ? 'orange' : 'blue'}>{actionLabels[value] ?? value}</Tag> },
        { title: '对象', dataIndex: 'target', ellipsis: true },
      ]} />
    </Card>
  </>;
}
