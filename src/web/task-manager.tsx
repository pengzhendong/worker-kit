import { useEffect, useState } from 'react';
import { Alert, Button, Card, Flex, Form, Input, InputNumber, Modal, Progress, Select, Space, Table, Tag } from 'antd';
import type { TaskDefinition, TaskInputs, TaskRun } from '../server/task-manager';
import { PageHeader } from './page';
import { scheduleForm } from '../contracts/task-schedule';
import type { ScheduleForm, TaskSchedule } from '../contracts/task-schedule';

type Definition = Pick<TaskDefinition, 'label' | 'fields' | 'target'> & { id: string };
type Plan = { id: string; task: string; schedule: TaskSchedule; inputs: TaskInputs; scheduleId?: string; nextAt?: number };
type Inventory = { definitions: Definition[]; plans: Plan[]; runs: TaskRun[] };
type FormValues = { task: string; schedule: ScheduleForm; inputs: TaskInputs };
const statuses = { running: '运行中', submitted: '已提交', succeeded: '成功', failed: '失败', unknown: '结果待确认' };
const scheduleLabels = { daily: '每天', weekly: '每周', monthly: '每月', interval: '固定间隔', cron: '自定义 Cron' };
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
function describeSchedule(schedule: TaskSchedule) {
  const form = scheduleForm(schedule);
  if (schedule.kind === 'interval') return '每 ' + schedule.minutes + ' 分钟';
  if (schedule.kind === 'cron') return schedule.cron + ' · UTC';
  const day = schedule.kind === 'weekly' ? weekdays[form.weekday ?? 0] : schedule.kind === 'monthly' ? form.day + ' 日' : '';
  return scheduleLabels[schedule.kind] + ' ' + day + ' ' + form.time + ' UTC';
}
const targetLabels = { cloudflare: 'Cloudflare', github: 'GitHub Actions' };

