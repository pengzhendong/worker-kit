import { adminManagementPermissions } from '@pengzhendong/worker-kit/management';
import {
  defineModules,
  listModulePermissions,
} from '@pengzhendong/worker-kit/modules';

export const modules = defineModules([
  {
    id: 'tasks',
    label: '任务与运行记录',
    path: '/nuxt/workspace',
    actions: { read: '查看任务与运行记录', manage: '管理和执行任务' },
    access: 'read',
  },
  {
    id: 'runtime',
    label: '运行台',
    path: '/admin/workerkit',
    actions: { read: '查看运行状态', run: '执行依赖检查' },
    access: 'read',
  },
  {
    id: 'notes',
    label: '演示记录',
    path: '/admin/collections/notes',
    actions: { read: '查看记录', create: '新建记录', update: '变更状态' },
    access: 'read',
  },
] as const);
export const isAdmin = (user: unknown): boolean =>
  Boolean(
    user && typeof user === 'object' && 'role' in user && user.role === 'admin',
  );
export const grants = (user: unknown): string[] =>
  isAdmin(user)
    ? [...listModulePermissions(modules), ...adminManagementPermissions]
    : user
      ? ['runtime:read', 'notes:read', 'tasks:read']
      : [];
