import { Button, Card, Col, Empty, List, Row, Space, Table, Tag, Timeline, Typography } from 'antd';
import { PageHeader, StatCard } from '@pengzhendong/worker-kit/web';
import { actionLabels, formatBytes, formatTime, Icon, QueryError, useQuery } from './data';
import type { Overview } from './data';

export function OverviewPage({ onNavigate, showWelcome }: { onNavigate: (page: string) => void; showWelcome: boolean }) {
  const { data, loading, error, refresh } = useQuery<Overview>('/api/admin/overview');
  return <>
    <PageHeader title="工作台" description="应用配置、文件与操作记录，一处掌握。" actions={<><Button onClick={refresh}>刷新</Button><Button type="primary" onClick={() => onNavigate('resources')}>管理资源</Button></>} />
    <QueryError error={error} retry={refresh} />
    {showWelcome && <div className="welcome-panel"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>把时间留给业务。</h2><p>从配置清单开始，管理文件、调整设置，所有变更都有迹可循。</p></div><div className="welcome-mark" aria-hidden="true">W<span>↗</span></div></div>}
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={12} xl={6}><StatCard title="配置资源" value={data?.total ?? '—'} note="当前配置清单中的全部记录" icon={<Icon name="resources" />} /></Col>
      <Col xs={12} xl={6}><StatCard title="已启用" value={data?.enabled ?? '—'} note="已标记为启用的配置记录" icon={<Icon name="overview" />} /></Col>
      <Col xs={12} xl={6}><StatCard title="存储文件" value={data ? `${data.files}${data.filesTruncated ? '+' : ''}` : '—'} note="文件管理中的私有文件" icon={<Icon name="files" />} /></Col>
      <Col xs={12} xl={6}><StatCard title="文件用量" value={data ? formatBytes(data.bytes) : '—'} note={data?.filesTruncated ? '前 1000 个文件的合计大小' : '当前文件占用的存储空间'} icon={<Icon name="settings" />} /></Col>
    </Row>
    <Row gutter={[24, 24]}>
      <Col xs={24} xl={16}><Card title="最近更新" extra={<Button type="link" onClick={() => onNavigate('resources')}>查看全部 →</Button>}>
        <Table size="middle" rowKey="id" loading={loading} dataSource={data?.recent} pagination={false} scroll={{ x: 480 }} columns={[
          { title: '名称', dataIndex: 'name', render: (value: string) => <Typography.Text strong>{value}</Typography.Text> },
          { title: '类型', dataIndex: 'kind', render: (value: string) => <Tag>{value}</Tag> },
          { title: '状态', dataIndex: 'status', render: (value: string) => <Tag color={value === 'enabled' ? 'green' : 'default'}>{value === 'enabled' ? '已启用' : '已停用'}</Tag> },
          { title: '更新时间', dataIndex: 'updated_at', render: formatTime },
        ]} />
      </Card></Col>
      <Col xs={24} xl={8}><Card title="最近操作" extra={<Button type="link" onClick={() => onNavigate('audit')}>全部记录 →</Button>} style={{ height: '100%' }}>
        {data?.activity.length ? <Timeline items={data.activity.map((event) => ({ color: event.action.endsWith('delete') ? 'gray' : 'blue', content: <Space orientation="vertical" size={2}><Typography.Text>{actionLabels[event.action] ?? event.action} · {event.target}</Typography.Text><Typography.Text type="secondary" style={{ fontSize: 12 }}>{formatTime(event.created_at)}</Typography.Text></Space> }))} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有操作记录" />}
      </Card></Col>
      <Col span={24}><Card title="服务连接" extra={<Tag color="blue">当前应用</Tag>}>
        <List grid={{ gutter: 24, xs: 1, sm: 1, md: 3, lg: 3, xl: 3, xxl: 3 }} dataSource={data?.bindings} renderItem={(binding) => <List.Item><Space align="start" size={12}><span className="connection-dot" /><div><Typography.Text strong>{binding.name}</Typography.Text><Typography.Paragraph type="secondary" style={{ margin: '6px 0 0' }}>{binding.detail}</Typography.Paragraph></div><Tag color="green">已连接</Tag></Space></List.Item>} />
      </Card></Col>
    </Row>
  </>;
}
