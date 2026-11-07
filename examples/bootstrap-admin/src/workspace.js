import { managementPanel } from '../../ui-demo/management-bootstrap';
import {
  createOperationsClient,
  formatTime,
  runLabel,
} from '../../ui-demo/operations';
const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
export const operations = createOperationsClient();
export function workspace() {
  const { data, busy, error, unauthorized } = operations.snapshot();
  const disabled = busy ? 'disabled' : '';
  const panel = (title, content) =>
    `<section class="card mb-4"><div class="card-header"><h2 class="card-title">${title}</h2></div><div class="card-body">${content}</div></section>`;
  const button = (action, label, id = '') =>
    `<button class="btn btn-sm btn-outline-primary" data-workspace-action="${action}" data-plan="${escape(id)}" ${disabled}>${label}</button>`;
  let html = `<div data-workspace><div class="d-flex mb-3">${button('refresh', '刷新')}</div>${busy && !data ? '<div class="alert alert-info" role="status">正在更新工作台数据…</div>' : ''}${error ? `<div class="alert alert-danger" role="alert">${escape(error)}</div>` : ''}${unauthorized ? `<a class="btn btn-primary" href="${operations.loginUrl()}">登录后端</a>` : ''}`;
  if (!data) return html + '</div>';
  html += managementPanel(operations.snapshot(), operations);
  const manage = data.user.permissions.includes('tasks:manage');
  html += `<p class="my-4">${escape(data.backend)} · ${escape(data.user.name)} · ${data.runtime.ok ? '依赖正常' : '依赖异常'}${['payload','sonic'].includes(data.backend) ? ' · <a href="/admin">管理内容与媒体 ↗</a>' : ''}</p>`;
  html += panel(
    '运行诊断',
    data.runtime.checks
      .map(
        (c) =>
          `<div class="d-flex justify-content-between py-2"><strong>${escape(c.name)}</strong><span>${escape(c.status)} · ${c.durationMs} ms</span></div>`,
      )
      .join(''),
  );
  if (manage)
    html += panel(
      '创建任务计划',
      `<form id="workspace-create" class="d-flex gap-3 flex-wrap align-items-end"><label>执行任务<select name="task" class="form-select">${data.definitions
        .filter((d) => !d.fields.length)
        .map(
          (d) => `<option value="${escape(d.id)}">${escape(d.label)}</option>`,
        )
        .join(
          '',
        )}</select></label><label>间隔（分钟）<input class="form-control" name="minutes" type="number" min="1" max="10080" value="60" required></label><button type="submit" class="btn btn-primary" ${disabled}>创建计划</button></form>`,
    );
  html += panel(
    '任务计划',
    data.plans
      .map(
        (p) =>
          `<div class="d-flex gap-3 justify-content-between flex-wrap py-3"><div><strong>${escape(data.definitions.find((d) => d.id === p.task)?.label || p.task)}</strong><p class="text-secondary small">${escape(p.schedule.kind === 'interval' ? `每 ${p.schedule.minutes} 分钟` : p.schedule.cron)} · ${p.scheduleId ? '已启用' : '已暂停'} · 下次 ${escape(formatTime(p.nextAt ? p.nextAt * 1000 : undefined))}</p></div>${manage ? `<div class="d-flex gap-2 align-items-start">${button('run', '运行', p.id)}${button(p.scheduleId ? 'pause' : 'resume', p.scheduleId ? '暂停' : '恢复', p.id)}</div>` : ''}</div>`,
      )
      .join('') || '<p>暂无计划，请创建第一个任务。</p>',
  );
  html += panel(
    '运行记录与日志',
    data.runs
      .map(
        (r) =>
          `<article class="border-bottom py-3"><div class="d-flex justify-content-between"><span>${escape(formatTime(r.startedAt))}</span><strong>${escape(runLabel[r.status])}</strong></div><p>${escape(r.task)} · ${escape(r.progress?.message)}</p><pre style="white-space:pre-wrap">${escape(r.error || r.output?.logs.join('\n'))}</pre></article>`,
      )
      .join('') || '<p>暂无运行记录。</p>',
  );
  return html + '</div>';
}
