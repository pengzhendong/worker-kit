import fixtures from './fixtures.json';
import { ref } from 'vue';

const base = import.meta.env.BASE_URL;
export type Task = {
  id: number; name: string; description: string; app: string;
  schedule: string; status: 'success' | 'warning' | 'paused' | 'running';
  lastRun: string; duration: string; enabled: boolean;
};
export const tasks = ref<Task[]>(structuredClone(fixtures.tasks) as Task[]);
export const statusInfo = {
  success: { label: '成功', color: 'success' as const, icon: 'i-lucide-circle-check' },
  warning: { label: '部分失败', color: 'warning' as const, icon: 'i-lucide-triangle-alert' },
  paused: { label: '已暂停', color: 'neutral' as const, icon: 'i-lucide-circle-pause' },
  running: { label: '运行中', color: 'info' as const, icon: 'i-lucide-loader-circle' },
};
export const services = fixtures.services;
export type Resource = { id: string; name: string; type: 'image' | 'audio' | 'video' | 'document'; size: string; date: string; tag: string; url?: string; local?: boolean };
export const resources = ref<Resource[]>(structuredClone(fixtures.resources).map(r => ({ ...r, url: r.url ? base + r.url : undefined })) as Resource[]);
export const resourceTypes = {
  image: { label: '图片', icon: 'i-lucide-image', color: 'blue' },
  audio: { label: '音频', icon: 'i-lucide-audio-lines', color: 'amber' },
  video: { label: '视频', icon: 'i-lucide-clapperboard', color: 'violet' },
  document: { label: '文档', icon: 'i-lucide-file-text', color: 'emerald' },
};
export type Log = { id: number; time: string; level: 'info' | 'warn' | 'error'; app: string; message: string; duration: string };
export const logs = ref<Log[]>(structuredClone(fixtures.logs) as Log[]);
let logId = 100;
export function addLog(app: string, message: string) {
  logs.value.unshift({ id: logId++, time: new Date().toLocaleTimeString('zh-CN', { hour12: false }), level: 'info', app, message, duration: '1.2 s' });
}
export async function runDemoTask(task: Task) {
  if (task.status === 'running') return;
  task.status = 'running';
  await new Promise(resolve => setTimeout(resolve, 1200));
  task.status = 'success';
  task.lastRun = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  task.duration = '1.2 s';
  addLog(task.app, `演示任务「${task.name}」执行完成`);
}
