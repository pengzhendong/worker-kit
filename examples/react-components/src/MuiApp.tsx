import { useState } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Box,
  Stack,
  Card,
  CardContent,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from '@mui/material';
import { useWorkspace, formatTime, runLabel } from './useWorkspace';
export default function App() {
  const [dark, setDark] = useState(false),
    [drawer, setDrawer] = useState(false);
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
    } = useWorkspace(),
    data = state.data,
    management = data?.management;
  return (
    <ThemeProvider
      theme={createTheme({
        palette: { mode: dark ? 'dark' : 'light' },
        typography: { fontFamily: 'system-ui, sans-serif' },
      })}
    >
      <CssBaseline />
      <AppBar position="fixed" elevation={0} data-library-header>
        <Toolbar>
          <Button
            color="inherit"
            aria-label="打开侧边栏"
            onClick={() => setDrawer(true)}
          >
            ☰
          </Button>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            WorkerKit · MUI
          </Typography>
          <Button
            color="inherit"
            aria-label="切换深色主题"
            onClick={() => setDark(!dark)}
          >
            {dark ? '浅色' : '深色'}
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer open={drawer} onClose={() => setDrawer(false)}>
        <Box sx={{ width: 240 }} role="dialog" aria-label="导航">
          <List>
            <ListItemButton onClick={() => setDrawer(false)}>
              <ListItemText primary="业务工作台" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
      <main className="react-library-main" data-library-scroll data-workspace>
        <Stack spacing={3}>
          <div className="library-toolbar">
            <div>
              <h1>业务工作台</h1>
              <p>MUI 原生组件 · 当前后端真实数据</p>
            </div>
            <Button
              variant="outlined"
              disabled={state.busy}
              onClick={() => client.refresh()}
            >
              刷新
            </Button>
          </div>
          {state.error && <Alert severity="error">{state.error}</Alert>}
          {state.unauthorized && (
            <Button href={client.loginUrl()}>登录后端</Button>
          )}
          {data && (
            <>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip label={data.backend} />
                <span>{data.user.name}</span>
                <Chip
                  color={data.runtime.ok ? 'success' : 'error'}
                  label={data.runtime.ok ? '依赖正常' : '依赖异常'}
                />
              </Stack>
              {management?.settings && (
                <Card variant="outlined">
                  <CardContent>
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
                          <FormControlLabel
                            key={key}
                            label="维护模式"
                            control={
                              <Switch
                                checked={value}
                                onChange={(_, checked) =>
                                  setValues({ ...values, [key]: checked })
                                }
                              />
                            }
                          />
                        ) : (
                          <TextField
                            key={key}
                            label={
                              key === 'siteTitle'
                                ? '站点名称'
                                : '刷新间隔（秒）'
                            }
                            type={typeof value === 'number' ? 'number' : 'text'}
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
                            size="small"
                            required
                          />
                        ),
                      )}
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={
                          state.busy || !management.capabilities.settings.manage
                        }
                      >
                        保存设置
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
              {management?.keys && (
                <Card variant="outlined">
                  <CardContent>
                    <h2>访问密钥</h2>
                    <form
                      className="library-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void client.issueKey(name, days);
                      }}
                    >
                      <TextField
                        size="small"
                        label="名称"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                      <TextField
                        size="small"
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
                      <div>
                        <code data-issued-token>{state.issuedToken}</code>
                        <Button onClick={() => client.closeToken()}>
                          已保存，关闭
                        </Button>
                      </div>
                    )}
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['名称', '前缀', '状态', '操作'].map((t) => (
                              <TableCell key={t}>{t}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {management.keys.items.map((key) => (
                            <TableRow key={key.id}>
                              <TableCell>{key.name}</TableCell>
                              <TableCell>{key.prefix}</TableCell>
                              <TableCell>
                                {key.revokedAt ? '已撤销' : '有效'}
                              </TableCell>
                              <TableCell>
                                {!key.revokedAt && (
                                  <Button
                                    color="error"
                                    onClick={() => setConfirm(key.id)}
                                  >
                                    撤销
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                    <Button
                      disabled={!management.keys.cursor}
                      onClick={() => client.pageKeys(management.keys!.cursor)}
                    >
                      下一页密钥
                    </Button>
                  </CardContent>
                </Card>
              )}
              {management?.audit && (
                <Card variant="outlined">
                  <CardContent>
                    <h2>操作审计</h2>
                    <div className="audit-list">
                      {management.audit.items.map((item) => (
                        <p key={item.id}>
                          {formatTime(item.at)} · {item.action} · {item.actor}
                        </p>
                      ))}
                    </div>
                    <Button
                      disabled={!management.audit.cursor}
                      onClick={() => client.pageAudit(management.audit!.cursor)}
                    >
                      下一页审计
                    </Button>
                  </CardContent>
                </Card>
              )}
              <Card variant="outlined">
                <CardContent>
                  <h2>运行诊断</h2>
                  {data.runtime.checks.map((check) => (
                    <p key={check.name}>
                      {check.name} · {check.status}
                    </p>
                  ))}
                </CardContent>
              </Card>
              {data.user.permissions.includes('tasks:manage') && (
                <Card variant="outlined">
                  <CardContent>
                    <h2>创建任务计划</h2>
                    <form
                      className="library-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void client.create(task, minutes, inputs);
                      }}
                    >
                      <TextField
                        select
                        size="small"
                        label="执行任务"
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                      >
                        {data.definitions.map((d) => (
                          <MenuItem key={d.id} value={d.id}>
                            {d.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        size="small"
                        type="number"
                        label="间隔（分钟）"
                        value={minutes}
                        onChange={(e) => setMinutes(Number(e.target.value))}
                      />
                      {data.definitions
                        .find((d) => d.id === task)
                        ?.fields.map((field) => (
                          <TextField
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
                  </CardContent>
                </Card>
              )}
              <Card variant="outlined">
                <CardContent>
                  <h2>任务计划</h2>
                  {!data.plans.length && <p>暂无计划</p>}
                  {data.plans.map((plan) => (
                    <div className="library-toolbar" key={plan.id}>
                      <span>
                        {plan.task} · {plan.scheduleId ? '已启用' : '已暂停'}
                      </span>
                      {data.user.permissions.includes('tasks:manage') && (
                        <div>
                          <Button onClick={() => client.change('run', plan.id)}>
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
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent>
                  <h2>运行记录与日志</h2>
                  {!data.runs.length && <p>暂无运行记录</p>}
                  {data.runs.map((run) => (
                    <p key={run.id}>
                      {run.task} · {runLabel[run.status]}
                      <code>{run.error || run.output?.logs.join('\n')}</code>
                    </p>
                  ))}
                </CardContent>
              </Card>
              <Card variant="outlined">
                <CardContent>
                  <h2>API 中心</h2>
                  <iframe
                    title="交互式 API 文档"
                    src={client.apiUrl('/reference')}
                    loading="lazy"
                  />
                </CardContent>
              </Card>
            </>
          )}
        </Stack>
      </main>
      <Dialog open={!!confirm} onClose={() => setConfirm('')}>
        <DialogTitle>撤销访问密钥？</DialogTitle>
        <DialogContent>撤销后不能发起新的授权请求。</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm('')}>取消</Button>
          <Button
            color="error"
            onClick={async () => {
              await client.revokeKey(confirm);
              if (!client.snapshot().error) setConfirm('');
            }}
          >
            确认撤销
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
