import { useEffect, useRef, useState } from 'react';
import type { Key } from 'react';
import { Alert, App, Button, Card, Col, Descriptions, Empty, Flex, Form, Input, Modal, Popconfirm, Row, Segmented, Select, Skeleton, Space, Switch, Table, Tabs, Tag, Typography, Upload } from 'antd';
import { PageHeader, StatCard, workerKitLayout } from '@pengzhendong/worker-kit/web';
import { formatBytes, Icon } from './data';

type DemoItem = { id: number; name: string; kind: string; enabled: boolean };
const initialItems: DemoItem[] = [
  { id: 1, name: '订阅同步', kind: '订阅源', enabled: true },
  { id: 2, name: '文档归档', kind: '存储', enabled: true },
  { id: 3, name: '每日备份', kind: '任务', enabled: false },
];
type DemoFile = { id: number; name: string; size: number };

function CompositionExamples() {
  const { message } = App.useApp();
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState<Key[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'enabled' | 'disabled'>();
  const [files, setFiles] = useState<DemoFile[]>([{ id: 1, name: '示例说明.txt', size: 1536 }]);
  const nextItem = useRef(4); const nextFile = useRef(2);
  const visibleItems = items.filter((item) => item.name.includes(search.trim()) && (status === undefined || item.enabled === (status === 'enabled')));
  function batch(enabled: boolean) {
    setItems((rows) => rows.map((row) => selected.includes(row.id) ? { ...row, enabled } : row));
    setSelected([]);
    void message.success(enabled ? '所选演示条目已启用' : '所选演示条目已停用');
  }
  return <Space orientation="vertical" size={24} className="demo-stack">
    <Row gutter={[16, 16]}>
      <Col xs={12} md={12}><StatCard title="演示条目" value={items.length} note="随下方操作实时变化" icon={<Icon name="resources" />} /></Col>
      <Col xs={12} md={12}><StatCard title="已启用" value={items.filter((item) => item.enabled).length} note="使用文字与颜色表达状态" icon={<Icon name="overview" />} /></Col>
    </Row>
    <section aria-label="列表与工具栏示例"><Card title="列表与工具栏" extra={<Tag>演示数据</Tag>}>
      <div className="table-toolbar demo-toolbar">
          <Input.Search aria-label="搜索演示条目" placeholder="搜索演示条目" allowClear value={search} style={{ width: 240, maxWidth: '100%' }} onChange={(event) => { setSearch(event.target.value); setSelected([]); }} />
          <Select aria-label="筛选演示状态" placeholder="全部状态" allowClear value={status} style={{ width: 130 }} onChange={(value: 'enabled' | 'disabled' | undefined) => { setStatus(value); setSelected([]); }} options={[{ value: 'enabled', label: '已启用' }, { value: 'disabled', label: '已停用' }]} />
        <Button type="primary" style={{ marginInlineStart: 'auto' }} onClick={() => {
          const id = nextItem.current++; setItems((rows) => [...rows, { id, name: `新增演示条目 ${id}`, kind: '配置', enabled: true }]); setSearch(''); setStatus(undefined);
          void message.success('已添加一条演示数据');
        }}>添加示例</Button>
      </div>
      {selected.length > 0 && <div className="selection-bar"><Space wrap><Typography.Text>已选 {selected.length} 项</Typography.Text><Button size="small" onClick={() => batch(true)}>批量启用</Button><Button size="small" onClick={() => batch(false)}>批量停用</Button><Button type="text" size="small" onClick={() => setSelected([])}>取消选择</Button></Space></div>}
      <Table<DemoItem> size="middle" rowKey="id" dataSource={visibleItems} pagination={false} scroll={{ x: 550 }} rowSelection={{ selectedRowKeys: selected, onChange: setSelected }} columns={[
        { title: '名称', dataIndex: 'name', width: 180, render: (name: string) => <Typography.Text strong>{name}</Typography.Text> },
        { title: '类型', dataIndex: 'kind', width: 100, render: (kind: string) => <Tag>{kind}</Tag> },
        { title: '状态', dataIndex: 'enabled', width: 100, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '已启用' : '已停用'}</Tag> },
        { title: '操作', key: 'actions', width: 110, render: (_, row) => <Switch aria-label={`${row.name}启用状态`} checkedChildren="启用" unCheckedChildren="停用" checked={row.enabled} onChange={(enabled) => setItems((rows) => rows.map((item) => item.id === row.id ? { ...item, enabled } : item))} /> },
      ]} />
    </Card></section>
    <section aria-label="文件选择示例"><Card title="文件选择" extra={<Typography.Text type="secondary">仅展示文件信息</Typography.Text>}>
      <div className="file-upload"><Upload.Dragger height={workerKitLayout.uploadHeight} multiple showUploadList={false} beforeUpload={(file) => {
        if (file.size > 10 * 1024 * 1024) { void message.error('演示文件不能超过 10 MB'); return Upload.LIST_IGNORE; }
        const id = nextFile.current++;
        setFiles((current) => [...current, { id, name: file.name, size: file.size }]);
        return Upload.LIST_IGNORE;
      }}>
        <div className="upload-strip"><span className="upload-symbol"><Icon name="files" /></span><div className="upload-copy"><Typography.Text strong>点击选择，或拖拽文件到这里</Typography.Text><Typography.Text type="secondary">单文件最大 10 MB · 文件不会上传</Typography.Text></div><span className="upload-action">选择文件</span></div>
      </Upload.Dragger></div>
      <Table<DemoFile> size="middle" rowKey="id" dataSource={files} pagination={false} scroll={{ x: 400 }} columns={[
        { title: '文件名', dataIndex: 'name', ellipsis: true },
        { title: '大小', dataIndex: 'size', width: 90, render: formatBytes },
        { title: '操作', key: 'actions', width: 80, render: (_, row) => <Button type="link" size="small" aria-label={`移除${row.name}`} onClick={() => setFiles((current) => current.filter((file) => file.id !== row.id))}>移除</Button> },
      ]} />
    </Card></section>
  </Space>;
}

