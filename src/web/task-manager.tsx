import { Suspense, useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { Alert, Button, Card, Col, Flex, Form, Input, InputNumber, Modal, Popconfirm, Progress, Row, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import type { TaskDefinition, TaskInputs, TaskOutput, TaskRun } from '../server/task-manager';
import { PageHeader } from './page';
import { scheduleForm } from '../contracts/task-schedule';
import type { ScheduleForm, ScheduleTimeZone, TaskSchedule } from '../contracts/task-schedule';

type Definition = Pick<TaskDefinition, 'label' | 'fields' | 'target'> & { id: string; canPreview?: boolean };
type Plan = { id: string; task: string; schedule: TaskSchedule; inputs: TaskInputs; scheduleId?: string; nextAt?: number };
type Inventory = { definitions: Definition[]; plans: Plan[]; runs: TaskRun[] };
type FormValues = { task: string; schedule: ScheduleForm; inputs: TaskInputs };
type TaskExample = { task: string; label: string; inputs: TaskInputs };
type CodeEditorProps = { value?: string; onChange?: (value: string) => void; id?: string; label: string; readOnly: boolean };

function CodeEditorField({ editor: Editor, ...props }: CodeEditorProps & { editor: ComponentType<CodeEditorProps> }) {
  return <Suspense fallback={<Typography.Text type="secondary">正在加载编辑器…</Typography.Text>}>
    <Editor {...props} />
  </Suspense>;
}
const statuses = { running: '运行中', submitted: '已提交', succeeded: '成功', failed: '失败', unknown: '结果待确认' };
const scheduleLabels = { daily: '每天', weekly: '每周', monthly: '每月', interval: '固定间隔', cron: '自定义 Cron' };
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
function describeSchedule(schedule: TaskSchedule) {
  const form = scheduleForm(schedule);
  if (schedule.kind === 'interval') return '每 ' + schedule.minutes + ' 分钟';
  const zoneLabel = schedule.timeZone ? '北京时间' : 'UTC';
  if (schedule.kind === 'cron') return schedule.cron + ' · ' + zoneLabel;
  const day = schedule.kind === 'weekly' ? weekdays[form.weekday ?? 0] : schedule.kind === 'monthly' ? form.day + ' 日' : '';
  return scheduleLabels[schedule.kind] + ' ' + day + ' ' + form.time + ' ' + zoneLabel;
}
const targetLabels = { cloudflare: 'Cloudflare', github: 'GitHub Actions' };

function defaultInputs(definition?: Definition) {
  return Object.fromEntries((definition?.fields ?? []).flatMap(field => field.defaultValue === undefined ? [] : [[field.name, field.defaultValue]]));
}

type JsonViewer = ComponentType<{ data: object }>;

function parseJsonOutput(value?: string): object | undefined {
  if (!value) return;
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed !== null && typeof parsed === 'object') return parsed;
  } catch { /* Display incomplete JSON and plain text as-is. */ }
}

function Output({ output, error, jsonViewer: Viewer }: { output?: TaskOutput; error?: string; jsonViewer?: JsonViewer }) {
  const data = Viewer && parseJsonOutput(output?.value);
  const text = output && [...output.logs, data ? undefined : output.value].filter(Boolean).join('\n');
  return <>
    {error && <div>{error}</div>}
    {output && (text || (!data && !error)) && <pre style={{ marginBlock: 4, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 160, overflowY: 'auto', fontFamily: 'var(--wk-font-family-code)' }}>
      {text || '无输出'}
    </pre>}
    {data && Viewer && <div style={{ maxHeight: 240, overflow: 'auto', marginBlock: 4 }}>
      <Viewer data={data} />
    </div>}
  </>;
}

