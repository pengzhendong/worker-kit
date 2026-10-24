import { Alert, Button, Card, Col, Flex, Row, Space, Tabs, Tag, Typography, theme } from 'antd';
import { PageHeader } from '@pengzhendong/worker-kit/web';
import { Icon } from './data';

const explorer = '/cdn-cgi/local/explorer';
const docs = 'https://developers.cloudflare.com/workers/local-development/local-explorer/';
const localTools = [
  { key: 'd1', title: 'D1 数据库', icon: 'database', binding: 'DB', href: `${explorer}/d1/DB`, action: '打开 D1 面板',
    description: '浏览数据表、查看和编辑记录，执行 SQL 查询。', example: '保存资源配置后，检查数据是否已经写入。' },
  { key: 'kv', title: 'KV 键值存储', icon: 'key', binding: 'SETTINGS', href: `${explorer}/kv/SETTINGS`, action: '打开 KV 面板',
    description: '浏览键和值、查看元信息，新增、修改或删除键值。', example: '检查应用设置、缓存内容和过期信息。' },
  { key: 'r2', title: 'R2 对象存储', icon: 'files', binding: 'FILES', href: `${explorer}/r2/FILES`, action: '打开 R2 面板',
    description: '浏览文件和对象元信息，上传测试文件或删除对象。', example: '核对上传后的文件、大小和存储路径。' },
];
const debugTools = [
  { key: 'traces', title: '请求追踪', icon: 'trace', href: `${explorer}/observability`, action: '查看请求追踪',
    description: '按一次请求查看 Worker 执行过程、绑定调用和耗时。', example: '定位哪个数据库或存储调用失败、哪里响应慢。' },
  { key: 'events', title: '事件与日志', icon: 'audit', href: `${explorer}/observability/events`, action: '查看事件与日志',
    description: '查看本地请求事件和 Worker 的 console 输出。', example: '排查接口报错；这里的运行日志与业务操作日志分开查看。' },
  { key: 'debugger', title: 'Worker 调试器', icon: 'tools', href: '/__debug', action: '打开 Worker 调试器',
    description: '打开开发服务器提供的调试入口，设置断点、检查变量。', example: '需要逐步执行服务端代码时使用。' },
  { key: 'api', title: 'Explorer API', icon: 'code', href: `${explorer}/api`, action: '查看 Explorer API',
    description: '查看本地工具的 OpenAPI 定义，供脚本或 AI 工具调用。', example: '自动准备测试数据、查询本地存储或分析请求记录。' },
  { key: 'health', title: '服务健康检查', icon: 'overview', href: '/health', action: '查看健康检查',
    description: '查看当前 Worker 是否能够响应，以及服务标识。', example: '预览访问异常时先确认服务是否启动；不代表所有存储都正常。' },
];
const commands = [
  { title: '完整项目检查', command: 'npm run check', description: '生成绑定类型、检查 TypeScript、运行基础与接口测试、构建，并进行部署 dry-run。' },
  { title: '界面与交互回归', command: 'npm run test:ui', description: '使用固定 Linux 浏览器检查截图、滚动、导航和表单交互。运行前需要启动 Docker。' },
  { title: '查看界面测试报告', command: 'npx playwright show-report', description: '测试完成后，打开通过结果、失败截图、差异图和交互记录。' },
  { title: '生成绑定类型', command: 'npm run types', description: '修改 Wrangler 绑定配置后，为 D1、KV、R2 等绑定重新生成 TypeScript 类型。' },
  { title: '构建部署产物', command: 'npm run build', description: '生成 Worker 和前端静态文件，供后续部署使用。' },
  { title: '部署前检查', command: 'npm run deploy:dry-run', description: '先完成构建，再检查部署产物和绑定。只检查，不发布到 Cloudflare。' },
];
const projectPages = [
  { key: 'resources', title: '资源管理', description: '通过业务接口编辑 D1 配置，支持筛选、排序、批量变更和导出。' },
  { key: 'settings', title: '系统设置', description: '编辑 KV 中声明过的应用设置，并保留字段校验和操作记录。' },
  { key: 'files', title: '文件管理', description: '管理当前应用的私有 R2 文件，支持上传、认证下载和删除。' },
  { key: 'audit', title: '操作日志', description: '查看谁修改了资源、文件或应用设置；用于追溯业务变更。' },
  { key: 'components', title: '组件与交互', description: '体验列表、弹窗、表单和状态反馈，使用临时数据，不写入业务存储。' },
];
const optionalTools = [
  { title: 'Durable Objects', description: '浏览对象的 SQLite 表，查询和编辑对象内部数据。', requirement: 'SQLite 类型的 Durable Object 绑定' },
  { title: 'Workflows', description: '查看工作流实例与步骤状态，触发新实例或重试失败实例。', requirement: 'Workflow 绑定及实现' },
  { title: '邮件工具', description: '查看本地发送的邮件，测试邮件路由和接收处理。', requirement: '邮件绑定或邮件处理函数' },
  { title: '定时任务', description: '查看计划任务，手动触发一次 scheduled 处理函数。', requirement: 'scheduled 处理函数及适用的 Cron 配置' },
  { title: 'Flagship 特性开关', description: '查看和调整本地功能开关、规则及覆盖值。', requirement: 'Flagship 应用配置' },
];
type Tool = (typeof debugTools)[number] & { binding?: string };

