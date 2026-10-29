import { useState } from 'react';
import type { Key } from 'react';
import { Alert, App, Button, Card, Col, Form, Input, Popconfirm, Row, Select, Space, Tag, Typography } from 'antd';
import { ModalForm, ProTable } from '@ant-design/pro-components';
import { ColumnHeightOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { isRequestCancelled, getFormErrors, PageHeader, useModuleAccess } from '@pengzhendong/worker-kit/web';
import { api, formatTime, jsonRequest, QueryError, useQuery } from './data';
import type { BatchResult, PageList, Sort } from '@pengzhendong/worker-kit/contracts';
import type { Resource } from './data';

export function ResourcesPage({ defaultPageSize }: { defaultPageSize: number }) {
  const { can } = useModuleAccess();
  const [search, setSearch] = useState(''); const [status, setStatus] = useState<string>(); const [kind, setKind] = useState<string>();
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(defaultPageSize || 20); const [selected, setSelected] = useState<Key[]>([]);
  const [open, setOpen] = useState(false); const [editing, setEditing] = useState<Resource | null>(null);
  const [sort, setSort] = useState<Sort<'name' | 'updated_at'>>({ field: 'updated_at', order: 'desc' });
  const [batching, setBatching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [failedBatch, setFailedBatch] = useState<BatchResult['failed']>([]);
  const [form] = Form.useForm(); const { message } = App.useApp();
  const query = new URLSearchParams({ q: search, status: status ?? '', kind: kind ?? '', page: String(page), pageSize: String(pageSize), sort: sort.field, order: sort.order });
  const { data, error, loading, refresh } = useQuery<PageList<Resource>>(`/api/admin/resources?${query}`);
  function edit(row: Resource | null) { setEditing(row); form.resetFields(); form.setFieldsValue(row ?? { name: '', kind: '配置', status: 'enabled', address: '', description: '' }); setOpen(true); }
  async function save(values: Record<string, unknown>) {
    try { await api(`/api/admin/resources${editing ? `/${editing.id}` : ''}`, jsonRequest(editing ? 'PUT' : 'POST', values)); void message.success(editing ? '资源已更新' : '资源已创建'); refresh(); return true; }
    catch (failure) {
      if (isRequestCancelled(failure)) return false;
      const fields = getFormErrors(failure);
      if (fields.length) form.setFields(fields);
      else void message.error(failure instanceof Error ? failure.message : '保存失败');
      return false;
    }
  }
  async function remove(row: Resource) {
    try { await api(`/api/admin/resources/${row.id}`, { method: 'DELETE' }); void message.success('资源已删除'); setSelected((keys) => keys.filter((key) => key !== row.id)); refresh(); }
    catch (failure) {
      if (isRequestCancelled(failure)) return; void message.error(failure instanceof Error ? failure.message : '删除失败'); }
  }
  async function batch(next: string) {
    setBatching(true);
    try {
      const result = await api<BatchResult>('/api/admin/resources/batch', jsonRequest('POST', { ids: selected, status: next }));
      setFailedBatch(result.failed);
      if (result.failed.length) void message.warning(`已更新 ${result.succeeded.length} 项，${result.failed.length} 项失败：${result.failed[0]!.message}`);
      else void message.success(`已更新 ${result.succeeded.length} 项`);
      setSelected(result.failed.map((item) => item.id)); refresh();
    } catch (failure) {
      if (isRequestCancelled(failure)) return; void message.error(failure instanceof Error ? failure.message : '操作失败'); }
    finally { setBatching(false); }
  }
  async function exportResources() {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await api<Blob>(`/api/admin/resources/export?${query}`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'resources.json'; anchor.click(); URL.revokeObjectURL(url);
    } catch (failure) { if (!isRequestCancelled(failure)) void message.error(failure instanceof Error ? failure.message : '导出失败'); }
    finally { setExporting(false); }
  }
  return <>
    <PageHeader title="资源管理" description="管理应用的配置清单，支持查询、编辑与批量变更。" actions={<>{can('resources:export') && <Button href={`/api/admin/resources/export?${query}`} loading={exporting} onClick={(event) => { event.preventDefault(); void exportResources(); }}>导出 JSON</Button>}{can('resources:create') && <Button type="primary" onClick={() => edit(null)}>＋ 新增资源</Button>}</>} />
    <QueryError error={error} retry={refresh} />
    <Card>
      {failedBatch.length > 0 && <Alert type="warning" showIcon closable onClose={() => setFailedBatch([])} title="部分资源未更新" description={<div style={{ maxHeight: 160, overflowY: 'auto' }}>{failedBatch.map((failure) => <div key={failure.id}>{data?.items.find((item) => item.id === failure.id)?.name ?? failure.id}：{failure.message}</div>)}</div>} style={{ marginBottom: 16 }} />}
      {selected.length > 0 && <div className="selection-bar"><Space wrap><Typography.Text>已选 {selected.length} 项</Typography.Text><Button size="small" loading={batching} onClick={() => void batch('enabled')}>批量启用</Button><Button size="small" loading={batching} onClick={() => void batch('disabled')}>批量停用</Button><Button size="small" type="text" disabled={batching} onClick={() => setSelected([])}>取消选择</Button></Space></div>}
      <ProTable<Resource> rowKey="id" cardProps={false} search={false} tableAlertRender={false}
        options={{ reload: () => refresh(), density: true,
          reloadIcon: <Button type="text" aria-label="刷新资源" icon={<ReloadOutlined />} />,
          densityIcon: <Button type="text" aria-label="表格密度" icon={<ColumnHeightOutlined />} />,
          setting: { draggable: false, settingIcon: <Button type="text" aria-label="列设置" icon={<SettingOutlined />} /> } }}
        toolbar={{ title: <Space wrap><Input.Search aria-label="搜索资源" placeholder="搜索名称、描述或地址" allowClear onSearch={(value) => { setSearch(value); setPage(1); }} style={{ width: 270, maxWidth: '100%' }} />
          <Select aria-label="资源类型" placeholder="全部类型" allowClear value={kind} style={{ width: 130 }} options={['订阅源', '存储', '任务', '配置'].map((value) => ({ value, label: value }))} onChange={(value) => { setKind(value); setPage(1); }} />
          <Select aria-label="资源状态" placeholder="全部状态" allowClear value={status} style={{ width: 130 }} options={[{ value: 'enabled', label: '已启用' }, { value: 'disabled', label: '已停用' }]} onChange={(value) => { setStatus(value); setPage(1); }} /></Space> }}
        loading={loading} locale={error ? { emptyText: '资源未能加载，请重试' } : undefined} dataSource={data?.items ?? []} scroll={{ x: 900 }} rowSelection={can('resources:batch') ? { selectedRowKeys: selected, onChange: setSelected, getCheckboxProps: () => ({ disabled: batching }) } : undefined} onChange={(_, __, sorter, extra) => {
        if (extra.action !== 'sort') return;
        const value = Array.isArray(sorter) ? sorter[0] : sorter;
        if (value?.order && (value.columnKey === 'name' || value.columnKey === 'updated_at')) setSort({ field: value.columnKey, order: value.order === 'ascend' ? 'asc' : 'desc' });
        else setSort({ field: 'updated_at', order: 'desc' });
        setPage(1);
      }} pagination={{ current: page, pageSize, total: data?.total, showSizeChanger: true, showTotal: (total) => `共 ${total} 项`, onChange: (next, size) => { setPage(next); setPageSize(size); } }} columns={[
        { title: '名称 / 描述', dataIndex: 'name', key: 'name', sorter: true, sortOrder: sort.field === 'name' ? (sort.order === 'asc' ? 'ascend' : 'descend') : null, width: 260, render: (_, row) => <Space orientation="vertical" size={2}>{can('resources:update') ? <Button type="link" style={{ padding: 0, height: 'auto', fontWeight: 600 }} onClick={() => edit(row)}>{row.name}</Button> : <Typography.Text strong>{row.name}</Typography.Text>}<Typography.Text type="secondary" ellipsis style={{ maxWidth: 220, fontSize: 12 }}>{row.description || '暂无描述'}</Typography.Text></Space> },
        { title: '类型', dataIndex: 'kind', width: 100, render: (_, row) => <Tag color={row.kind === '订阅源' ? 'blue' : row.kind === '存储' ? 'purple' : 'default'}>{row.kind}</Tag> },
        { title: '状态', dataIndex: 'status', width: 100, render: (_, row) => <Tag color={row.status === 'enabled' ? 'green' : 'default'}>{row.status === 'enabled' ? '已启用' : '已停用'}</Tag> },
        { title: '地址', dataIndex: 'address', ellipsis: true, render: (_, row) => <Typography.Text type="secondary">{row.address || '—'}</Typography.Text> },
        { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', sorter: true, sortOrder: sort.field === 'updated_at' ? (sort.order === 'asc' ? 'ascend' : 'descend') : null, width: 185, render: (_, row) => formatTime(row.updated_at) },
        { title: '操作', key: 'actions', width: 120, fixed: 'right', hideInTable: !can('resources:update') && !can('resources:delete'), hideInSetting: true,
          render: (_, row) => <Space>{can('resources:update') && <Button type="link" size="small" onClick={() => edit(row)}>编辑</Button>}{can('resources:delete') && <Popconfirm title="删除这条资源配置？" description="删除后无法恢复。" okText="删除" cancelText="取消" onConfirm={() => remove(row)}><Button type="link" size="small" danger>删除</Button></Popconfirm>}</Space> },
      ]} />
    </Card>
    <ModalForm title={editing ? '编辑资源' : '新增资源'} open={open} onOpenChange={setOpen}
      form={form} onFinish={save} omitNil={false} requiredMark={false} width={580} style={{ marginTop: 24 }}
      submitter={{ submitButtonProps: { 'aria-label': '保存' } }}
      modalProps={{ okText: '保存', cancelText: '取消' }}>
        <Form.Item label="名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入资源名称' }]}><Input maxLength={80} placeholder="例如：主订阅源" /></Form.Item>
        <Row gutter={16}><Col xs={24} sm={12}><Form.Item label="类型" name="kind" rules={[{ required: true }]}><Select options={['订阅源', '存储', '任务', '配置'].map((value) => ({ value, label: value }))} /></Form.Item></Col><Col xs={24} sm={12}><Form.Item label="状态" name="status"><Select options={[{ value: 'enabled', label: '启用' }, { value: 'disabled', label: '停用' }]} /></Form.Item></Col></Row>
        <Form.Item label="地址" name="address" rules={[{ validator: (_, value) => !value || /^https?:\/\//i.test(value) ? Promise.resolve() : Promise.reject(new Error('请输入 http:// 或 https:// 地址')) }]}><Input maxLength={2000} placeholder="https://example.com" /></Form.Item>
        <Form.Item label="描述" name="description"><Input.TextArea maxLength={1000} rows={3} placeholder="添加备注，方便后续维护" /></Form.Item>
    </ModalForm>
  </>;
}
