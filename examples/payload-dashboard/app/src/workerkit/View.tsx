import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import { WorkerKitDashboard } from './Dashboard'
export function WorkerKitView({ initPageResult, params, searchParams, user }: AdminViewServerProps) {
  if (!initPageResult.req.user) redirect('/admin/login?redirect=/admin/workerkit')
  return <DefaultTemplate i18n={initPageResult.req.i18n} locale={initPageResult.locale} params={params} payload={initPageResult.req.payload} permissions={initPageResult.permissions} searchParams={searchParams} user={user} visibleEntities={initPageResult.visibleEntities}><Gutter><WorkerKitDashboard /></Gutter></DefaultTemplate>
}

// Payload already wraps its dashboard override in DefaultTemplate.
export function WorkerKitHome({ initPageResult }: AdminViewServerProps) {
  if (!initPageResult.req.user) redirect('/admin/login')
  return <Gutter><WorkerKitDashboard /></Gutter>
}
