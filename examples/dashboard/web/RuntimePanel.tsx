import { useState } from 'react';
import { Alert, App, Button, Card, Descriptions, Popconfirm, Space, Tag, Typography } from 'antd';
import { AppErrorBoundary, isRequestCancelled, useModuleAccess } from '@pengzhendong/worker-kit/web';
import { api, jsonRequest, QueryError } from './data';

interface Diagnostics { ok: boolean; checks: { name: string; status: 'ok' | 'error' | 'timeout'; durationMs: number }[] }
interface Retention { enabled: boolean; days: number | null; before: string | null; eligible: number; batchLimit: number }
function FailedPage({ crash }: { crash: boolean }) { if (crash) throw new Error('WorkerKit deliberate rendering failure'); return <Typography.Text type="secondary">演示页面正常。触发错误后，外层导航仍可使用。</Typography.Text>; }

export function RuntimePanel() {
  const { can } = useModuleAccess(); const { message } = App.useApp();
  const [diagnostics, setDiagnostics] = useState<Diagnostics>(); const [error, setError] = useState(''); const [checking, setChecking] = useState(false);
  const [retention, setRetention] = useState<Retention>(); const [retentionError, setRetentionError] = useState(''); const [inspecting, setInspecting] = useState(false); const [pruning, setPruning] = useState(false);
  const [crash, setCrash] = useState(false);
  async function check() {
    setChecking(true); setError('');
    try { setDiagnostics(await api<Diagnostics>('/api/admin/diagnostics')); }
    catch (failure) { if (!isRequestCancelled(failure)) { setDiagnostics(undefined); setError(failure instanceof Error ? failure.message : '检查失败'); } }
    finally { setChecking(false); }
  }
  async function inspect() {
    setInspecting(true); setRetentionError('');
    try { setRetention(await api<Retention>('/api/admin/audit/retention')); }
    catch (failure) { if (!isRequestCancelled(failure)) setRetentionError(failure instanceof Error ? failure.message : '检查失败'); }
    finally { setInspecting(false); }
  }
  async function prune() {
    setPruning(true);
    try { const result = await api<{ deleted: number }>('/api/admin/audit/prune', jsonRequest('POST', { confirmation: 'delete-expired-audit-events' })); void message.success(`已清理 ${result.deleted} 条过期日志`); await inspect(); }
    catch (failure) { if (!isRequestCancelled(failure)) void message.error(failure instanceof Error ? failure.message : '清理失败'); }
    finally { setPruning(false); }
  }
  return <Space orientation="vertical" size={24} className="demo-stack">
    <Card title="会话与请求生命周期"><Descriptions column={1} size="small" items={[
      { key: 'auth', label: '登录与失效', children: '登录失败区分凭据、限流与网络故障；业务请求 401 结束当前会话，403 保留身份。' },
      { key: 'data', label: '身份隔离', children: '退出、重新登录或会话失效时取消旧请求、清理注册的用户缓存并重载权限；主题偏好保留。' },
      { key: 'request', label: '请求取消', children: '切页与刷新取消旧查询，旧响应不能回写新会话。取消写请求不等于服务端回滚，不自动重试。' },
    ]} /></Card>
    <section aria-label="依赖连接诊断"><Card title="健康与依赖诊断" extra={can('overview:diagnose') && <Button onClick={() => void check()} loading={checking}>检查依赖连接</Button>}>
      <Typography.Paragraph type="secondary">公开 /health 仅检查服务能否响应。这里按需对 D1、KV、R2 执行有时限的只读检查，不写入测试数据，也不在后台轮询。</Typography.Paragraph>
      <QueryError error={error} retry={() => void check()} />
      {diagnostics ? <Space wrap>{diagnostics.checks.map((item) => <Tag key={item.name} color={item.status === 'ok' ? 'green' : 'red'}>{item.name} · {item.status === 'ok' ? '可连接' : item.status === 'timeout' ? '超时' : '失败'} · {item.durationMs} ms</Tag>)}</Space> : <Typography.Text type="secondary">{can('overview:diagnose') ? '尚未检查。结果仅代表本次检查时的连接情况。' : '当前账户没有依赖诊断权限。'}</Typography.Text>}
    </Card></section>
    <section aria-label="页面错误恢复演示"><Card title="页面错误与恢复" extra={!crash && <Button onClick={() => setCrash(true)}>触发演示页面错误</Button>}>
      <Typography.Paragraph type="secondary">使用真实错误边界演示渲染失败和重试，仅影响这个演示区域，不修改业务数据。</Typography.Paragraph>
      <AppErrorBoundary resetKeys={[]} onReset={() => setCrash(false)}><FailedPage crash={crash} /></AppErrorBoundary>
    </Card></section>
    <Card title="指标与运行日志"><Typography.Paragraph>请求、异常和执行指标使用 Cloudflare 原生 Observability。示例已显式启用日志及采样，线上日志保留期由平台套餐控制；需要更长保留期时再接外部日志出口。</Typography.Paragraph><Space wrap><Button href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">打开 Cloudflare 控制台 ↗</Button><Button href="https://developers.cloudflare.com/workers/observability/" target="_blank" rel="noopener noreferrer">查看运行观测说明 ↗</Button></Space></Card>
    <section aria-label="操作日志保留策略"><Card title="业务操作日志保留" extra={can('audit:read') && <Button loading={inspecting} onClick={() => void inspect()}>查看保留策略</Button>}>
      <QueryError error={retentionError} retry={() => void inspect()} />
      <Typography.Paragraph type="secondary">D1 操作日志与平台运行日志分别管理。配置 AUDIT_RETENTION_DAYS 后可手动清理，每次最多 1000 条；默认关闭，不自动删除。</Typography.Paragraph>
      {retention ? <Space orientation="vertical"><Typography.Text>{retention.enabled ? `保留 ${retention.days} 天，当前有 ${retention.eligible} 条过期记录。` : '保留策略尚未启用，现有日志保持保留。'}</Typography.Text>{retention.enabled && can('audit:prune') && <Popconfirm title="清理过期操作日志？" description="只删除保留期限外的记录，每次最多 1000 条，删除后无法恢复。" okText="确认清理" cancelText="取消" onConfirm={() => void prune()}><Button danger disabled={!retention.eligible} loading={pruning}>清理过期操作日志</Button></Popconfirm>}</Space> : <Typography.Text type="secondary">{can('audit:read') ? '尚未读取保留策略。' : '当前账户没有操作日志查看权限。'}</Typography.Text>}
    </Card></section>
    <Alert type="info" showIcon title="升级前运行只读预检与消费项目检查" description="项目工具中提供 doctor 和 upgrade:check 命令。预检不安装依赖、不切换 submodule、不应用迁移，也不部署。线上可用性仍需外部探测与告警。" />
  </Space>;
}
