import { useState, type ReactNode } from 'react';
import '../../ui-demo/component-gallery.css';
import DemoFiles from './DemoFiles';
import {
  createDemoTasks,
  demoMedia,
  filterDemoTasks,
  runDemoTask,
  taskFilters,
  taskPageSize,
  type DemoTask,
} from '../../ui-demo/component-fixtures';
import {
  demoSettings,
  demoSettingsKey,
  demoTimezones,
  readDemoSettings,
  validDemoRetention,
} from '../../ui-demo/demo-settings';

type Controls = {
  card: (content: ReactNode) => ReactNode;
  button: (
    label: string,
    onClick?: () => void,
    disabled?: boolean,
    primary?: boolean,
  ) => ReactNode;
  input: (
    label: string,
    value: string,
    change: (value: string) => void,
  ) => ReactNode;
  description: (value: string, change: (value: string) => void) => ReactNode;
  select: (
    label: string,
    value: string,
    options: string[],
    change: (value: string) => void,
  ) => ReactNode;
  retention: (
    value: number | null,
    change: (value: number | null) => void,
  ) => ReactNode;
  toggle: (
    label: string,
    value: boolean,
    change: (value: boolean) => void,
  ) => ReactNode;
  table: (
    rows: DemoTask[],
    run: (task: DemoTask) => void,
    toggle: (task: DemoTask, enabled: boolean) => void,
  ) => ReactNode;
  dialog: (
    open: boolean,
    confirming: boolean,
    close: () => void,
    complete: () => void,
  ) => ReactNode;
  statuses: () => ReactNode;
};

