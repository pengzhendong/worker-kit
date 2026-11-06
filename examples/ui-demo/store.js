import fixtures from './fixtures.json';
export const base = import.meta.env.BASE_URL;
export const state = structuredClone(fixtures);
state.resources = state.resources.map(resource => ({ ...resource, url: resource.url ? base + resource.url : undefined }));
const listeners = new Set();
let revision = 0;
export const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const snapshot = () => revision;
export function changed() { revision++; listeners.forEach(listener => listener()); }
export async function runTask(task) {
  if (task.status === 'running') return;
  task.status = 'running'; changed();
  await new Promise(resolve => setTimeout(resolve, 1200));
  task.status = 'success'; task.lastRun = new Date().toLocaleTimeString('zh-CN', { hour12: false }); task.duration = '1.2 s';
  state.logs.unshift({ id: Date.now(), app: task.app, time: task.lastRun, level: 'info', duration: '1.2 s', message: `演示任务「${task.name}」执行完成` }); changed();
}
export function createTask(values) { state.tasks.unshift({ ...values, id: Date.now(), description: '新建演示任务', status: 'paused', lastRun: '尚未执行', duration: '—', enabled: false }); changed(); }
export function addFiles(files) {
  if (files.some(file => file.size > 100 * 1024 * 1024)) throw Error('单个文件不能超过 100 MB');
  for (const file of files) state.resources.unshift({ id: crypto.randomUUID(), name: file.name, type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'document', size: `${Math.ceil(file.size / 1024)} KB`, date: '刚刚', tag: '本地文件', url: URL.createObjectURL(file) });
  changed();
}
export const statusText = { success: '成功', warning: '部分失败', paused: '已暂停', running: '运行中' };
export function exportLogs(logs) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'workerkit-demo-logs.json'; a.click(); URL.revokeObjectURL(url);
}