type DemoConfig = { name: string; email: string; frequency: string; enabled: boolean };
const initialConfig: DemoConfig = { name: '每日报告', email: 'demo@example.com', frequency: 'daily', enabled: true };

function FormExamples() {
  const { message } = App.useApp();
  const [config, setConfig] = useState(initialConfig);
  const [form] = Form.useForm<DemoConfig>();
  const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false);
  const [fail, setFail] = useState(false); const [error, setError] = useState(''); const [deleted, setDeleted] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  function edit() { form.resetFields(); form.setFieldsValue(config); setError(''); setOpen(true); }
  function save(values: DemoConfig) {
    setSaving(true); setError('');
    timer.current = setTimeout(() => {
      setSaving(false);
      if (fail) { setError('演示保存失败，输入内容已保留，请关闭模拟失败后重试。'); return; }
      setConfig(values); setOpen(false); void message.success('演示配置已保存');
    }, 650);
  }
  return <>
    <Row gutter={[24, 24]}>
      <Col xs={24} xl={14}><Card title="弹窗表单">
        <Typography.Paragraph type="secondary">编辑配置，尝试必填校验、邮箱校验、保存中和失败重试。</Typography.Paragraph>
        <Descriptions column={1} items={[
          { key: 'name', label: '名称', children: config.name }, { key: 'email', label: '通知邮箱', children: config.email },
          { key: 'frequency', label: '发送频率', children: config.frequency === 'daily' ? '每天' : '每周' },
          { key: 'status', label: '状态', children: <Tag color={config.enabled ? 'green' : 'default'}>{config.enabled ? '已启用' : '已停用'}</Tag> },
        ]} />
        <Button type="primary" onClick={edit} style={{ marginTop: 24 }}>编辑演示配置</Button>
      </Card></Col>
      <Col xs={24} xl={10}><Card title="二次确认">
        <Typography.Paragraph type="secondary">确认后再移除记录，取消时保留原内容。此处可随时还原。</Typography.Paragraph>
        {deleted ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="演示记录已删除"><Button onClick={() => setDeleted(false)}>还原演示记录</Button></Empty> : <div className="demo-confirm-row"><div><Typography.Text strong>过期演示记录</Typography.Text><br /><Typography.Text type="secondary">仅用于确认交互</Typography.Text></div><Popconfirm title="删除这条演示记录？" description="只影响当前演示，可以随时还原。" okText="确认删除" cancelText="取消" onConfirm={() => { setDeleted(true); void message.success('演示记录已删除'); }}><Button danger>删除演示记录</Button></Popconfirm></div>}
      </Card></Col>
    </Row>
    <Modal title="编辑演示配置" open={open} onCancel={() => { if (!saving) setOpen(false); }} onOk={() => form.submit()} okText="保存演示配置" cancelText="取消" confirmLoading={saving} closable={!saving} keyboard={!saving} mask={{ closable: !saving }} cancelButtonProps={{ disabled: saving }} width={520}>
      <Form form={form} layout="vertical" requiredMark={false} onFinish={save} disabled={saving} style={{ marginTop: 24 }}>
        {error && <Alert role="alert" type="error" showIcon title={error} style={{ marginBottom: 20 }} />}
        <Form.Item label="配置名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入配置名称' }]}><Input maxLength={80} /></Form.Item>
        <Form.Item label="通知邮箱" name="email" rules={[{ required: true, message: '请输入通知邮箱' }, { type: 'email', message: '请输入有效邮箱' }]}><Input maxLength={254} /></Form.Item>
        <Form.Item label="发送频率" name="frequency"><Select options={[{ value: 'daily', label: '每天' }, { value: 'weekly', label: '每周' }]} /></Form.Item>
        <Form.Item label="启用通知" name="enabled" valuePropName="checked"><Switch /></Form.Item>
        <Flex justify="space-between" align="center" gap={16}><Typography.Text type="secondary">模拟保存失败</Typography.Text><Switch aria-label="模拟保存失败" checked={fail} onChange={setFail} /></Flex>
      </Form>
    </Modal>
  </>;
}