export function TaskManagerPanel({ endpoint = '/api/managed-tasks', example, timeZone, codeEditor: CodeEditor, jsonViewer, allowDelete = false }: {
  endpoint?: string; example?: TaskExample; timeZone?: ScheduleTimeZone; codeEditor?: ComponentType<CodeEditorProps>; jsonViewer?: JsonViewer; allowDelete?: boolean;
}) {
  const [data, setData] = useState<Inventory>();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<{ output?: TaskOutput; error?: string }>();
  const [editor, setEditor] = useState<Plan | 'new'>();
  const [editorTab, setEditorTab] = useState('task');
  const [listTab, setListTab] = useState('plans');
  const [form] = Form.useForm<FormValues>();
  const selected = Form.useWatch('task', form);
  const kind = Form.useWatch(['schedule', 'kind'], form);
  const definition = data?.definitions.find(item => item.id === selected);
  const title = (id: string) => data?.definitions.find(item => item.id === id)?.label ?? id;
  const planTitle = (plan: Plan) => plan.inputs.name || title(plan.task);
  const editorTimeZone = typeof editor === 'object' && editor.schedule.kind !== 'interval' ? editor.schedule.timeZone : timeZone;
  const zoneLabel = editorTimeZone ? '北京时间' : 'UTC';
  const codeField = definition?.fields.find(field => field.multiline);
  const workspace = Boolean(editor && CodeEditor && definition?.canPreview && codeField);
  const editorTitle = editor === 'new' ? '新建计划' : '编辑计划';
  const busy = saving || previewing;

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
    setError('');
    setEditorTab('task');
    setPreview(undefined);
    form.resetFields();
    form.setFieldsValue(plan ? { ...plan, schedule: scheduleForm(plan.schedule) } : {
      task: data?.definitions[0]?.id, schedule: { kind: 'daily', time: '00:00', weekday: 1, day: 1, minutes: 60 }, inputs: defaultInputs(data?.definitions[0]),
    });
    setEditor(plan ?? 'new');
  }

  async function runPreview() {
    if (previewing || !definition?.canPreview) return;
    setEditorTab('task');
    const fields = definition.fields.filter(field => !field.saveOnly).map(field => ['inputs', field.name]);
    try { await form.validateFields(fields); } catch { return; }
    setPreview(undefined);
    setPreviewing(true);
    try {
      const response = await fetch(endpoint + '/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: definition.id, inputs: form.getFieldValue('inputs') }),
      });
      const result = await response.json() as { output?: TaskOutput; error?: string };
      setPreview(response.ok || result.error ? result : { error: '试跑失败' });
    } catch { setPreview({ error: '试跑失败，请重试' }); }
    finally { setPreviewing(false); }
  }

  const compactField = workspace ? {
    layout: 'horizontal' as const,
    colon: false,
    labelCol: { xs: 8, style: { flex: '0 0 88px', maxWidth: 'none', display: 'flex', alignItems: 'center', minHeight: 32, paddingBottom: 0 } },
    wrapperCol: { xs: 16, style: { flex: '1 1 0', minWidth: 0, maxWidth: 'none' } },
    style: { marginBottom: 12 },
  } : {};
  const targetField = (
    <Form.Item {...compactField} name="task" label="执行目标" rules={[{ required: true }]}>
      <Select disabled={editor !== 'new' || previewing} onChange={(id: string) => {
        setPreview(undefined);
        form.setFieldValue('inputs', defaultInputs(data?.definitions.find(item => item.id === id)));
      }}
        options={data?.definitions.map(item => ({ value: item.id, label: targetLabels[item.target] + ' · ' + item.label }))} />
    </Form.Item>
  );

  const exampleButton = editor === 'new' && example && example.task === selected && (
    <Button disabled={busy} onClick={() => {
      setPreview(undefined);
      form.setFieldValue('inputs', example.inputs);
    }}>{example.label}</Button>
  );

  const previewButton = <Button size={workspace ? 'small' : 'middle'} loading={previewing}
    disabled={saving} onClick={() => void runPreview()}>试跑脚本</Button>;
  const fields = definition?.fields.map(field => {
    const hasCodeEditor = field.multiline && workspace && CodeEditor;
    const item = <Form.Item {...(!field.multiline && compactField)} key={field.name} name={['inputs', field.name]}
      label={field.label} extra={workspace && field === codeField ? undefined : field.hint}
      rules={[{ required: field.required, whitespace: field.required, max: field.maxLength ?? 500 }]}>
      {hasCodeEditor ? <CodeEditorField editor={hasCodeEditor} label={field.label} readOnly={busy} />
        : field.multiline ? <Input.TextArea rows={5} maxLength={field.maxLength ?? 500} spellCheck={false}
          style={{ fontFamily: 'var(--wk-font-family-code)' }} /> : <Input maxLength={field.maxLength ?? 500} />}
    </Form.Item>;
    return hasCodeEditor && field === codeField ? <div key={field.name} style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', insetBlockStart: 0, insetInlineEnd: 0, zIndex: 1 }}>{previewButton}</div>
      {item}
    </div> : item;
  });

  const scheduleLabelCol = compactField.labelCol && {
    ...compactField.labelCol,
    style: { ...compactField.labelCol.style, flexBasis: 124, flexShrink: 0 },
  };
  const scheduleFields = <>
    <Form.Item {...compactField} labelCol={scheduleLabelCol} name={['schedule', 'kind']} label="运行频率" rules={[{ required: true }]}>
      <Select options={Object.entries(scheduleLabels).map(([value, label]) => ({ value, label }))} />
    </Form.Item>
    {kind === 'weekly' && <Form.Item {...compactField} labelCol={scheduleLabelCol} name={['schedule', 'weekday']} label="星期" rules={[{ required: true }]}>
      <Select options={weekdays.map((label, value) => ({ label, value }))} />
    </Form.Item>}
    {kind === 'monthly' && <Form.Item {...compactField} labelCol={scheduleLabelCol} name={['schedule', 'day']} label="日期" rules={[{ required: true }]}
      extra="当月没有所选日期时跳过。">
      <InputNumber min={1} max={31} precision={0} />
    </Form.Item>}
    {kind && ['daily', 'weekly', 'monthly'].includes(kind) &&
      <Form.Item {...compactField} labelCol={scheduleLabelCol} name={['schedule', 'time']} label={'时间（' + zoneLabel + '）'} rules={[{ required: true }]}>
        <Input type="time" />
      </Form.Item>}
    {kind === 'interval' && <Form.Item {...compactField} labelCol={scheduleLabelCol} name={['schedule', 'minutes']} label="间隔（分钟）"
      rules={[{ required: true }]}>
      <InputNumber min={1} max={10080} precision={0} />
    </Form.Item>}
    {kind === 'cron' && <Form.Item {...compactField} labelCol={scheduleLabelCol} name={['schedule', 'cron']} label={'Cron（' + zoneLabel + '）'} rules={[{ required: true }]}
      extra="例如 0 8 * * * 是每天 08:00。">
      <Input maxLength={100} />
    </Form.Item>}
  </>;

  const previewStatus = previewing ? { color: 'processing', text: '试跑中' }
    : preview ? { color: preview.error ? 'error' : 'success', text: preview.error ? '试跑失败' : '试跑成功' }
      : undefined;
  const previewCard = <Card title="试跑结果" extra={<span role="status">
    {previewStatus && <Tag color={previewStatus.color} style={{ marginInlineEnd: 0 }}>{previewStatus.text}</Tag>}
  </span>}>
    {preview ? <Output {...preview} jsonViewer={jsonViewer} />
      : !previewing && <Typography.Text type="secondary">试跑后在这里查看输出。</Typography.Text>}
  </Card>;
  const closeEditor = () => { if (!busy) { setEditor(undefined); setError(''); } };

  return <>
    {!workspace && <>
      <PageHeader title="自定义计划" placement="header" />
      <Flex vertical gap={16}>
        {error && <Alert type="error" title={error} showIcon closable onClose={() => setError('')} />}
        {data && !data.definitions.length && <Alert type="info" title="还没有注册执行目标" showIcon />}
        <Card>
          <Tabs activeKey={listTab} onChange={setListTab}
            tabBarExtraContent={listTab === 'plans' && (
              <Button type="primary" onClick={() => open()} disabled={!data?.definitions.length || saving}>新建计划</Button>
            )}
            items={[
              { key: 'plans', label: '任务计划', children: (
                <Table<Plan> rowKey="id" size="small" pagination={{ pageSize: 10 }} scroll={{ x: 760 }} loading={!data && !error}
                  dataSource={data?.plans ?? []} columns={[
                    { title: '任务', render: (_, plan) => planTitle(plan) },
                    { title: '运行频率', render: (_, plan) => describeSchedule(plan.schedule) },
                    { title: '下次运行', render: (_, plan) => plan.nextAt ? new Date(plan.nextAt * 1000).toLocaleString(undefined, { timeZone }) : '—' },
                    { title: '状态', render: (_, plan) => <Tag color={plan.scheduleId ? 'green' : 'default'}>{plan.scheduleId ? '已启用' : '已暂停'}</Tag> },
                    { title: '操作', render: (_, plan) => <Space>
                      <Button size="small" disabled={saving} onClick={() => open(plan)}>编辑</Button>
                      <Button size="small" disabled={saving} onClick={() => void mutate(plan.scheduleId ? '/pause' : '/resume', { id: plan.id })}>{plan.scheduleId ? '暂停' : '启用'}</Button>
                      <Button size="small" disabled={saving} onClick={() => void mutate('/run', { id: plan.id })}>运行一次</Button>
                      {allowDelete && <Popconfirm title="删除这个计划？" description="已有运行记录会保留。" okText="删除" cancelText="取消"
                        onConfirm={() => mutate('/delete', { id: plan.id })}>
                        <Button danger size="small" disabled={saving}>删除</Button>
                      </Popconfirm>}
                    </Space> },
                  ]} />
              ) },
              { key: 'runs', label: '最近运行', children: (
                <Table<TaskRun> rowKey="id" size="small" pagination={{ pageSize: 10 }} scroll={{ x: 700 }} dataSource={data?.runs ?? []}
                  columns={[
                    { title: '任务', render: (_, run) => {
                      const plan = data?.plans.find(item => item.id === run.planId);
                      return run.planName || (plan ? planTitle(plan) : title(run.task));
                    } },
                    { title: '开始时间', render: (_, run) => new Date(run.startedAt).toLocaleString(undefined, { timeZone }) },
                    { title: '状态', render: (_, run) => <Tag>{statuses[run.status]}</Tag> },
                    { title: '进度或详情', render: (_, run) => run.output ? <Output output={run.output} error={run.error} jsonViewer={jsonViewer} /> : run.progress ? <div style={{ minWidth: 125 }}>
                      {run.progress.total ? <Progress size="small" percent={Math.round(run.progress.completed / run.progress.total * 100)} /> : run.progress.completed + ' 项'}
                      {run.progress.message}
                    </div> : run.url?.startsWith('https://github.com/') ? <a href={run.url}>查看运行</a> : run.error ?? '—' },
                  ]} />
              ) },
            ]} />
        </Card>
      </Flex>
    </>}
    <Form<FormValues> form={form} layout="vertical" disabled={busy} className={workspace ? 'wk-task-editor' : undefined}
      onFinishFailed={({ errorFields }) => {
        const field = errorFields[0]?.name;
        if (!field) return;
        if (workspace) form.scrollToField(field, { focus: true });
        else setEditorTab(field[0] === 'schedule' ? 'schedule' : 'task');
      }}
      onValuesChange={changed => { if (changed.inputs) setPreview(undefined); }} onFinish={values =>
        void mutate(editor === 'new' ? '' : '/edit', { ...values, schedule: { ...values.schedule, timeZone: editorTimeZone }, id: typeof editor === 'object' ? editor.id : undefined })}>
      {workspace ? <>
        <PageHeader title={editorTitle} placement="header" />
        <Flex vertical gap={16} style={{ flex: 1 }}>
          {error && <Alert type="error" title={error} showIcon />}
          <Row gutter={[16, 16]} align="top">
            <Col xs={24} lg={15}>
              <Card title="任务配置" extra={exampleButton}>
                {targetField}
                {fields}
              </Card>
            </Col>
            <Col xs={24} lg={9}>
              <Flex vertical gap={16}>
                <Card title="运行时间">{scheduleFields}</Card>
                {codeField?.hint && <Typography.Text type="secondary">{codeField.hint}</Typography.Text>}
                {previewCard}
              </Flex>
            </Col>
          </Row>
          <Flex align="center" justify="space-between" wrap gap={8}
            style={{ position: 'sticky', bottom: 0, zIndex: 1, marginBlockStart: 'auto', paddingBlock: 12, background: 'var(--wk-color-layout)' }}>
            <Button type="primary" loading={saving} disabled={previewing} htmlType="submit">保存计划</Button>
            <Button disabled={busy} onClick={closeEditor}>返回计划</Button>
          </Flex>
        </Flex>
      </> : <Modal title={editorTitle} open={!!editor} forceRender centered
        styles={{ body: { maxHeight: 'calc(100dvh - 10rem)', overflowY: 'auto' } }}
        footer={definition?.canPreview ? buttons => <Flex wrap gap={8} justify="space-between">
          {previewButton}
          <Space>{buttons}</Space>
        </Flex> : undefined}
        confirmLoading={saving} okText="保存计划" okButtonProps={{ disabled: previewing }}
        onOk={() => form.submit()} onCancel={closeEditor}>
        {error && editor && <Alert type="error" title={error} showIcon />}
        <Tabs activeKey={editorTab} onChange={setEditorTab} size="small" items={[
          { key: 'task', label: '任务配置', forceRender: true, children: <>
            {targetField}
            {exampleButton && <Form.Item>{exampleButton}</Form.Item>}
            {fields}
            {(preview || previewing) && previewCard}
          </> },
          { key: 'schedule', label: '运行时间', forceRender: true, children: scheduleFields },
        ]} />
      </Modal>}
    </Form>
  </>;
}
