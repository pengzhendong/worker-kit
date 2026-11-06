'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@payloadcms/ui'
import { ApiClientError, createApiClient, isRequestCancelled } from '@pengzhendong/worker-kit/client'
import type { RuntimeSnapshot } from '@pengzhendong/worker-kit/contracts'
const api = createApiClient({ baseUrl: '/api/workerkit' })
type Note = { id: number; title: string; status: 'draft' | 'published'; updatedAt: string }
type Overview = {
  user: { email: string; username?: string | null; role: string }; permissions: string[]; runtime: RuntimeSnapshot
  notes: { items: Note[]; total: number }; media: { total: number }
  runs: { id: string; trigger: string; status: string; startedAt: string }[]
}
const date = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false })
export function WorkerKitDashboard() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  async function refresh(signal?: AbortSignal) { setData(await api<Overview>('/overview', { signal })) }
  function failure(error: unknown) {
    if (isRequestCancelled(error)) return
    if (error instanceof ApiClientError && error.status === 401) { window.location.assign('/admin/login?redirect=/admin/workerkit'); return }
    setError(error instanceof ApiClientError ? error.message : '暂时无法读取运行状态，请重试')
  }
  useEffect(() => { const controller = new AbortController(); refresh(controller.signal).catch(failure); return () => controller.abort() }, [])
  async function action(run: () => Promise<unknown>) {
    setBusy(true); setError('')
    try { await run(); await refresh() } catch (error) { failure(error) } finally { setBusy(false) }
  }
  return <main className="wk-integration">
    <header className="wk-heading"><div><p className="wk-eyebrow">WORKERKIT / OPERATIONS</p><h1>WorkerKit 运行台</h1><p className="wk-muted">业务接口、内容管理和运行检查，共用一个 Worker 和同一套登录。</p></div><Button buttonStyle="secondary" disabled={busy} onClick={() => action(() => refresh())}>刷新状态</Button></header>
    {error && <p className="wk-error" role="alert">{error}</p>}
    {!data && !error && <p role="status">正在读取运行状态…</p>}
    {data && <>
      <div className="wk-session"><span><i className={`wk-dot ${data.runtime.ok ? 'is-ok' : ''}`} />{data.runtime.ok ? '依赖正常' : '依赖异常'}</span><span>{data.user.username || data.user.email} · {data.user.role === 'admin' ? '管理员' : '只读账号'}</span></div>
      <section className="wk-stats" aria-label="运行概览">
        <article><span>运行环境</span><strong>Cloudflare Workers</strong><small>{data.runtime.environment === 'local' ? '本地 workerd 预览' : '线上环境'}</small></article>
        <article><span>演示记录</span><strong>{data.notes.total}</strong><small>与原生内容管理共用 D1</small></article>
        <article><span>媒体文件</span><strong>{data.media.total}</strong><small>原生上传，存储于 R2</small></article>
      </section>
      <div className="wk-columns"><section className="wk-panel"><div className="wk-panel-heading"><h2>依赖检查</h2>{data.permissions.includes('runtime:run') && <Button size="small" disabled={busy} onClick={() => action(() => api('/operations/check', { method: 'POST' }))}>运行检查</Button>}</div>
        {data.runtime.checks.map(check => <div className="wk-check" key={check.name}><div><strong>{check.name}</strong><p className="wk-muted">{check.description}</p></div><span className={`wk-badge ${check.status === 'ok' ? 'is-ok' : ''}`}>{check.status === 'ok' ? '正常' : '异常'} · {check.durationMs} ms</span></div>)}
        <p className="wk-muted wk-small">检查时间：{date(data.runtime.checkedAt)}</p>
      </section>
      <section className="wk-panel"><div className="wk-panel-heading"><h2>最近记录</h2><Button el="link" url="/admin/collections/notes" size="small" buttonStyle="secondary">管理记录</Button></div>
        {data.notes.items.length ? data.notes.items.map(note => <div className="wk-note" key={note.id}><div><Link href={`/admin/collections/notes/${note.id}`}>{note.title}</Link><p className="wk-muted wk-small">{date(note.updatedAt)} · {note.status === 'published' ? '已发布' : '草稿'}</p></div>{data.permissions.includes('notes:update') && <Button size="small" buttonStyle="secondary" disabled={busy} onClick={() => action(() => api(`/notes/${note.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: note.status === 'published' ? 'draft' : 'published' }) }))}>{note.status === 'published' ? '撤回' : '发布'}</Button>}</div>) : <p className="wk-muted">暂无记录。通过原生管理表单添加第一条。</p>}
        {data.permissions.includes('notes:create') && <Button el="link" url="/admin/collections/notes/create" size="small">新增记录</Button>}
      </section></div>
      <section className="wk-panel"><div className="wk-panel-heading"><h2>执行记录</h2><span className="wk-muted wk-small">最近 8 次 · 写入 D1</span></div><p className="wk-muted">手动检查与定时事件共用同一个执行入口。当前没有配置自动定时触发。</p>
        {data.runs.length ? <div className="wk-runs">{data.runs.map(run => <div className="wk-run" key={run.id}><span>{run.trigger === 'scheduled' ? '定时事件' : '手动检查'}</span><time dateTime={run.startedAt}>{date(run.startedAt)}</time><span className={`wk-badge ${run.status === 'ok' ? 'is-ok' : ''}`}>{run.status === 'ok' ? '成功' : '失败'}</span></div>)}</div> : <p className="wk-muted">暂无执行记录。</p>}
      </section>
    </>}
  </main>
}
