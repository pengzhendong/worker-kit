export type ScheduleKind = 'daily' | 'weekly' | 'monthly' | 'interval' | 'cron';
export type ScheduleForm = { kind: ScheduleKind; time?: string; weekday?: number; day?: number; minutes?: number; cron?: string };
export type TaskSchedule = { kind: 'cron' | 'daily' | 'weekly' | 'monthly'; cron: string } | { kind: 'interval'; minutes: number };

const integerBetween = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

export function parseTaskSchedule(input: ScheduleForm): TaskSchedule {
  switch (input?.kind) {
    case 'interval':
      if (!integerBetween(input.minutes, 1, 10080)) throw new Error('间隔须为 1–10080 分钟的整数');
      return { kind: 'interval', minutes: input.minutes };
    case 'cron': {
      const cron = typeof input.cron === 'string' ? input.cron.trim().replace(/\s+/g, ' ') : '';
      if (cron.length > 100 || cron.split(' ').length !== 5) throw new Error('请输入五字段 UTC Cron');
      return { kind: 'cron', cron };
    }
    case 'daily':
    case 'weekly':
    case 'monthly': {
      if (typeof input.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('请选择有效的 UTC 时间');
      const [hour, minute] = input.time.split(':').map(Number);
      if (input.kind === 'weekly' && !integerBetween(input.weekday, 0, 6)) throw new Error('请选择星期');
      if (input.kind === 'monthly' && !integerBetween(input.day, 1, 31)) throw new Error('请选择日期');
      return {
        kind: input.kind,
        cron: [minute, hour, input.kind === 'monthly' ? input.day : '*', '*', input.kind === 'weekly' ? input.weekday : '*'].join(' '),
      };
    }
    default: throw new Error('请选择运行频率');
  }
}

export function scheduleForm(schedule: TaskSchedule): ScheduleForm {
  if (schedule.kind === 'interval') return schedule;
  if (schedule.kind === 'cron') return schedule;
  const [minute, hour, day, , weekday] = schedule.cron.split(' ');
  return { kind: schedule.kind, time: [hour, minute].map(value => value.padStart(2, '0')).join(':'), day: Number(day) || 1, weekday: Number(weekday) || 0 };
}