type PreviewState = 'ready' | 'loading' | 'empty' | 'error';
function StateExamples() {
  const { message, notification } = App.useApp();
  const [state, setState] = useState<PreviewState>('ready');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { clearTimeout(timer.current); notification.destroy('workerkit-demo-notice'); message.destroy('workerkit-demo-feedback'); }, [message, notification]);
  function change(next: PreviewState) { clearTimeout(timer.current); setState(next); }
  function retry() { change('loading'); timer.current = setTimeout(() => setState('ready'), 650); }
  return <Row gutter={[24, 24]}>
    <Col xs={24} xl={14}><Card title="数据状态">
      <Typography.Paragraph type="secondary">切换状态，检查加载、空数据和可恢复的错误。</Typography.Paragraph>
      <Segmented block aria-label="演示数据状态" value={state} onChange={change} options={[{ value: 'ready', label: '正常' }, { value: 'loading', label: '加载' }, { value: 'empty', label: '空数据' }, { value: 'error', label: '失败' }]} />
      <section aria-label="数据状态预览" aria-busy={state === 'loading'} className="demo-state-preview">
        {state === 'ready' && <Space orientation="vertical" size={16} className="demo-stack"><Alert type="success" showIcon title="示例数据已加载" /><Typography.Text>订阅同步、文档归档和每日备份，共 3 条演示记录。</Typography.Text></Space>}
        {state === 'loading' && <><Typography.Paragraph type="secondary">正在加载演示数据…</Typography.Paragraph><Skeleton active title={false} paragraph={{ rows: 3 }} /></>}
        {state === 'empty' && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有演示数据"><Button type="primary" onClick={() => change('ready')}>生成演示数据</Button></Empty>}
        {state === 'error' && <div><Alert type="error" showIcon title="演示加载失败" description="保留错误说明，并提供重试入口。" /><Button onClick={retry} style={{ marginTop: 16 }}>重试加载</Button></div>}
      </section>
    </Card></Col>
    <Col xs={24} xl={10}><Card title="消息与通知">
      <Typography.Paragraph type="secondary">短操作使用消息反馈，需要保留的说明使用可关闭通知。</Typography.Paragraph>
      <Flex gap={12} wrap>
        <Button onClick={() => void message.open({ key: 'workerkit-demo-feedback', type: 'success', content: '演示操作成功' })}>成功消息</Button>
        <Button danger onClick={() => void message.open({ key: 'workerkit-demo-feedback', type: 'error', content: '演示操作失败，请重试' })}>失败消息</Button>
        <Button onClick={() => notification.info({ key: 'workerkit-demo-notice', title: '演示通知', description: '这是一条通知示例，可手动关闭。', duration: 0 })}>打开通知</Button>
        <Button disabled>禁用操作</Button>
      </Flex>
    </Card></Col>
  </Row>;
}

export function ComponentsPage() {
  const [tab, setTab] = useState('composition'); const [version, setVersion] = useState(0);
  const { message } = App.useApp();
  return <>
    <PageHeader title="组件与交互" description="可操作的界面样板。使用临时演示数据，刷新即可还原。" actions={<Button onClick={() => { setVersion((current) => current + 1); void message.info('演示已重置'); }}>重置演示</Button>} />
    <Tabs key={version} activeKey={tab} onChange={setTab} items={[
      { key: 'composition', label: '页面组合', children: <CompositionExamples /> },
      { key: 'forms', label: '表单与确认', children: <FormExamples /> },
      { key: 'states', label: '状态与反馈', children: <StateExamples /> },
    ]} />
  </>;
}