export function TaskManagerPanel({ endpoint = '/api/managed-tasks' }: { endpoint?: string }) {
  const [data, setData] = useState<Inventory>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<Plan | 'new'>();
  const [form] = Form.useForm<FormValues>();
  const selected = Form.useWatch('task', form);
  const kind = Form.useWatch(['schedule', 'kind'], form);
  const definition = data?.definitions.find(item => item.id === selected);
  const title = (id: string) => data?.definitions.find(item => item.id === id)?.label ?? id;

  async function read(signal?: AbortSignal) {
    const response = await fetch(endpoint, { signal });
    if (!response.ok) throw new Error('无法读取任务（HTTP ' + response.status + '）');
    const inventory: Inventory = await response.json();
    if (!signal?.aborted) setData(inventory);
  }

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try { await read(controller.signal); }
      catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : '读取失败');
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 4000);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [endpoint]);

  async function mutate(path: string, body: object) {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(endpoint + path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const value = await response.json() as { error?: string };
      if (!response.ok) throw new Error(value.error ?? '任务操作失败');
      setEditor(undefined);
      await read();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '任务操作失败');
    } finally { setSaving(false); }
  }

  function open(plan?: Plan) {
    form.resetFields();
    form.setFieldsValue(plan ? { ...plan, schedule: scheduleForm(plan.schedule) } : {
      task: data?.definitions[0]?.id, schedule: { kind: 'daily', time: '00:00', weekday: 1, day: 1, minutes: 60 }, inputs: {},
    });
    setEditor(plan ?? 'new');
  }

  return <>
    <PageHeader title="自定义计划" description="选择已注册的执行目标，配置运行时间并查看每次执行。"
      actions={<Button type="primary" onClick={() => open()} disabled={!data?.definitions.length || saving}>新建计划</Button>} />
    <Flex vertical gap={16}>
      {error && <Alert type="error" title={error} showIcon closable onClose={() => setError('')} />}
      {data && !data.definitions.length && <Alert type="info" title="还没有注册执行目标" showIcon />}
      <Card title="任务计划">
        <Table<Plan> rowKey="id" size="small" pagination={{ pageSize: 10 }} scroll={{ x: 760 }} loading={!data && !error}
          dataSource={data?.plans ?? []} columns={[
            { title: '任务', render: (_, plan) => title(plan.task) },
            { title: '运行频率', render: (_, plan) => describeSchedule(plan.schedule) },
            { title: '下次运行', render: (_, plan) => plan.nextAt ? new Date(plan.nextAt * 1000).toLocaleString() : '—' },
            { title: '状态', render: (_, plan) => <Tag color={plan.scheduleId ? 'green' : 'default'}>{plan.scheduleId ? '已启用' : '已暂停'}</Tag> },
            { title: '操作', render: (_, plan) => <Space>
              <Button size="small" disabled={saving} onClick={() => open(plan)}>编辑</Button>
              <Button size="small" disabled={saving} onClick={() => void mutate(plan.scheduleId ? '/pause' : '/resume', { id: plan.id })}>{plan.scheduleId ? '暂停' : '启用'}</Button>
              <Button size="small" disabled={saving} onClick={() => void mutate('/run', { id: plan.id })}>运行一次</Button>
            </Space> },
          ]} />
      </Card>
      <Card title="最近运行">
        <Table<TaskRun> rowKey="id" size="small" pagination={{ pageSize: 10 }} scroll={{ x: 700 }} dataSource={data?.runs ?? []}
          columns={[
            { title: '任务', render: (_, run) => title(run.task) },
            { title: '开始时间', render: (_, run) => new Date(run.startedAt).toLocaleString() },
            { title: '状态', render: (_, run) => <Tag>{statuses[run.status]}</Tag> },
            { title: '进度或详情', render: (_, run) => run.progress ? <div style={{ minWidth: 125 }}>
              {run.progress.total ? <Progress size="small" percent={Math.round(run.progress.completed / run.progress.total * 100)} /> : run.progress.completed + ' 项'}
              {run.progress.message}
            </div> : run.url?.startsWith('https://github.com/') ? <a href={run.url}>查看运行</a> : run.error ?? '—' },
          ]} />
      </Card>
    </Flex>
    <Modal title={editor === 'new' ? '新建计划' : '编辑计划'} open={!!editor} forceRender
      confirmLoading={saving} onOk={() => form.submit()} onCancel={() => { if (!saving) setEditor(undefined); }}>
      <Form<FormValues> form={form} layout="vertical" onFinish={values =>
        void mutate(editor === 'new' ? '' : '/edit', { ...values, id: typeof editor === 'object' ? editor.id : undefined })}>
        {error && editor && <Alert type="error" title={error} showIcon />}
        <Form.Item name="task" label="执行目标" rules={[{ required: true }]}>
          <Select disabled={editor !== 'new'} onChange={() => form.setFieldValue('inputs', {})}
            options={data?.definitions.map(item => ({ value: item.id, label: targetLabels[item.target] + ' · ' + item.label }))} />
        </Form.Item>
        <Form.Item name={['schedule', 'kind']} label="运行频率" rules={[{ required: true }]}>
          <Select options={Object.entries(scheduleLabels).map(([value, label]) => ({ value, label }))} />
        </Form.Item>
        {kind === 'weekly' && <Form.Item name={['schedule', 'weekday']} label="星期" rules={[{ required: true }]}>
          <Select options={weekdays.map((label, value) => ({ label, value }))} />
        </Form.Item>}
        {kind === 'monthly' && <Form.Item name={['schedule', 'day']} label="日期" rules={[{ required: true }]}
          extra="当月没有所选日期时跳过。">
          <InputNumber min={1} max={31} precision={0} />
        </Form.Item>}
        {kind && ['daily', 'weekly', 'monthly'].includes(kind) &&
          <Form.Item name={['schedule', 'time']} label="时间（UTC）" rules={[{ required: true }]}
            extra="北京时间比 UTC 快 8 小时。">
            <Input type="time" />
          </Form.Item>}
        {kind === 'interval' && <Form.Item name={['schedule', 'minutes']} label="间隔（分钟）"
          rules={[{ required: true }]}>
          <InputNumber min={1} max={10080} precision={0} />
        </Form.Item>}
        {kind === 'cron' && <Form.Item name={['schedule', 'cron']} label="Cron（UTC）" rules={[{ required: true }]}
          extra="例如 0 0 * * * 是每天北京时间 08:00。">
          <Input maxLength={100} />
        </Form.Item>}
        {definition?.fields.map(field => <Form.Item key={field.name} name={['inputs', field.name]} label={field.label}
          preserve={false} rules={[{ required: field.required }]}>
          <Input maxLength={500} />
        </Form.Item>)}
      </Form>
    </Modal>
  </>;
}
