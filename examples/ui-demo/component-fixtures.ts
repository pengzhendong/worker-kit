import fixtures from './fixtures.json';

export type DemoTask = (typeof fixtures.tasks)[number];

export const taskColumns = [
  { key: 'name', title: '任务名称' },
  { key: 'app', title: '应用' },
  { key: 'schedule', title: '执行计划' },
  { key: 'status', title: '最近结果' },
  { key: 'lastRun', title: '上次执行' },
] as const;

export const taskFilters = ['全部计划', '已启用', '已暂停'];
export const taskPageSize = 2;

export function createDemoTasks() {
  return fixtures.tasks.map((task) => ({ ...task }));
}

export function filterDemoTasks(
  tasks: DemoTask[],
  query: string,
  filter: string,
) {
  const search = query.trim().toLowerCase();
  return tasks.filter(
    (task) =>
      `${task.name} ${task.app}`.toLowerCase().includes(search) &&
      (filter === '全部计划' || task.enabled === (filter === '已启用')),
  );
}

export function taskValue(
  task: DemoTask,
  key: (typeof taskColumns)[number]['key'],
) {
  if (key !== 'status') return task[key];
  return (
    { success: '成功', warning: '部分失败', paused: '已暂停' }[task.status] ??
    task.status
  );
}

export function runDemoTask(task: DemoTask): DemoTask {
  return {
    ...task,
    status: 'success',
    lastRun: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  };
}

export const demoMedia = fixtures.resources.flatMap(({ name, type, url }) =>
  url ? [{ name, type, url }] : [],
);
