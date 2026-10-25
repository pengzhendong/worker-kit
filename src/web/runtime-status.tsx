import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Card, Checkbox, Col, Descriptions, Empty, Flex, Row, Skeleton, Space, Tag, Tooltip, Typography, theme } from 'antd';
import { ApiOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, CloudServerOutlined, DatabaseOutlined, DeploymentUnitOutlined, DesktopOutlined, ExclamationCircleOutlined, FundOutlined, HddOutlined, LinkOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { RuntimeCheck, RuntimeMetrics, RuntimeSnapshot } from '../contracts';
import type { createApiClient } from './api';
import { useApiQuery } from './query';
import { PageHeader, StatCard } from './page';

const time = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false });
const decimal = (value: number | null | undefined, suffix: string, divisor = 1) => value == null ? '—' : `${Number((value / divisor).toFixed(2))} ${suffix}`;
const statusText = { ok: '可连接', error: '检查失败', timeout: '检查超时' };
const icons: Record<RuntimeCheck['kind'], ReactNode> = { database: <DatabaseOutlined />, kv: <ThunderboltOutlined />, storage: <HddOutlined />, service: <ApiOutlined /> };
function StatusIcon({ status }: { status: RuntimeCheck['status'] }) {
  const { token } = theme.useToken();
  return <span style={{ color: status === 'ok' ? token.colorSuccess : status === 'timeout' ? token.colorWarning : token.colorError }}>
    {status === 'ok' ? <CheckCircleOutlined /> : status === 'timeout' ? <ClockCircleOutlined /> : <CloseCircleOutlined />}
  </span>;
}

