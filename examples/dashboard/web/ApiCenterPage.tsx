import { useRef, useState } from 'react';
import { Alert, App, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { isRequestCancelled, useModuleAccess } from '@pengzhendong/worker-kit/web';
import { ApiCenter } from '@pengzhendong/worker-kit/web/api-center';
import type { ApiKeyInfo, PageList } from '@pengzhendong/worker-kit/contracts';
import { api, formatTime, jsonRequest, QueryError, sessionScope, useQuery } from './data';

function TokenPanel() {
  const { can, modules } = useModuleAccess(); const { message } = App.useApp();
  const [page, setPage] = useState(1); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const issuing = useRef(false); const [revoking, setRevoking] = useState<string>();
  const [created, setCreated] = useState<{ token: string; key: ApiKeyInfo }>(); const [form] = Form.useForm<{ name: string; permissions: string[]; expiresInDays: number }>();
  const { data, error, loading, refresh } = useQuery<PageList<ApiKeyInfo> & { grantablePermissions: string[] }>(can('api:tokens') ? `/api/admin/api-keys?page=${page}&pageSize=10` : null);
  const label = (permission: string) => { const [id, action] = permission.split(':'); const module = modules.find((item) => item.id === id); return `${module?.label ?? id} · ${module?.actions[action!] ?? action}`; };
  async function issue() {
    if (issuing.current) return;
    const values = await form.validateFields(); if (issuing.current) return; issuing.current = true; setBusy(true);
    try { const result = await api<{ token: string; key: ApiKeyInfo }>('/api/admin/api-keys', jsonRequest('POST', values)); setOpen(false); form.resetFields(); setCreated(result); refresh(); }
    catch (failure) { if (!isRequestCancelled(failure)) void message.error(failure instanceof Error ? failure.message : '创建失败'); }
    finally { issuing.current = false; setBusy(false); }
  }
  async function revoke(key: ApiKeyInfo) {
    setRevoking(key.id);
    try { await api(`/api/admin/api-keys/${encodeURIComponent(key.id)}`, { method: 'DELETE' }); void message.success('访问令牌已撤销'); refresh(); }
    catch (failure) { if (!isRequestCancelled(failure)) void message.error(failure instanceof Error ? failure.message : '撤销失败'); }
    finally { setRevoking(undefined); }
  }
  if (!can('api:tokens')) return <Alert type="info" title="当前账户没有查看访问令牌的权限" />;
  return <>
    <Alert type="info" showIcon title="为脚本和其他应用创建访问令牌" description="令牌只能使用选择的业务权限，不能登录后台或管理其他令牌。完整令牌只显示一次，请自行保存。每个令牌每分钟最多 120 次请求，按 Cloudflare 节点分别计数。" style={{ marginBottom: 20 }} />
    <QueryError error={error} retry={refresh} />
    <Card><div className="table-toolbar"><Typography.Text type="secondary">{data ? `共 ${data.total} 个令牌` : '正在读取令牌'}</Typography.Text><Space wrap><Button onClick={refresh}>刷新</Button>{can('api:issue') && <Button type="primary" disabled={!data?.grantablePermissions.length} onClick={() => setOpen(true)}>创建令牌</Button>}</Space></div>
      <Table<ApiKeyInfo> rowKey="id" loading={loading} dataSource={data?.items} scroll={{ x: 920 }} pagination={{ current: page, total: data?.total, pageSize: 10, showSizeChanger: false, onChange: setPage }} columns={[
        { title: '名称 / 标识', key: 'name', width: 180, render: (_, item) => <Space orientation="vertical" size={0}><Typography.Text strong>{item.name}</Typography.Text><Typography.Text type="secondary" code>{item.prefix}…</Typography.Text></Space> },
        { title: '状态', key: 'status', width: 90, render: (_, item) => <Tag color={item.revokedAt ? undefined : Date.parse(item.expiresAt) <= Date.now() ? 'orange' : 'green'}>{item.revokedAt ? '已撤销' : Date.parse(item.expiresAt) <= Date.now() ? '已过期' : '有效'}</Tag> },
        { title: '权限', key: 'permissions', width: 220, render: (_, item) => <Space size={[0, 4]} wrap>{item.permissions.map((permission) => <Tag key={permission}>{label(permission)}</Tag>)}</Space> },
        { title: '到期时间', dataIndex: 'expiresAt', width: 170, render: formatTime },
        { title: '最近使用', dataIndex: 'lastUsedAt', width: 170, render: (value: string | null) => value ? formatTime(value) : '从未使用' },
        ...(can('api:revoke') ? [{ title: '操作', key: 'actions', width: 85, render: (_: unknown, item: ApiKeyInfo) => !item.revokedAt && <Popconfirm title="撤销这个访问令牌？" description="撤销后不能再使用，请先更新依赖它的脚本。" okText="确认撤销" cancelText="取消" onConfirm={() => void revoke(item)}><Button danger type="link" size="small" loading={revoking === item.id} disabled={!!revoking}>撤销</Button></Popconfirm> }] : []),
      ]} />
    </Card>
    <Modal title="创建访问令牌" open={open} onCancel={() => { if (!busy) { setOpen(false); form.resetFields(); } }} onOk={() => { void issue().catch(() => {}); }} okText="创建" cancelText="取消" confirmLoading={busy} closable={!busy} maskClosable={!busy}>
      <Form form={form} layout="vertical" initialValues={{ expiresInDays: 30 }} requiredMark={false}>
        <Form.Item name="name" label="令牌名称" rules={[{ required: true, whitespace: true, message: '请输入令牌名称' }]}><Input maxLength={80} placeholder="例如：订阅同步脚本" /></Form.Item>
        <Form.Item name="permissions" label="业务权限" rules={[{ required: true, type: 'array', min: 1, message: '至少选择一个权限' }]}><Select mode="multiple" virtual={false} optionFilterProp="label" placeholder="只选择脚本需要的权限" options={data?.grantablePermissions.map((permission) => ({ value: permission, label: label(permission) }))} /></Form.Item>
        <Form.Item name="expiresInDays" label="有效天数" rules={[{ required: true, type: 'number', min: 1, max: 365, message: '有效期为 1–365 天' }]}><InputNumber min={1} max={365} style={{ width: '100%' }} /></Form.Item>
      </Form>
    </Modal>
    <Modal title="保存你的访问令牌" open={!!created} onCancel={() => setCreated(undefined)} footer={<Button type="primary" onClick={() => setCreated(undefined)}>已保存，关闭</Button>} destroyOnHidden>
      <Alert type="warning" showIcon title="关闭后将无法再次查看完整令牌" style={{ marginBottom: 16 }} />
      {created && <><Typography.Paragraph>令牌：{created.key.name}</Typography.Paragraph><Typography.Paragraph code copyable style={{ overflowWrap: 'anywhere' }}>{created.token}</Typography.Paragraph><Typography.Paragraph type="secondary">使用 Authorization: Bearer &lt;token&gt; 请求当前应用。不要放进 URL、代码仓库或截图。</Typography.Paragraph></>}
    </Modal>
  </>;
}
export function ApiCenterPage() {
  const { can } = useModuleAccess();
  return <ApiCenter client={api} scope={sessionScope} tokenPanel={can('api:tokens') ? <TokenPanel /> : undefined} />;
}
