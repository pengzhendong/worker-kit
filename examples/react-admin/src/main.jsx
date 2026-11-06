import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router';
import { App as AntApp, Button, Card, Col, ConfigProvider, Form, Input, InputNumber, Layout, Modal, Row, Segmented, Select, Space, Statistic, Switch, Table, Tag, Typography, Upload, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { DashboardOutlined, ScheduleOutlined, FolderOutlined, FileTextOutlined, SettingOutlined, BulbOutlined, PlusOutlined, PlayCircleOutlined, MenuOutlined, TableOutlined, FormOutlined, SwitcherOutlined, EyeOutlined, LayoutOutlined, BgColorsOutlined } from '@ant-design/icons';
import { state, base, subscribe, snapshot, changed, runTask, createTask, addFiles, statusText, exportLogs } from '../../ui-demo/store';
import { init, use } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import componentPages from '../../ui-demo/component-pages.json';
import ComponentExperience from './ComponentExperience';
import './style.css';
import Workspace from './Workspace';
use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const kind = __DEMO_KIND__;
const pages = [{ name: 'workspace', path: '/workspace', label: '业务工作台', icon: <DashboardOutlined /> }, { name: 'overview', path: '/', label: '运行概览', icon: <DashboardOutlined /> }, { name: 'tasks', path: '/tasks', label: '任务调度', icon: <ScheduleOutlined /> }, { name: 'resources', path: '/resources', label: '资源管理', icon: <FolderOutlined /> }, { name: 'logs', path: '/logs', label: '运行日志', icon: <FileTextOutlined /> }, { name: 'settings', path: '/settings', label: '应用设置', icon: <SettingOutlined /> }];
const componentIcons = { table: <TableOutlined />, form: <FormOutlined />, dialogs: <SwitcherOutlined />, preview: <EyeOutlined />, layout: <LayoutOutlined />, theme: <BgColorsOutlined /> };
pages.push(...componentPages.map(page => ({ ...page, name: 'component_' + page.key, label: page.title, icon: componentIcons[page.key] })));
let ProLayout, ProTable, PageContainer, ModalForm, ProFormText, ProFormSelect;
let Refine, ThemedLayout, ThemedSider, useThemedLayoutContext, useRefineTable, useUpdate, useCreate, useInvalidate, routerProvider;
if (kind === 'pro') ({ ProLayout, ProTable, PageContainer, ModalForm, ProFormText, ProFormSelect } = await import('@ant-design/pro-components'));
else {
  ({ Refine, useUpdate, useCreate, useInvalidate } = await import('@refinedev/core'));
  ({ ThemedLayout, ThemedSider, useThemedLayoutContext, useTable: useRefineTable } = await import('@refinedev/antd'));
  ({ default: routerProvider } = await import('@refinedev/react-router'));
}
function useDemo() { useSyncExternalStore(subscribe, snapshot); return state; }
const colors = { success: 'success', warning: 'warning', paused: 'default', running: 'processing' };
const badge = status => <Tag color={colors[status]}>{statusText[status]}</Tag>;

const provider = {
  getApiUrl: () => 'local-demo',
  getList: async ({ resource, filters = [], sorters = [], pagination }) => {
    let data = [...(state[resource] || [])];
    for (const filter of filters) if ('field' in filter && filter.value !== undefined && filter.value !== '') data = data.filter(row => filter.field === 'q' ? JSON.stringify(row).toLowerCase().includes(String(filter.value).toLowerCase()) : filter.operator === 'contains' ? String(row[filter.field]).includes(filter.value) : row[filter.field] === filter.value);
    for (const sort of [...sorters].reverse()) data.sort((a, b) => String(a[sort.field]).localeCompare(String(b[sort.field])) * (sort.order === 'desc' ? -1 : 1));
    const total = data.length; const size = pagination?.pageSize || total; const page = pagination?.currentPage || 1;
    return { data: structuredClone(data.slice((page - 1) * size, page * size)), total };
  },
  getOne: async ({ resource, id }) => ({ data: structuredClone(state[resource].find(row => row.id === id)) }),
  create: async ({ variables }) => { createTask(variables); return { data: structuredClone(state.tasks[0]) }; },
  update: async ({ resource, id, variables }) => {
    const row = state[resource].find(row => row.id === id); if (!row) throw Error('示例记录不存在');
    if (variables.action === 'run') await runTask(row); else { Object.assign(row, variables); changed(); }
    return { data: structuredClone(row) };
  },
  deleteOne: async () => { throw Error('本示例未提供删除操作'); },
};

function Trend({ period }) {
  const element = useRef(null);
  useEffect(() => {
    const chart = init(element.current); chart.setOption({ tooltip: { trigger: 'axis' }, grid: { left: 45, right: 20, top: 12, bottom: 28 }, xAxis: { type: 'category', data: period === '7' ? ['10/30', '10/31', '11/01', '11/02', '11/03', '11/04', '11/05'] : ['10/23', '10/25', '10/27', '10/29', '10/31', '11/02', '11/05'], axisLine: { show: false }, axisTick: { show: false } }, yAxis: { type: 'value', splitLine: { lineStyle: { color: '#cbd5e133' } } }, series: [{ name: '请求量（示例）', type: 'line', smooth: true, data: period === '7' ? [3800, 5100, 4400, 6800, 5600, 8200, 7300] : [6800, 9100, 7400, 10800, 9600, 12200, 9300], itemStyle: { color: kind === 'pro' ? '#1677ff' : '#13c2c2' }, areaStyle: { opacity: .08 } }] });
    const observer = new ResizeObserver(() => chart.resize()); observer.observe(element.current); return () => { observer.disconnect(); chart.dispose(); };
  }, [period]);
  return <div ref={element} style={{ height: 240 }} role="img" aria-label="请求趋势，演示数据" />;
}
function Overview() {
  const data = useDemo(); const [period, setPeriod] = useState('7');
  return <><Row gutter={[16, 16]} className="demo-stats">{[{ title: 'Worker 应用', value: 8, suffix: '个', note: '7 个正常 · 1 个需关注' }, { title: '今日任务执行', value: 124, suffix: '次', note: '较昨日增加 18 次' }, { title: '任务成功率', value: 98.4, suffix: '%', note: '122 次成功 · 2 次异常' }, { title: '资源存储', value: 1.28, suffix: 'GB', note: '已使用配额的 12.8%' }].map(stat => <Col xs={12} xl={6} key={stat.title}><Card><Statistic title={stat.title} value={stat.value} suffix={stat.suffix} /><p className="muted text-small">{stat.note}</p></Card></Col>)}</Row><Row gutter={[24, 24]} className="demo-section"><Col xs={24} xl={15}><Card title="请求趋势" extra={<Select value={period} onChange={setPeriod} aria-label="趋势时间范围" options={[{ label: '近 7 天', value: '7' }, { label: '近 14 天', value: '14' }]} />}><p className="muted">各应用请求量的示例分布</p><Space align="baseline"><strong className="request-count">{period === '7' ? '31,702' : '64,518'}</strong><span className="muted">次请求</span><Tag color="success">+12.6%</Tag></Space><Trend period={period} /></Card></Col><Col xs={24} xl={9}><Card title="服务状态" extra={<Tag>示例</Tag>}><div className="services">{data.services.map(service => <div key={service.slug}><span className="service-icon">{service.name.slice(5, 6)}</span><span className="service-name"><strong>{service.name}</strong><small className="muted">{service.description}</small></span><Tag color={service.status === '正常' ? 'success' : 'warning'}>{service.status}</Tag></div>)}</div></Card></Col></Row><Card title="最近执行" className="demo-section"><Table dataSource={data.tasks.slice(0, 4)} rowKey="id" pagination={false} scroll={{ x: 600 }} columns={[{ title: '任务名称', dataIndex: 'name' }, { title: '应用', dataIndex: 'app' }, { title: '上次执行', dataIndex: 'lastRun' }, { title: '耗时', dataIndex: 'duration' }, { title: '结果', dataIndex: 'status', render: badge }]} /></Card></>;
}

function taskColumns(run, toggle, running) {
  return [{ title: '任务名称', dataIndex: 'name', width: 235, render: (_, row) => <><strong>{row.name}</strong><div className="muted text-small">{row.description}</div></> }, { title: '应用', dataIndex: 'app' }, { title: '执行计划', dataIndex: 'schedule' }, { title: '最近结果', dataIndex: 'status', render: badge }, { title: '上次执行', dataIndex: 'lastRun' }, { title: '启用', key: 'enabled', render: (_, row) => <Switch checked={row.enabled} size="small" aria-label={`启用${row.name}`} onChange={enabled => toggle(row, enabled)} /> }, { title: '操作', key: 'actions', render: (_, row) => <Button type="link" size="small" icon={<PlayCircleOutlined />} aria-label={`运行${row.name}`} loading={running === row.id || row.status === 'running'} onClick={() => run(row)}>运行</Button> }];
}
function NewTask({ open, close, create }) {
  const [form] = Form.useForm(); const fields = <><Form.Item label="任务名称" name="name" rules={[{ required: true, whitespace: true, min: 2, message: '请输入至少 2 个字的任务名称' }]}><Input placeholder="例如：每日数据同步" /></Form.Item><Form.Item label="所属应用" name="app"><Select options={['demo-api', 'demo-content', 'demo-jobs', 'demo-storage', 'demo-reports', 'demo-assets'].map(value => ({ value }))} /></Form.Item><Form.Item label="执行计划" name="schedule"><Select options={['每天 09:00', '每天 15:00', '每 30 分钟', '每 6 小时'].map(value => ({ value }))} /></Form.Item></>;
  if (kind === 'pro') return <ModalForm title="新建演示任务" open={open} onOpenChange={value => !value && close()} modalProps={{ destroyOnClose: true }} initialValues={{ app: 'demo-api', schedule: '每天 09:00' }} onFinish={async values => { await create(values); close(); return true; }}><ProFormText label="任务名称" name="name" rules={[{ required: true, whitespace: true, min: 2, message: '请输入至少 2 个字的任务名称' }]} placeholder="例如：每日数据同步" /><ProFormSelect label="所属应用" name="app" options={['demo-api', 'demo-jobs', 'demo-storage', 'demo-assets']} /><ProFormSelect label="执行计划" name="schedule" options={['每天 09:00', '每天 15:00', '每 30 分钟', '每 6 小时']} /></ModalForm>;
  return <Modal title="新建演示任务" open={open} onCancel={close} okText="创建任务" cancelText="取消" onOk={() => form.submit()} destroyOnClose><Form form={form} layout="vertical" initialValues={{ app: 'demo-api', schedule: '每天 09:00' }} onFinish={async values => { await create(values); form.resetFields(); close(); }}>{fields}</Form></Modal>;
}
function ProTasks() {
  const data = useDemo(); const [query, setQuery] = useState(''); const [filter, setFilter] = useState('all'); const [open, setOpen] = useState(false); const { message } = AntApp.useApp();
  const rows = data.tasks.filter(task => `${task.name} ${task.app}`.includes(query) && (filter === 'all' || task.enabled === (filter === 'enabled')));
  return <><ProTable rowKey="id" headerTitle="任务清单" columns={taskColumns(async row => { await runTask(row); message.success('模拟执行完成'); }, (row, enabled) => { row.enabled = enabled; changed(); })} dataSource={rows} search={false} scroll={{ x: 950 }} pagination={{ pageSize: 5 }} options={{ reload: () => message.info('本地演示数据已刷新'), density: true, setting: true }} toolBarRender={() => [<Input key="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索任务或应用…" aria-label="搜索任务" style={{ width: 230 }} />, <Select key="filter" value={filter} onChange={setFilter} aria-label="任务状态筛选" options={[{ value: 'all', label: '全部计划' }, { value: 'enabled', label: '已启用' }, { value: 'paused', label: '已暂停' }]} />, <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新建任务</Button>]} /><NewTask open={open} close={() => setOpen(false)} create={values => { createTask(values); message.success('演示任务已创建'); }} /></>;
}
function RefineTasks() {
  const { tableProps, setFilters } = useRefineTable({ resource: 'tasks', syncWithLocation: false, pagination: { pageSize: 5 } });
  const { mutateAsync: update } = useUpdate(); const { mutateAsync: create } = useCreate(); const invalidate = useInvalidate();
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('all'); const [running, setRunning] = useState(null); const [open, setOpen] = useState(false); const { message } = AntApp.useApp();
  function search(q, status) { setQuery(q); setFilter(status); setFilters([{ field: 'q', operator: 'contains', value: q }, ...(status === 'all' ? [] : [{ field: 'enabled', operator: 'eq', value: status === 'enabled' }])], 'replace'); }
  return <><Card title="任务清单" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新建任务</Button>}><div className="demo-toolbar"><Input value={query} onChange={event => search(event.target.value, filter)} placeholder="搜索任务或应用…" aria-label="搜索任务" /><Select value={filter} onChange={value => search(query, value)} aria-label="任务状态筛选" options={[{ value: 'all', label: '全部计划' }, { value: 'enabled', label: '已启用' }, { value: 'paused', label: '已暂停' }]} /></div><Table {...tableProps} rowKey="id" scroll={{ x: 950 }} columns={taskColumns(async row => { setRunning(row.id); try { await update({ resource: 'tasks', id: row.id, values: { action: 'run' }, successNotification: false }); await invalidate({ resource: 'logs', invalidates: ['list'] }); message.success('模拟执行完成'); } finally { setRunning(null); } }, (row, enabled) => update({ resource: 'tasks', id: row.id, values: { enabled }, successNotification: false }), running)} /></Card><NewTask open={open} close={() => setOpen(false)} create={values => create({ resource: 'tasks', values, successNotification: false })} /></>;
}

