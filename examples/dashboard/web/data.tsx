import { useCallback, useEffect, useState } from 'react';
import { Alert, Button } from 'antd';
import { createApiClient } from '@pengzhendong/worker-kit/web';

export const api = createApiClient();
export interface Resource { id: string; name: string; kind: string; status: 'enabled' | 'disabled'; address: string; description: string; created_at: string; updated_at: string }
export interface AuditEvent { id: string; actor: string; action: string; target: string; created_at: string }
export interface FileItem { key: string; name: string; size: number; uploadedAt: string; contentType: string }
export interface Settings { siteName: string; description: string; contactEmail: string; pageSize: number; showWelcome: boolean }
export interface Overview { user: string; runtime: string; now: string; total: number; enabled: number; files: number; filesTruncated: boolean; bytes: number; recent: Resource[]; activity: AuditEvent[]; bindings: { name: string; detail: string; status: string }[] }

export function useQuery<T>(path: string) {
  const [data, setData] = useState<T>(); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    api<T>(path, { signal: controller.signal }).then((result) => { if (!controller.signal.aborted) setData(result); }).catch((failure: unknown) => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : '请求失败');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, version]);
  return { data, error, loading, refresh };
}
export function QueryError({ error, retry }: { error: string; retry: () => void }) {
  return error ? <Alert type="error" showIcon title={error} action={<Button size="small" onClick={retry}>重试</Button>} style={{ marginBottom: 20 }} /> : null;
}
export const formatTime = (value: string) => new Date(value).toLocaleString('zh-CN', { hour12: false });
export function formatBytes(value: number) { return value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`; }
export const actionLabels: Record<string, string> = { 'resource.create': '新增资源', 'resource.update': '编辑资源', 'resource.delete': '删除资源', 'resource.batch': '批量变更', 'file.upload': '上传文件', 'file.delete': '删除文件', 'settings.update': '保存设置' };
export const jsonRequest = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    resources: 'M4 4h16v5H4z M4 14h16v6H4z M8 6.5h.01 M8 17h.01',
    files: 'M3 6h7l2 3h9v11H3z M3 6V4h7l2 2',
    settings: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
    audit: 'M6 3h12v18H6z M9 7h6 M9 11h6 M9 15h4',
    account: 'M16 7a4 4 0 1 1-8 0a4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
    components: 'M3 3h6v6H3z M14 3h7v6h-7z M3 14h6v7H3z M14 14h7v7h-7z',
    tools: 'M14 6a4 4 0 0 0-5 5L3 17l4 4 6-6a4 4 0 0 0 5-5l-3 3-4-4z',
    database: 'M20 6c0 2-3.6 3-8 3S4 8 4 6s3.6-3 8-3 8 1 8 3z M4 6v12c0 2 3.6 3 8 3s8-1 8-3V6 M4 12c0 2 3.6 3 8 3s8-1 8-3',
    key: 'M14 4a6 6 0 1 1-3 11L4 22H2v-4l7-7a6 6 0 0 1 5-7z M17 8h.01',
    trace: 'M5 3v12a4 4 0 0 0 4 4h9 M5 7h13 M15 4l3 3-3 3 M15 16l3 3-3 3',
    code: 'm8 7-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16',
  };
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.overview} /></svg>;
}