export default function ComponentDemos({
  kind,
  title,
  controls,
  toggleTheme,
}: {
  kind: string;
  title: string;
  controls: Controls;
  toggleTheme: () => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(taskFilters[0]);
  const [tasks, setTasks] = useState(createDemoTasks);
  const [page, setPage] = useState(1);
  const [taskResult, setTaskResult] = useState('');
  const filtered = filterDemoTasks(tasks, query, filter);
  const pageCount = Math.max(1, Math.ceil(filtered.length / taskPageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice(
    (currentPage - 1) * taskPageSize,
    currentPage * taskPageSize,
  );
  function updateTask(next: DemoTask) {
    setTasks((tasks) =>
      tasks.map((task) => (task.id === next.id ? next : task)),
    );
  }
  const settingsKey = demoSettingsKey(import.meta.env.BASE_URL);
  const [settings, setSettings] = useState<
    Omit<typeof demoSettings, 'retention'> & { retention: number | null }
  >(() =>
    kind === 'form' ? readDemoSettings(settingsKey) : { ...demoSettings },
  );
  const [saveResult, setSaveResult] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [dialogResult, setDialogResult] = useState('');
  function showDialog(confirm: boolean) {
    setConfirming(confirm);
    setOpen(true);
  }
  const [long, setLong] = useState(false);
  const {
    card,
    button,
    input,
    description,
    select,
    retention,
    toggle,
    table,
    dialog,
    statuses,
  } = controls;
  function updateSetting<K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }
  function save() {
    setSubmitted(true);
    setSaveResult('');
    if (!settings.name.trim() || !validDemoRetention(settings.retention))
      return;
    try {
      localStorage.setItem(settingsKey, JSON.stringify(settings));
      setSaveResult('演示设置已保存到当前浏览器');
    } catch {
      setSaveResult('浏览器存储不可用');
    }
  }

  if (kind === 'gallery')
    return (
      <iframe
        className="component-gallery"
        src={import.meta.env.BASE_URL + 'gallery/?embed=1'}
        title="组件目录"
      />
    );
  if (kind === 'preview')
    return card(
      <DemoFiles
        samples={demoMedia}
        pick={(open) => button('选择文件', open)}
        sampleButton={(label, active, open) =>
          button(label, open, false, active)
        }
      />,
    );
  return (
    <section className="react-component-demo">
      <header>
        <h1>{title}</h1>
        <p>原生组件演示，操作在当前浏览器内完成。</p>
      </header>
      {kind === 'table' &&
        card(
          <>
            <div className="demo-field">
              {input('搜索任务', query, (value) => {
                setQuery(value);
                setPage(1);
              })}
            </div>
            <div className="demo-field">
              {select('任务状态筛选', filter, taskFilters, (value) => {
                setFilter(value);
                setPage(1);
              })}
            </div>
            <div className="demo-table-scroll">
              {table(
                rows,
                (task) => {
                  updateTask(runDemoTask(task));
                  setTaskResult(`已模拟运行：${task.name}`);
                },
                (task, enabled) => {
                  updateTask({ ...task, enabled });
                  if (filter !== '全部计划') setPage(1);
                },
              )}
            </div>
            {filtered.length ? (
              <div className="react-component-actions" aria-label="任务分页">
                {button(
                  '上一页',
                  () => setPage(currentPage - 1),
                  currentPage === 1,
                )}
                <span>
                  第 {currentPage} / {pageCount} 页 · 共 {filtered.length}{' '}
                  个任务
                </span>
                {button(
                  '下一页',
                  () => setPage(currentPage + 1),
                  currentPage === pageCount,
                )}
              </div>
            ) : (
              <p role="status">没有匹配的任务</p>
            )}
            {taskResult && <p role="status">{taskResult}</p>}
          </>,
        )}
      {kind === 'form' &&
        card(
          <form
            className="react-component-demo"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <div className="demo-field">
              {input('工作空间名称', settings.name, (value) =>
                updateSetting('name', value),
              )}
            </div>
            {submitted && !settings.name.trim() && (
              <p role="alert">请输入工作空间名称</p>
            )}
            <div className="demo-field">
              {description(settings.description, (value) =>
                updateSetting('description', value),
              )}
            </div>
            <div className="demo-field">
              {select('显示时区', settings.timezone, demoTimezones, (value) =>
                updateSetting('timezone', value),
              )}
            </div>
            <div className="demo-field">
              {retention(settings.retention, (value) =>
                updateSetting('retention', value),
              )}
            </div>
            {submitted && !validDemoRetention(settings.retention) && (
              <p role="alert">保留天数应为 1–90 的整数</p>
            )}
            {toggle('任务失败提醒', settings.failureNotice, (value) =>
              updateSetting('failureNotice', value),
            )}
            {toggle('每日运行摘要', settings.dailyDigest, (value) =>
              updateSetting('dailyDigest', value),
            )}
            <div>{button('保存设置', save)}</div>
            {saveResult && <p role="status">{saveResult}</p>}
          </form>,
        )}
      {kind === 'dialogs' &&
        card(
          <>
            <div className="react-component-actions">
              {button('打开示例弹窗', () => showDialog(false), false, true)}
              {button('打开确认弹窗', () => showDialog(true))}
            </div>
            {dialog(
              open,
              confirming,
              () => setOpen(false),
              () => {
                setDialogResult(
                  confirming ? '已确认演示操作' : '已完成演示操作',
                );
                setOpen(false);
              },
            )}
            {dialogResult && <p role="status">{dialogResult}</p>}
          </>,
        )}
      {kind === 'layout' && (
        <>
          <div>
            {button(long ? '收起长内容' : '填充长内容', () => setLong(!long))}
          </div>
          <div className="react-component-grid">
            {Array.from({ length: long ? 36 : 6 }, (_, i) => (
              <div key={i}>{card(<>布局卡片 {i + 1}</>)}</div>
            ))}
          </div>
        </>
      )}
      {kind === 'theme' &&
        card(
          <div className="react-component-actions">
            {button('切换示例主题', toggleTheme)}
            {button('主要按钮', undefined, false, true)}
            {button('次要按钮')}
            {button('禁用按钮', undefined, true)}
            {statuses()}
          </div>,
        )}
    </section>
  );
}
