import { useLayoutEffect, useRef, useState } from 'react';
import '@mantine/core/styles.css';
import {
  MantineProvider,
  AppShell,
  Burger,
  NavLink,
  Button,
  Group,
  Text,
  Stack,
  Card,
  TextInput,
  Select,
  Switch,
  Badge,
  Alert,
  Table,
  Modal,
} from '@mantine/core';
import { useWorkspace, formatTime, runLabel } from './useWorkspace';
import { componentMenu, initialComponent, groups } from './demo-navigation';
import Demos from './MantineDemos';
export default function App() {
  const [dark, setDark] = useState(false),
    [drawer, setDrawer] = useState(false),
    [page, setPage] = useState(initialComponent ?? 'workspace');
  const content = useRef<HTMLElement>(null);
  const title = groups
    .flatMap((group) => group.items)
    .find((item) => item.id === page)?.label;
  const demo = componentMenu.some((item) => item.id === page);
  const shows = (section: string) => page === 'workspace' || page === section;
  function select(id: string) {
    setPage(id);
    setDrawer(false);
  }
  useLayoutEffect(() => {
    content.current?.scrollTo({ top: 0 });
  }, [page]);
  const {
      client,
      state,
      values,
      setValues,
      name,
      setName,
      days,
      setDays,
      confirm,
      setConfirm,
      task,
      setTask,
      minutes,
      setMinutes,
      inputs,
      setInputs,
    } = useWorkspace(!initialComponent),
    data = state.data,
    management = data?.management;
  return (
    <MantineProvider forceColorScheme={dark ? 'dark' : 'light'}>
      <AppShell
        header={{ height: 64 }}
        navbar={{
          width: 240,
          breakpoint: 'md',
          collapsed: { mobile: !drawer },
        }}
        padding={0}
      >
        <AppShell.Header data-library-header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger
                hiddenFrom="md"
                opened={drawer}
                onClick={() => setDrawer(!drawer)}
                aria-label="打开侧边栏"
              />
              <Text fw={700}>WorkerKit · Mantine</Text>
            </Group>
            <Button
              variant="subtle"
              aria-label="切换深色主题"
              onClick={() => setDark(!dark)}
            >
              {dark ? '浅色' : '深色'}
            </Button>
          </Group>
        </AppShell.Header>
        <AppShell.Navbar
          p="sm"
          component="nav"
          aria-label="工作台导航"
          style={{ overflowY: 'auto' }}
        >
          {groups.map(({ title, items }) => (
            <section key={title}>
              {title && (
                <Text size="xs" c="dimmed" fw={600} px="sm" my="xs">
                  {title}
                </Text>
              )}
              {items.map((item) => (
                <NavLink
                  key={item.id}
                  component="button"
                  label={item.label}
                  leftSection={<item.icon style={{ fontSize: 18 }} />}
                  active={page === item.id}
                  aria-current={page === item.id ? 'page' : undefined}
                  onClick={() => select(item.id)}
                />
              ))}
            </section>
          ))}
        </AppShell.Navbar>
        <AppShell.Main>
          <main
            ref={content}
            className="library-content"
            data-library-scroll
            data-workspace={demo ? undefined : ''}
          >
            {demo ? (
              <Demos
                key={page}
                kind={page}
                title={title || '组件体验'}
                toggleTheme={() => setDark(!dark)}
              />
            ) : (
              <Stack gap="lg">
                <div className="library-toolbar">
                  <div>
                    <h1>{title}</h1>
                    <p>Mantine 原生组件 · 当前后端真实数据</p>
                  </div>
                  <Button
                    variant="outline"
                    disabled={state.busy}
                    onClick={() => client.refresh()}
                  >
                    刷新
                  </Button>
                </div>
                {state.error && <Alert color="red">{state.error}</Alert>}
                {state.unauthorized && (
                  <Button component="a" href={client.loginUrl()}>
                    登录后端
                  </Button>
                )}
                {data && (
                  <>
                    <Group gap="md">
                      <Badge>{data.backend}</Badge>
                      <span>{data.user.name}</span>
                      <Badge color={data.runtime.ok ? 'green' : 'red'}>
                        {data.runtime.ok ? '依赖正常' : '依赖异常'}
                      </Badge>
                    </Group>
                    {shows('settings') && management?.settings && (
                      <Card withBorder padding="lg">
                        <h2>KV 设置</h2>
                        <form
                          className="library-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void client.saveSettings(values);
                          }}
                        >
                          {Object.entries(values).map(([key, value]) =>
                            typeof value === 'boolean' ? (
                              <Switch
                                key={key}
                                label="维护模式"
                                checked={value}
                                onChange={(e) =>
                                  setValues({
                                    ...values,
                                    [key]: e.currentTarget.checked,
                                  })
                                }
                              />
                            ) : (
                              <TextInput
                                key={key}
                                label={
                                  key === 'siteTitle'
                                    ? '站点名称'
                                    : '刷新间隔（秒）'
                                }
                                type={
                                  typeof value === 'number' ? 'number' : 'text'
                                }
                                value={value}
                                onChange={(e) =>
                                  setValues({
                                    ...values,
                                    [key]:
                                      typeof value === 'number'
                                        ? Number(e.target.value)
                                        : e.target.value,
                                  })
                                }
                                size="sm"
                                required
                              />
                            ),
                          )}
                          <Button
                            type="submit"
                            variant="filled"
                            disabled={
                              state.busy ||
                              !management.capabilities.settings.manage
                            }
                          >
                            保存设置
                          </Button>
                        </form>
                      </Card>
                    )}
                    {page === 'workspace' && management?.keys && (
                      <Card withBorder padding="lg">
                        <h2>访问密钥</h2>
                        <form
                          className="library-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void client.issueKey(name, days);
                          }}
                        >
                          <TextInput
                            size="sm"
                            label="名称"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                          />
                          <TextInput
                            size="sm"
                            label="有效期（天）"
                            type="number"
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                          />
                          <Button type="submit" disabled={state.busy}>
                            签发密钥
                          </Button>
                        </form>
                        {state.issuedToken && (
                          <div role="status" className="library-token">
                            <code data-issued-token>{state.issuedToken}</code>
                            <Button onClick={() => client.closeToken()}>
                              已保存，关闭
                            </Button>
                          </div>
                        )}
                        <div className="library-table">
                          <Table>
                            <Table.Thead>
                              <Table.Tr>
                                {['名称', '前缀', '状态', '操作'].map((t) => (
                                  <Table.Td key={t}>{t}</Table.Td>
                                ))}
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {management.keys.items.map((key) => (
                                <Table.Tr key={key.id}>
                                  <Table.Td>{key.name}</Table.Td>
                                  <Table.Td>{key.prefix}</Table.Td>
                                  <Table.Td>
                                    {key.revokedAt ? '已撤销' : '有效'}
                                  </Table.Td>
                                  <Table.Td>
                                    {!key.revokedAt && (
                                      <Button
                                        color="red"
                                        onClick={() => setConfirm(key.id)}
                                      >
                                        撤销
                                      </Button>
                                    )}
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </div>
                        <Button
                          disabled={!management.keys.cursor}
                          onClick={() =>
                            client.pageKeys(management.keys!.cursor)
                          }
                        >
                          下一页密钥
                        </Button>
                      </Card>
                    )}
                    {page === 'workspace' && management?.audit && (
                      <Card withBorder padding="lg">
                        <h2>操作审计</h2>
                        <div className="audit-list">
                          {management.audit.items.map((item) => (
                            <p key={item.id}>
                              {formatTime(item.at)} · {item.action} ·{' '}
                              {item.actor}
                            </p>
                          ))}
                        </div>
                        <Button
                          disabled={!management.audit.cursor}
                          onClick={() =>
                            client.pageAudit(management.audit!.cursor)
                          }
                        >
                          下一页审计
                        </Button>
                      </Card>
                    )}
                    {shows('overview') && (
                      <Card withBorder padding="lg">
                        <h2>运行诊断</h2>
                        {data.runtime.checks.map((check) => (
                          <p key={check.name}>
                            {check.name} · {check.status}
                          </p>
                        ))}
                      </Card>
                    )}
                    {shows('tasks') &&
                      data.user.permissions.includes('tasks:manage') && (
                        <Card withBorder padding="lg">
                          <h2>创建任务计划</h2>
                          <form
                            className="library-form"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void client.create(task, minutes, inputs);
                            }}
                          >
                            <Select
                              label="执行任务"
                              value={task}
                              onChange={(value) => value && setTask(value)}
                              data={data.definitions.map((d) => ({
                                value: d.id,
                                label: d.label,
                              }))}
                            />
                            <TextInput
                              size="sm"
                              type="number"
                              label="间隔（分钟）"
                              value={minutes}
                              onChange={(e) =>
                                setMinutes(Number(e.target.value))
                              }
                            />
                            {data.definitions
                              .find((d) => d.id === task)
                              ?.fields.map((field) => (
                                <TextInput
                                  key={field.name}
                                  label={field.label}
                                  value={inputs[field.name] || ''}
                                  onChange={(e) =>
                                    setInputs({
                                      ...inputs,
                                      [field.name]: e.target.value,
                                    })
                                  }
                                  required={field.required}
                                />
                              ))}
                            <Button type="submit">创建计划</Button>
                          </form>
                        </Card>
                      )}
                    {shows('tasks') && (
                      <Card withBorder padding="lg">
                        <h2>任务计划</h2>
                        {!data.plans.length && <p>暂无计划</p>}
                        {data.plans.map((plan) => (
                          <div className="library-toolbar" key={plan.id}>
                            <span>
                              {plan.task} ·{' '}
                              {plan.scheduleId ? '已启用' : '已暂停'}
                            </span>
                            {data.user.permissions.includes('tasks:manage') && (
                              <div>
                                <Button
                                  onClick={() => client.change('run', plan.id)}
                                >
                                  运行
                                </Button>
                                <Button
                                  onClick={() =>
                                    client.change(
                                      plan.scheduleId ? 'pause' : 'resume',
                                      plan.id,
                                    )
                                  }
                                >
                                  {plan.scheduleId ? '暂停' : '恢复'}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </Card>
                    )}
                    {shows('runs') && (
                      <Card withBorder padding="lg">
                        <h2>运行记录与日志</h2>
                        {!data.runs.length && <p>暂无运行记录</p>}
                        {data.runs.map((run) => (
                          <p key={run.id}>
                            {run.task} · {runLabel[run.status]}
                            <code>
                              {run.error || run.output?.logs.join('\n')}
                            </code>
                          </p>
                        ))}
                      </Card>
                    )}
                    {page === 'workspace' && (
                      <Card withBorder padding="lg">
                        <h2>API 中心</h2>
                        <iframe
                          title="交互式 API 文档"
                          src={client.apiUrl('/reference')}
                          loading="lazy"
                        />
                      </Card>
                    )}
                  </>
                )}
              </Stack>
            )}
          </main>
        </AppShell.Main>
      </AppShell>
      <Modal
        opened={!!confirm}
        onClose={() => setConfirm('')}
        title="撤销访问密钥？"
      >
        <Text mb="lg">撤销后不能发起新的授权请求。</Text>
        <Group justify="end">
          <Button variant="default" onClick={() => setConfirm('')}>
            取消
          </Button>
          <Button
            color="red"
            onClick={async () => {
              await client.revokeKey(confirm);
              if (!client.snapshot().error) setConfirm('');
            }}
          >
            确认撤销
          </Button>
        </Group>
      </Modal>
    </MantineProvider>
  );
}