function ToolCards({ tools }: { tools: readonly Tool[] }) {
  const { token } = theme.useToken();
  return <Row gutter={[16, 16]}>{tools.map((tool) => <Col key={tool.key} xs={24} md={12} xl={8}>
    <section aria-labelledby={`tool-${tool.key}`} style={{ height: '100%' }}><Card style={{ height: '100%' }} styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, padding: 20 } }}>
      <Flex align="center" gap={10}><span style={{ width: 32, height: 32, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 8, color: token.colorPrimaryText, background: token.colorPrimaryBg }}><Icon name={tool.icon} /></span><Typography.Title level={5} id={`tool-${tool.key}`} style={{ margin: 0 }}>{tool.title}</Typography.Title>{tool.binding && <Tag style={{ marginInlineStart: 'auto', marginInlineEnd: 0 }}>{tool.binding}</Tag>}</Flex>
      <Typography.Paragraph style={{ margin: 0 }}>{tool.description}</Typography.Paragraph>
      <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: 13, flex: 1 }}>{tool.example}</Typography.Paragraph>
      <div><Button href={tool.href} target="_blank" rel="noopener noreferrer">{tool.action} ↗</Button></div>
    </Card></section>
  </Col>)}</Row>;
}

export function ToolsPage({ onNavigate }: { onNavigate: (key: string) => void }) {
  return <>
    <PageHeader title="开发工具" description="已有工具的用途、入口与使用时机，一处查阅。" actions={<Button type="primary" href={`${explorer}/`} target="_blank" rel="noopener noreferrer">打开 Local Explorer ↗</Button>} />
    <Alert type="info" showIcon title="当前是本地开发环境" description="D1、KV、R2 面板连接当前示例的本地存储，编辑会改变本地预览数据。工具在新标签页打开。" style={{ marginBottom: 24 }} />
    <Tabs items={[
      { key: 'local', label: '本地调试', children: <Space orientation="vertical" size={24} className="demo-stack">
        <section aria-label="本地存储工具"><Typography.Title level={4} style={{ margin: '0 0 16px' }}>数据浏览与编辑</Typography.Title><ToolCards tools={localTools} /></section>
        <section aria-label="请求与调试工具"><Typography.Title level={4} style={{ margin: '0 0 16px' }}>请求与调试</Typography.Title><ToolCards tools={debugTools} /></section>
        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>这些工具由 Cloudflare 开发服务器提供。<Typography.Link href={docs} target="_blank" rel="noopener noreferrer">查看官方使用说明 ↗</Typography.Link></Typography.Paragraph>
      </Space> },
      { key: 'project', label: '项目工具', children: <Space orientation="vertical" size={24} className="demo-stack">
        <section aria-label="项目检查命令"><Typography.Title level={4} style={{ margin: '0 0 8px' }}>检查与构建</Typography.Title><Typography.Paragraph type="secondary">以下命令在 WorkerKit 仓库根目录运行。点击复制命令，再到终端执行。</Typography.Paragraph><Card styles={{ body: { padding: '4px 20px' } }}>{commands.map((item) => <div key={item.command} className="tool-command"><div><Typography.Text strong>{item.title}</Typography.Text><Typography.Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 13 }}>{item.description}</Typography.Paragraph></div><Typography.Paragraph code copyable style={{ margin: 0, overflowWrap: 'anywhere' }}>{item.command}</Typography.Paragraph></div>)}</Card></section>
        <section aria-label="应用内管理工具"><Typography.Title level={4} style={{ margin: '0 0 16px' }}>应用内管理</Typography.Title><Row gutter={[16, 16]}>{projectPages.map((item) => <Col key={item.key} xs={24} md={12}><Card style={{ height: '100%' }}><Typography.Title level={5} style={{ margin: '0 0 8px' }}>{item.title}</Typography.Title><Typography.Paragraph type="secondary">{item.description}</Typography.Paragraph><Button onClick={() => onNavigate(item.key)}>打开{item.title}</Button></Card></Col>)}</Row></section>
      </Space> },
      { key: 'more', label: '按需扩展', children: <Space orientation="vertical" size={24} className="demo-stack">
        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>Local Explorer 还支持以下能力。当前示例没有配置这些资源或处理函数，配置后可在原生面板中使用。</Typography.Paragraph>
        <Row gutter={[16, 16]}>{optionalTools.map((item) => <Col key={item.title} xs={24} md={12}><Card style={{ height: '100%' }}><Flex align="center" justify="space-between" gap={8} wrap><Typography.Title level={5} style={{ margin: 0 }}>{item.title}</Typography.Title><Tag>当前未配置</Tag></Flex><Typography.Paragraph style={{ margin: '12px 0 8px' }}>{item.description}</Typography.Paragraph><Typography.Text type="secondary" style={{ fontSize: 13 }}>需要：{item.requirement}</Typography.Text></Card></Col>)}</Row>
        <Card title="线上资源管理"><Typography.Paragraph>查看已部署的数据库、存储和服务时，前往对应 Cloudflare 账户的控制台，选择实际项目与资源。</Typography.Paragraph><Space wrap><Button href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">打开 Cloudflare 控制台 ↗</Button><Button href={docs} target="_blank" rel="noopener noreferrer">查看工具文档 ↗</Button></Space></Card>
      </Space> },
    ]} />
  </>;
}