function Resources() {
  const data = useDemo(); const [query, setQuery] = useState(''); const [filter, setFilter] = useState('all'); const [selected, setSelected] = useState(null); const { message } = AntApp.useApp();
  const labels = { image: '图片', video: '视频', audio: '音频', document: '文档' };
  return <><div className="demo-toolbar"><Segmented value={filter} onChange={setFilter} options={[{ label: '全部资源', value: 'all' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]} /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索资源…" aria-label="搜索资源" /><Upload multiple showUploadList={false} beforeUpload={file => { try { addFiles([file]); message.success('已加入本地文件，没有上传到服务器'); } catch (error) { message.error(error.message); } return false; }}><Button type="primary">添加文件</Button></Upload></div><Row gutter={[20, 20]}>{data.resources.filter(resource => resource.name.includes(query) && (filter === 'all' || resource.type === filter)).map(resource => <Col xs={24} sm={12} xl={8} key={resource.id}><Card cover={<button className="resource-preview" aria-label={`预览${resource.name}`} onClick={() => setSelected(resource)}>{resource.type === 'image' && resource.url ? <img src={resource.url} alt={resource.name} /> : <span>{labels[resource.type]}</span>}</button>}><div className="resource-title"><strong>{resource.name}</strong><Tag>{labels[resource.type]}</Tag></div><p className="muted text-small">{resource.size} · {resource.date}</p><span className="muted text-small">{resource.tag}</span><Button type="link" onClick={() => setSelected(resource)} className="resource-action">预览</Button></Card></Col>)}</Row><Modal title={selected?.name} open={!!selected} onCancel={() => setSelected(null)} footer={null} destroyOnClose width={720}>{selected?.type === 'image' ? <img src={selected.url} alt={selected.name} style={{ width: '100%' }} /> : selected?.type === 'video' ? <video src={selected.url} controls preload="metadata" style={{ width: '100%' }} /> : selected?.type === 'audio' ? <audio src={selected.url} controls style={{ width: '100%' }} /> : <p className="muted">文档元数据示例 · {selected?.size}</p>}</Modal></>;
}
function Logs() {
  const data = useDemo(); const [query, setQuery] = useState(''); const [level, setLevel] = useState('all'); const rows = data.logs.filter(log => `${log.message} ${log.app}`.includes(query) && (level === 'all' || log.level === level));
  return <Card title="运行日志" extra={<Button onClick={() => exportLogs(rows)}>导出日志</Button>}><div className="demo-toolbar"><Input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索日志或应用…" aria-label="搜索日志" /><Select value={level} onChange={setLevel} aria-label="日志级别筛选" options={[{ value: 'all', label: '全部级别' }, { value: 'info', label: '信息' }, { value: 'warn', label: '警告' }, { value: 'error', label: '错误' }]} /></div><Table dataSource={rows} rowKey="id" scroll={{ x: 800 }} columns={[{ title: '时间', dataIndex: 'time' }, { title: '级别', dataIndex: 'level', render: value => <Tag color={{ info: 'processing', warn: 'warning', error: 'error' }[value]}>{value}</Tag> }, { title: '应用', dataIndex: 'app' }, { title: '事件内容', dataIndex: 'message', width: 450 }, { title: '耗时', dataIndex: 'duration' }]} /></Card>;
}
function Settings() {
  const { message } = AntApp.useApp(); const defaults = { name: 'WorkerKit 工作空间', description: '通用后台界面示例', timezone: 'Asia/Shanghai', retention: 30, failureNotice: true, dailyDigest: false }; let initial = defaults;
  try { initial = { ...defaults, ...JSON.parse(localStorage.getItem(`workerkit-${kind}-settings`) || '{}') }; } catch {}
  return <Form layout="vertical" initialValues={initial} onFinish={values => { try { localStorage.setItem(`workerkit-${kind}-settings`, JSON.stringify(values)); message.success('演示设置已保存到当前浏览器'); } catch { message.error('浏览器存储不可用'); } }} style={{ maxWidth: 900 }}><Card title="基本信息"><Form.Item label="工作空间名称" name="name" rules={[{ required: true, whitespace: true, message: '请输入工作空间名称' }]}><Input /></Form.Item><Form.Item label="说明" name="description"><Input.TextArea rows={2} /></Form.Item><Row gutter={20}><Col xs={24} sm={12}><Form.Item label="显示时区" name="timezone"><Select options={['Asia/Shanghai', 'Asia/Hong_Kong', 'UTC'].map(value => ({ value }))} /></Form.Item></Col><Col xs={24} sm={12}><Form.Item label="日志保留天数" name="retention"><InputNumber min={1} max={90} style={{ width: '100%' }} /></Form.Item></Col></Row></Card><Card title="通知偏好" className="demo-section"><p className="muted">演示表单，尚未连接消息发送服务</p><Form.Item label="任务失败提醒" name="failureNotice" valuePropName="checked"><Switch /></Form.Item><Form.Item label="每日运行摘要" name="dailyDigest" valuePropName="checked"><Switch /></Form.Item></Card><Button htmlType="submit" type="primary" className="demo-section">保存设置</Button></Form>;
}

function Content({ dark, toggleTheme }) { const location = useLocation(); return <><Routes><Route path="/workspace" element={<Workspace />} /><Route path="/" element={<Overview />} /><Route path="/tasks" element={kind === 'pro' ? <ProTasks /> : <RefineTasks />} /><Route path="/resources" element={<Resources />} /><Route path="/logs" element={<Logs />} /><Route path="/settings" element={<Settings />} /><Route path="/components/table" element={kind === 'pro' ? <ProTasks /> : <RefineTasks />} /><Route path="/components/form" element={<Settings />} /><Route path="/components/preview" element={<Resources />} />{componentPages.filter(page => !page.example).map(page => <Route key={page.path} path={page.path} element={<ComponentExperience key={page.key} kind={page.key} dark={dark} toggleTheme={toggleTheme} />} />)}<Route path="*" element={<Typography.Title level={2}>页面不存在</Typography.Title>} /></Routes><footer className="demo-footer">WorkerKit · {kind === 'pro' ? 'Ant Design Pro / ProComponents' : 'Refine / Ant Design'} · {location.pathname === '/workspace' ? '任务与诊断 · 服务端数据' : '演示数据 · 未连接生产服务'}</footer></>; }
function RefineHeader({ title, toggleTheme }) {
  const { mobileSiderOpen, setMobileSiderOpen } = useThemedLayoutContext();
  return <Layout.Header className="refine-header"><Space><Button className="refine-mobile-menu" type="text" icon={<MenuOutlined />} aria-label="打开导航" aria-expanded={mobileSiderOpen} onClick={() => setMobileSiderOpen(!mobileSiderOpen)} /><span>{title}</span></Space><Space><Tag color="cyan">Refine</Tag><Button type="text" icon={<BulbOutlined />} aria-label="切换明暗主题" onClick={toggleTheme} /><span className="demo-user">Demo User</span></Space></Layout.Header>;
}
function Shell({ dark, toggleTheme }) {
  const [collapsed, setCollapsed] = useState(() => innerWidth < 768);
  const location = useLocation();
  useEffect(() => { if (innerWidth < 768) setCollapsed(true); }, [location.pathname]);
  const title = pages.find(page => page.path === location.pathname)?.label || '工作台';
  const description = location.pathname === '/workspace' ? '查看当前后端的任务、运行记录与依赖状态。' : '组件与交互示例，操作仅保存在当前浏览器。';
  useEffect(() => { document.title = `WorkerKit · ${title} · ${kind === 'pro' ? 'Ant Design Pro' : 'Refine'}`; window.scrollTo({ top: 0 }); }, [title]);
  if (kind === 'pro') return <ProLayout title="WorkerKit" logo={base + 'favicon.svg'} layout="mix" navTheme={dark ? 'realDark' : 'light'} fixedHeader fixSiderbar collapsed={collapsed} onCollapse={setCollapsed} headerContentRender={() => <Button className="pro-mobile-menu" type="text" icon={<MenuOutlined />} aria-label="打开导航" aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)} />} collapsedButtonRender={() => <Button type="text" icon={<MenuOutlined />} aria-label="打开导航" />} location={{ pathname: location.pathname }} route={{ routes: pages.map(page => ({ path: page.path, name: page.label, icon: page.icon })) }} menuItemRender={(item, dom) => <Link to={item.path}>{dom}</Link>} headerTitleRender={(logo, text) => <Link to="/" className="demo-brand">{logo}{text}</Link>} avatarProps={{ title: 'Demo User', size: 'small' }} actionsRender={() => [<Button key="theme" type="text" icon={<BulbOutlined />} aria-label="切换明暗主题" onClick={toggleTheme} />]}><PageContainer title={<h1 className="pro-page-heading">{title}</h1>} breadcrumbRender={false} content={description}><Content dark={dark} toggleTheme={toggleTheme} /></PageContainer></ProLayout>;
  return <Refine dataProvider={provider} routerProvider={routerProvider} resources={pages.map(page => ({ name: page.name, list: page.path, meta: { label: page.label, icon: page.icon } }))} options={{ disableTelemetry: true, syncWithLocation: false }}><ThemedLayout Title={() => <Link to="/" className="demo-brand"><img src={base + 'favicon.svg'} alt="" />WorkerKit</Link>} Sider={props => <div className="refine-sider"><ThemedSider {...props} fixed /></div>} Header={() => <RefineHeader title={title} toggleTheme={toggleTheme} />}><div className="refine-content"><h1>{title}</h1><p className="muted">{description}</p><Content dark={dark} toggleTheme={toggleTheme} /></div></ThemedLayout></Refine>;
}
function Root() {
  const [dark, setDark] = useState(() => { try { return localStorage.getItem(`workerkit-${kind}-dark`) === 'true'; } catch { return false; } });
  return <ConfigProvider locale={zhCN} theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: { colorPrimary: kind === 'pro' ? '#1677ff' : '#08979c', borderRadius: 8 } }}><AntApp className={dark ? 'demo-dark' : ''}><BrowserRouter basename={base}><Shell dark={dark} toggleTheme={() => setDark(value => { try { localStorage.setItem(`workerkit-${kind}-dark`, String(!value)); } catch {} return !value; })} /></BrowserRouter></AntApp></ConfigProvider>;
}
createRoot(document.getElementById('root')).render(<Root />);
