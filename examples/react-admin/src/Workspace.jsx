import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import ManagementPanel from './Management.jsx';
import {
  createOperationsClient,
  formatTime,
  runLabel,
} from '../../ui-demo/operations';

export default function Workspace() {
  const [client] = useState(createOperationsClient);
  const state = useSyncExternalStore(client.subscribe, client.snapshot);
  const [task, setTask] = useState('check-bindings');
  useEffect(() => {
    client.refresh();
    return () => client.dispose();
  }, [client]);
  const data = state.data;
  const manage = data?.user.permissions.includes('tasks:manage');
  return (
    <div data-workspace>
      <div className="workspace-toolbar">
        <Button loading={state.busy} onClick={client.refresh}>
          刷新
        </Button>
        {data && (
          <>
            <ManagementPanel client={client} state={state} />
            <Tag>{data.backend}</Tag>
            <span>{data.user.name}</span>
            <Tag color={data.runtime.ok ? 'success' : 'error'}>
              {data.runtime.ok ? '依赖正常' : '依赖异常'}
            </Tag>
            {["payload", "sonic"].includes(state.data.backend) && <Button href="/admin" type="link">
              管理内容与媒体 ↗
            </Button>}
          </>
        )}
      </div>
      {state.busy && !data && (
        <Alert
          type="info"
          message="正在更新工作台数据…"
          style={{ marginBottom: 16 }}
        />
      )}
      {state.error && (
        <Alert
          type="error"
          message={state.error}
          style={{ marginBottom: 16 }}
        />
      )}
      {state.unauthorized && <Button href={client.loginUrl()}>登录后端</Button>}
      {data && (
        <>
          <Card title="运行诊断" style={{ marginBottom: 20 }}>
            <Table
              rowKey="name"
              dataSource={data.runtime.checks}
              pagination={false}
              columns={[
                { title: '绑定', dataIndex: 'name' },
                { title: '状态', dataIndex: 'status' },
                { title: '耗时（ms）', dataIndex: 'durationMs' },
              ]}
            />
          </Card>
          {manage && (
            <Card title="创建任务计划" style={{ marginBottom: 20 }}>
              <Form
                layout="inline"
                initialValues={{ task: 'check-bindings', minutes: 60 }}
                onFinish={(values) =>
                  client.create(values.task, values.minutes, values.inputs)
                }
              >
                <Form.Item label="执行任务" name="task">
                  <Select
                    onChange={setTask}
                    style={{ minWidth: 180 }}
                    options={data.definitions.map((d) => ({
                      label: d.label,
                      value: d.id,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  label="间隔（分钟）"
                  name="minutes"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} max={10080} />
                </Form.Item>
                {data.definitions
                  .find((d) => d.id === task)
                  ?.fields.map((field) => (
                    <Form.Item
                      key={field.name}
                      label={field.label}
                      name={['inputs', field.name]}
                      rules={[{ required: field.required }]}
                    >
                      <Input />
                    </Form.Item>
                  ))}
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    disabled={state.busy}
                  >
                    创建计划
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          )}
          <Card title="任务计划" style={{ marginBottom: 20 }}>
            <Table
              rowKey="id"
              dataSource={data.plans}
              pagination={false}
              scroll={{ x: 650 }}
              columns={[
                {
                  title: '任务',
                  dataIndex: 'task',
                  render: (task) =>
                    data.definitions.find((d) => d.id === task)?.label || task,
                },
                {
                  title: '频率',
                  render: (_, plan) =>
                    plan.schedule.kind === 'interval'
                      ? `每 ${plan.schedule.minutes} 分钟`
                      : plan.schedule.cron,
                },
                {
                  title: '状态',
                  render: (_, plan) => (plan.scheduleId ? '已启用' : '已暂停'),
                },
                {
                  title: '下次运行',
                  render: (_, plan) =>
                    formatTime(plan.nextAt ? plan.nextAt * 1000 : undefined),
                },
                ...(manage
                  ? [
                      {
                        title: '操作',
                        render: (_, plan) => (
                          <Space>
                            <Button
                              disabled={state.busy}
                              onClick={() => client.change('run', plan.id)}
                            >
                              运行
                            </Button>
                            <Button
                              disabled={state.busy}
                              onClick={() =>
                                client.change(
                                  plan.scheduleId ? 'pause' : 'resume',
                                  plan.id,
                                )
                              }
                            >
                              {plan.scheduleId ? '暂停' : '恢复'}
                            </Button>
                          </Space>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
          <Card title="运行记录与日志">
            <Table
              rowKey="id"
              dataSource={data.runs}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 600 }}
              columns={[
                { title: '时间', dataIndex: 'startedAt', render: formatTime },
                { title: '任务', dataIndex: 'task' },
                {
                  title: '结果',
                  dataIndex: 'status',
                  render: (status) => runLabel[status],
                },
                {
                  title: '日志',
                  render: (_, run) => (
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                      {run.error ||
                        run.output?.logs.join('\n') ||
                        run.progress?.message ||
                        '—'}
                    </pre>
                  ),
                },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}
