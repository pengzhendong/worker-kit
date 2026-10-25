import { defineModules } from '@pengzhendong/worker-kit/modules';

/** Shared metadata only. React pages and Hono handlers stay in their respective entry points. */
export const dashboardModules = defineModules([
  { id: 'overview', label: '工作台', path: '/overview', icon: 'overview', navigation: { placement: 'sidebar', order: 10 }, actions: { read: '查看概览', diagnose: '检查依赖连接' }, access: 'read' },
  { id: 'resources', label: '资源管理', path: '/resources', icon: 'resources', navigation: { placement: 'sidebar', order: 20 }, actions: { read: '查看', create: '新增', update: '编辑', delete: '删除', batch: '批量变更', export: '导出' }, access: 'read' },
  { id: 'files', label: '文件管理', path: '/files', icon: 'files', navigation: { placement: 'sidebar', order: 30 }, actions: { read: '查看列表', upload: '上传', download: '下载', delete: '删除' }, access: 'read' },
  { id: 'audit', label: '操作日志', path: '/audit', icon: 'audit', navigation: { placement: 'sidebar', order: 40 }, actions: { read: '查看日志', prune: '清理过期日志' }, access: 'read' },
  { id: 'api', label: 'API 中心', path: '/api', icon: 'code', navigation: { placement: 'user', order: 30 }, actions: { read: '查看接口文档', tokens: '查看访问令牌', issue: '创建访问令牌', revoke: '撤销访问令牌' }, access: 'read' },
  { id: 'components', label: '组件与交互', path: '/components', icon: 'components', navigation: { placement: 'sidebar', order: 50 }, actions: {} },
  { id: 'account', label: '当前账户', path: '/account', icon: 'account', navigation: { placement: 'user', order: 10 }, actions: {} },
  { id: 'settings', label: '系统设置', path: '/settings', icon: 'settings', navigation: { placement: 'user', order: 20 }, actions: { read: '查看设置', update: '保存设置' }, access: 'read' },
] as const);
export type DashboardModuleId = typeof dashboardModules[number]['id'];