/** Auth, checks, metadata and analytics credentials are owned by the consuming application. */
export function RuntimeStatus({ client, statusUrl = '/api/admin/runtime', metricsUrl = '/api/admin/runtime/metrics', dashboardUrl = 'https://dash.cloudflare.com/' }: {
  client: ReturnType<typeof createApiClient>;
  statusUrl?: string;
  metricsUrl?: string | null;
  dashboardUrl?: string;
}) {
  const { token } = theme.useToken();
  const snapshot = useApiQuery<RuntimeSnapshot>(client, statusUrl);
  const metrics = useApiQuery<RuntimeMetrics>(client, metricsUrl);
  const [automatic, setAutomatic] = useState(false);
  const [history, setHistory] = useState<{ at: string; ok: boolean }[]>([]);
  const observed = useRef<RuntimeSnapshot | undefined>(undefined);
  const data = snapshot.data, stats = metrics.data;
  const busy = snapshot.loading || metrics.loading;
  const dashboard = new URL(dashboardUrl);
  if (dashboard.protocol !== 'https:' || dashboard.hostname !== 'dash.cloudflare.com' || dashboard.username || dashboard.password) throw new Error('运行指标链接必须使用 Cloudflare 控制台');
  useEffect(() => {
    if (data && observed.current !== data) { observed.current = data; setHistory((entries) => [...entries.slice(-19), { at: data.checkedAt, ok: data.ok }]); }
  }, [data]);
  useEffect(() => {
    if (!automatic) return;
    const interval = setInterval(() => { if (document.visibilityState === 'visible' && !snapshot.loading) snapshot.refresh(); }, 30_000);
    return () => clearInterval(interval);
  }, [automatic, snapshot.refresh, snapshot.loading]);
  function refresh() { snapshot.refresh(); if (metricsUrl) metrics.refresh(); }
  const headline = snapshot.error ? '状态检查未完成' : !data ? '正在检查运行状态' : data.ok ? '应用与依赖响应正常' : '部分依赖需要关注';
  const metricNote = metrics.error || stats?.message || (metrics.loading ? '正在读取平台指标' : '尚未接入 Cloudflare 指标');
  const usable = !metrics.error && stats?.status === 'ok' ? stats : undefined;
  return <div className="wk-runtime">
    <PageHeader title="运行状态" description="应用、依赖与平台指标，一处查看。" actions={<>
      <Checkbox checked={automatic} onChange={(event) => setAutomatic(event.target.checked)}>每 30 秒检查依赖</Checkbox>
      <Button aria-label="刷新状态" icon={<ReloadOutlined />} loading={busy} onClick={refresh}>刷新状态</Button>
    </>} />
    {snapshot.error && <Alert type="error" showIcon title={snapshot.error} description="下面保留的是上次取得的检查结果；恢复连接后请刷新。" action={<Button size="small" onClick={snapshot.refresh}>重试</Button>} />}
    <Card className="wk-runtime-summary">
      <Flex align="center" justify="space-between" wrap gap={16}>
        <Flex align="center" gap={16}>
          <span className="wk-runtime-health" style={{ color: snapshot.error || data && !data.ok ? token.colorWarning : data ? token.colorSuccess : token.colorPrimary, background: snapshot.error || data && !data.ok ? token.colorWarningBg : data ? token.colorSuccessBg : token.colorPrimaryBg }}>
            {!data ? <CloudServerOutlined /> : snapshot.error || !data.ok ? <ExclamationCircleOutlined /> : <CheckCircleOutlined />}
          </span>
          <div><Typography.Title level={4} style={{ margin: '0 0 6px' }}>{headline}</Typography.Title>
            <Typography.Text type="secondary">{data ? `最近检查 ${time(data.checkedAt)}` : '正在向当前应用发起只读检查'}</Typography.Text>
          </div>
        </Flex>
        <Space wrap><Tag icon={<CloudServerOutlined />}>Cloudflare Workers</Tag>{data && <Tag>{data.environment === 'local' ? '本地预览' : data.environment === 'production' ? '生产环境' : data.environment}</Tag>}</Space>
      </Flex>
    </Card>
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={14}><Card title={<Space><DeploymentUnitOutlined />应用与版本</Space>} style={{ height: '100%' }}>
        {!data ? <Skeleton active paragraph={{ rows: 4 }} /> : <Descriptions size="small" column={1} items={[
          { key: 'name', label: '应用', children: data.application.name },
          { key: 'app-version', label: '应用版本', children: <Typography.Text code>{data.application.version}</Typography.Text> },
          { key: 'version', label: 'Worker 版本', children: data.version.id ? <Typography.Text code style={{ overflowWrap: 'anywhere' }}>{data.version.id}</Typography.Text> : '未提供版本元数据' },
          { key: 'tag', label: '版本标签', children: data.version.tag || '未设置' },
          { key: 'created', label: '版本创建时间', children: data.version.createdAt ? time(data.version.createdAt) : '未提供' },
        ]} />}
      </Card></Col>
      <Col xs={24} lg={10}><Card title={<Space><ClockCircleOutlined />本页检查记录</Space>} style={{ height: '100%' }}>
        <Flex gap={5} align="end" className="wk-runtime-history" aria-label="最近依赖检查结果">
          {history.length ? history.map((entry, index) => <Tooltip key={index} trigger={['hover', 'focus']} title={`${time(entry.at)} · ${entry.ok ? '依赖正常' : '依赖异常'}`}><span role="img" tabIndex={0} aria-label={`${time(entry.at)} · ${entry.ok ? '依赖正常' : '依赖异常'}`} style={{ background: entry.ok ? token.colorSuccess : token.colorError }} /></Tooltip>) : <Typography.Text type="secondary">等待首次检查</Typography.Text>}
        </Flex>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>最近 20 次检查，仅在当前页面保留。不是全天可用率，也不代表外部访问一定正常。</Typography.Paragraph>
      </Card></Col>
    </Row>
    <Card title={<Space><ApiOutlined />依赖连接</Space>} extra={data && <Typography.Text type="secondary">{data.checks.filter((check) => check.status === 'ok').length} / {data.checks.length} 可连接</Typography.Text>}>
      {!data ? <Skeleton active /> : !data.checks.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="此应用未配置依赖检查" /> : <div className="wk-runtime-checks">
        {data.checks.map((check) => <div className="wk-runtime-check" key={check.name}>
          <span className="wk-runtime-symbol" style={{ color: token.colorPrimary, background: token.colorPrimaryBg }}>{icons[check.kind] ?? <ApiOutlined />}</span>
          <div className="wk-runtime-check-copy"><Typography.Text strong>{check.name}</Typography.Text><Typography.Text type="secondary">{check.description}</Typography.Text></div>
          <Space><StatusIcon status={check.status} /><Typography.Text>{statusText[check.status]}</Typography.Text></Space>
          <Typography.Text type="secondary" className="wk-runtime-latency">{check.durationMs} ms</Typography.Text>
        </div>)}
      </div>}
      <Typography.Paragraph type="secondary" style={{ margin: '16px 0 0', fontSize: 12 }}>有时限的只读连接检查，不写入测试数据；耗时包含等待存储的时间，不是 CPU 时间。</Typography.Paragraph>
    </Card>
    <div><Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>平台资源指标</Typography.Title>
      <Button aria-label="Cloudflare 控制台" icon={<LinkOutlined />} href={dashboard.href} target="_blank" rel="noopener noreferrer">Cloudflare 控制台</Button>
    </Flex>
      {(metrics.error || stats?.status === 'error') && <Alert type="warning" showIcon title={metricNote} style={{ marginBottom: 16 }} />}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}><StatCard icon={<ApiOutlined />} title="请求量" value={usable?.requests ?? '—'} note="过去一小时 · Cloudflare" /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard icon={<ExclamationCircleOutlined />} title="调用错误率" value={usable?.requests ? `${Number(((usable.errors ?? 0) / usable.requests * 100).toFixed(2))}%` : '—'} note={usable?.requests === 0 ? '暂无请求，错误率不可计算' : `平台错误调用 ${usable?.errors ?? '—'}`} /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard icon={<DesktopOutlined />} title="CPU 时间 P50" value={decimal(usable?.cpuMsP50, 'ms')} note={`P99 ${decimal(usable?.cpuMsP99, 'ms')}`} /></Col>
        <Col xs={24} sm={12} xl={6}><StatCard icon={<FundOutlined />} title="隔离环境内存 P50" value={decimal(usable?.memoryBytesP50, 'MB', 1024 * 1024)} note={`P99 ${decimal(usable?.memoryBytesP99, 'MB', 1024 * 1024)}`} /></Col>
      </Row>
      <Typography.Paragraph type="secondary" style={{ margin: '16px 0 0', fontSize: 12 }}>{metricNote}。平台数据仅手动刷新；内存由隔离环境内的并发请求共享，不是宿主机内存。{usable && `统计区间 ${time(usable.from)} — ${time(usable.to)}；执行耗时 P50 ${decimal(usable.wallMsP50, 'ms')} / P99 ${decimal(usable.wallMsP99, 'ms')}。`}</Typography.Paragraph>
    </div>
  </div>;
}
