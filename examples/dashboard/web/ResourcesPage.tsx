import { useState } from 'react';
import type { Key } from 'react';
import { App, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { PageHeader } from '@pengzhendong/worker-kit/web';
import { api, formatTime, jsonRequest, QueryError, useQuery } from './data';
import type { Resource } from './data';

export function ResourcesPage({ defaultPageSize }: { defaultPageSize: number }) {
  const [search, setSearch] = useState(''); const [status, setStatus] = useState<string>(); const [kind, setKind] = useState<string>();
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(defaultPageSize || 20); const [selected, setSelected] = useState<Key[]>([]);
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Resource | null>(null); const [saving, setSaving] = useState(false);
  const [form] = Form.useForm(); const { message } = App.useApp();
  const query = new URLSearchParams({ q: search, status: status ?? '', kind: kind ?? '', page: String(page), pageSize: String(pageSize) });
  const { data, error, loading, refresh } = useQuery<{ items: Resource[]; total: number }>(`/api/admin/resources?${query}`);
  function edit(row: Resource | null) { setEditing(row); form.resetFields(); form.setFieldsValue(row ?? { name: '', kind: '配置', status: 'enabled', address: '', description: '' }); setOpen(true); }
  async function save(values: Record<string, unknown>) {
    setSaving(true);
    try { await api(`/api/admin/resources${editing ? `/${editing.id}` : ''}`, jsonRequest(editing ? 'PUT' : 'POST', values)); void message.success(editing ? '资源已更新' : '资源已创建'); setOpen(false); refresh(); }
    catch (failure) { void message.error(failure instanceof Error ? failure.message : '保存失败'); } finally { setSaving(false); }
  }
  async function remove(row: Resource) {
    try { await api(`/api/admin/resources/${row.id}`, { method: 'DELETE' }); void message.success('资源已删除'); setSelected((keys) => keys.filter((key) => key !== row.id)); refresh(); }
    catch (failure) { void message.error(failure instanceof Error ? failure.message : '删除失败'); }
  }
  async function batch(next: string) {
    try { await api('/api/admin/resources/batch', jsonRequest('POST', { ids: selected, status: next })); void message.success('状态已更新'); setSelected([]); refresh(); }
    catch (failure) { void message.error(failure instanceof Error ? failure.message : '操作失败'); }
  }
  return <>
    <PageHeader title="资源管理" description="管理应用的配置清单，支持查询、编辑与批量变更。" actions={<><Button href={`/api/admin/resources/export?${query}`}>导出 JSON</Button><Button type="primary" onClick={() => edit(null)}>＋ 新增资源</Button></>} />
    <QueryError error={error} retry={refresh} />
    <Card>
      <div className="table-toolbar"><Space wrap><Input.Search aria-label="搜索资源" placeholder="搜索名称、描述或地址" allowClear onSearch={(value) => { setSearch(value); setPage(1); }} style={{ width: 270 }} />
        <Select aria-label="资源类型" placeholder="全部类型" allowClear value={kind} style={{ width: 130 }} options={['订阅源', '存储', '任务', '配置'].map((value) => ({ value, label: value }))} onChange={(value) => { setKind(value); setPage(1); }} />
        <Select aria-label="资源状态" placeholder="全部状态" allowClear value={status} style={{ width: 130 }} options={[{ value: 'enabled', label: '已启用' }, { value: 'disabled', label: '已停用' }]} onChange={(value) => { setStatus(value); setPage(1); }} /></Space><Button onClick={refresh}>刷新</Button></div>
      {selected.length > 0 && <div className="selection-bar"><Space wrap><Typography.Text>已选 {selected.length} 项</Typography.Text><Button size="small" onClick={() => void batch('enabled')}>批量启用</Button><Button size="small" onClick={() => void batch('disabled')}>批量停用</Button><Button size="small" type="text" onClick={() => setSelected([])}>取消选择</Button></Space></div>}
      <Table<Resource> rowKey="id" loading={loading} dataSource={data?.items} scroll={{ x: 900 }} rowSelection={{ selectedRowKeys: selected, onChange: setSelected }} pagination={{ current: page, pageSize, total: data?.total, showSizeChanger: true, showTotal: (total) => `共 ${total} 项`, onChange: (next, size) => { setPage(next); setPageSize(size); } }} columns={[
        { title: '名称 / 描述', dataIndex: 'name', width: 260, render: (_, row) => <Space orientation="vertical" size={2}><Button type="link" style={{ padding: 0, height: 'auto', fontWeight: 600 }} onClick={() => edit(row)}>{row.name}</Button><Typography.Text type="secondary" ellipsis style={{ maxWidth: 220, fontSize: 12 }}>{row.description || '暂无描述'}</Typography.Text></Space> },
        { title: '类型', dataIndex: 'kind', width: 100, render: (value: string) => <Tag color={value === '订阅源' ? 'blue' : value === '存储' ? 'purple' : 'default'}>{value}</Tag> },
        { title: '状态', dataIndex: 'status', width: 100, render: (value: string) => <Tag color={value === 'enabled' ? 'green' : 'default'}>{value === 'enabled' ? '已启用' : '已停用'}</Tag> },
        { title: '地址', dataIndex: 'address', ellipsis: true, render: (value: string) => <Typography.Text type="secondary">{value || '—'}</Typography.Text> },
        { title: '更新时间', dataIndex: 'updated_at', width: 185, render: formatTime },
        { title: '操作', key: 'actions', width: 120, fixed: 'right', render: (_, row) => <Space><Button type="link" size="small" onClick={() => edit(row)}>编辑</Button><Popconfirm title="删除这条资源配置？" description="删除后无法恢复。" okText="删除" cancelText="取消" onConfirm={() => remove(row)}><Button type="link" size="small" danger>删除</Button></Popconfirm></Space> },
      ]} />
    </Card>
    <Modal title={editing ? '编辑资源' : '新增资源'} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={saving} okText="保存" cancelText="取消" width={580}>
      <Form form={form} layout="vertical" onFinish={save} requiredMark={false} style={{ marginTop: 24 }}>
        <Form.Item label="名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入资源名称' }]}><Input maxLength={80} placeholder="例如：主订阅源" /></Form.Item>
        <Space align="start" style={{ display: 'flex' }}><Form.Item label="类型" name="kind" rules={[{ required: true }]}><Select style={{ width: 240 }} options={['订阅源', '存储', '任务', '配置'].map((value) => ({ value, label: value }))} /></Form.Item><Form.Item label="状态" name="status"><Select style={{ width: 240 }} options={[{ value: 'enabled', label: '启用' }, { value: 'disabled', label: '停用' }]} /></Form.Item></Space>
        <Form.Item label="地址" name="address" rules={[{ validator: (_, value) => !value || /^https?:\/\//i.test(value) ? Promise.resolve() : Promise.reject(new Error('请输入 http:// 或 https:// 地址')) }]}><Input maxLength={2000} placeholder="https://example.com" /></Form.Item>
        <Form.Item label="描述" name="description"><Input.TextArea maxLength={1000} rows={3} placeholder="添加备注，方便后续维护" /></Form.Item>
      </Form>
    </Modal>
  </>;
}
