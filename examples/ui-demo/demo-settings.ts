export const demoSettings = {
  name: 'WorkerKit 工作空间',
  description: '我的 Worker 应用与自动化任务',
  timezone: 'Asia/Shanghai',
  retention: 30,
  failureNotice: true,
  dailyDigest: false,
};

export const demoTimezones = ['Asia/Shanghai', 'Asia/Hong_Kong', 'UTC'];

export function validDemoRetention(value: number | null) {
  return value !== null && Number.isInteger(value) && value >= 1 && value <= 90;
}

export function readDemoSettings(key: string): typeof demoSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (stored && typeof stored.name === 'string') {
      return { ...demoSettings, ...stored };
    }
  } catch {
    // A demo can still be edited if browser storage is unavailable.
  }
  return { ...demoSettings };
}

export function demoSettingsKey(base: string) {
  return `workerkit-${base.split('/').filter(Boolean).join('-') || 'demo'}-settings`;
}
