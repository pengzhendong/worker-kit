import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Card, Input, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import type { OpenAPIV3_1 as O } from 'openapi-types';
import type { createApiClient } from './api';
import type { SessionScope } from './session';
import { useApiQuery } from './query';
import { useWorkerKitTheme } from './provider';
import { PageHeader } from './page';

type Operation = O.OperationObject & { 'x-permission'?: string; 'x-token-allowed'?: boolean };
type Endpoint = { key: string; method: string; path: string; operation: Operation };
const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;
function ReferenceFrame({ operation, scope, referenceUrl }: { operation?: string; scope: SessionScope; referenceUrl: string }) {
  const { dark } = useWorkerKitTheme(); const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const version = scope.version;
    const receive = (event: MessageEvent) => { if (event.origin === location.origin && event.source === frame.current?.contentWindow && event.data?.type === 'workerkit:api-session-expired') scope.expire(version); };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, [scope]);
  const url = new URL(referenceUrl, location.origin);
  if (url.origin !== location.origin) throw new Error('API 文档必须使用当前应用的地址');
  url.searchParams.set('theme', dark ? 'dark' : 'light');
  if (operation) url.searchParams.set('operation', operation);
  return <iframe ref={frame} title="交互式 API 文档" src={`${url.pathname}${url.search}`} style={{ display: 'block', width: '100%', height: 'max(520px, calc(100dvh - 260px))', border: 0, borderRadius: 10 }} />;
}

/** Optional UI only. Applications own the OpenAPI route, permissions and token storage. */
export function ApiCenter({ client, scope, specUrl = '/api/admin/openapi.json', referenceUrl = '/reference.html', tokenPanel, description = '查阅应用接口、调用文档与访问令牌。', documentationNote = '文档由 Scalar 展示，调试仅请求当前应用；填写的 Token 不持久保存。发送写请求会修改真实数据。' }: {
  client: ReturnType<typeof createApiClient>;
  scope: SessionScope;
  specUrl?: string;
  referenceUrl?: string;
  tokenPanel?: ReactNode;
  description?: string;
  documentationNote?: ReactNode;
}) {
  const [active, setActive] = useState('list'); const [selectedOperation, setSelectedOperation] = useState<string>(); const [search, setSearch] = useState(''); const [method, setMethod] = useState(''); const [tag, setTag] = useState('');
  const { data, error, loading, refresh } = useApiQuery<O.Document>(client, specUrl);
  const endpoints: Endpoint[] = Object.entries(data?.paths ?? {}).flatMap(([path, item]) => methods.flatMap((method) => item?.[method] ? [{ key: `${method}:${path}`, method: method.toUpperCase(), path, operation: item[method] as Operation }] : []));
  const filtered = endpoints.filter((entry) => (!method || entry.method === method) && (!tag || entry.operation.tags?.includes(tag)) && `${entry.path} ${entry.operation.summary ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <PageHeader title="API 中心" description={description} actions={<Button onClick={refresh}>刷新接口</Button>} />
    {error && <Alert type="error" showIcon title={error} action={<Button size="small" onClick={refresh}>重试</Button>} style={{ marginBottom: 20 }} />}
    <Tabs activeKey={active} onChange={setActive} destroyOnHidden items={[
      { key: 'list', label: '接口列表', children: <Card><div className="wk-api-toolbar"><Space wrap><Input.Search aria-label="搜索接口" placeholder="搜索路径或说明" value={search} onChange={(event) => setSearch(event.target.value)} allowClear style={{ width: 230 }} /><Select aria-label="请求方法" value={method} onChange={setMethod} style={{ width: 120 }} options={[{ value: '', label: '全部方法' }, ...methods.map((method) => ({ value: method.toUpperCase(), label: method.toUpperCase() }))]} /><Select aria-label="接口分组" value={tag} onChange={setTag} style={{ width: 130 }} options={[{ value: '', label: '全部分组' }, ...[...new Set(endpoints.flatMap((entry) => entry.operation.tags ?? []))].map((tag) => ({ value: tag, label: tag }))]} /></Space><Typography.Text type="secondary">{loading && !data ? '正在读取接口' : `共 ${filtered.length} 个接口`}</Typography.Text></div>
        <Table<Endpoint> rowKey="key" loading={loading} dataSource={filtered} scroll={{ x: 850 }} pagination={{ pageSize: 10, showSizeChanger: false }} columns={[
          { title: '方法', dataIndex: 'method', width: 90, render: (value: string) => <Tag color={value === 'GET' ? 'blue' : value === 'DELETE' ? 'red' : 'orange'}>{value}</Tag> },
          { title: '路径 / 说明', key: 'path', render: (_, entry) => <Space orientation="vertical" size={0}><Typography.Text code>{entry.path}</Typography.Text><Typography.Text>{entry.operation.summary}</Typography.Text></Space> },
          { title: '分组', key: 'tag', width: 100, render: (_, entry) => entry.operation.tags?.join('、') },
          { title: '认证 / 权限', key: 'access', width: 230, render: (_, entry) => <Space orientation="vertical" size={0}><Typography.Text type="secondary">{!entry.operation.security?.length ? '公开' : entry.operation['x-token-allowed'] ? 'Cookie / Token' : 'Cookie'}</Typography.Text>{entry.operation['x-permission'] && <Typography.Text code>{entry.operation['x-permission']}</Typography.Text>}</Space> },
          { title: '操作', key: 'action', width: 90, render: (_, entry) => <Button type="link" size="small" onClick={() => { setSelectedOperation(entry.operation.operationId); setActive('docs'); }}>查看文档</Button> },
        ]} /></Card> },
      { key: 'docs', label: '接口文档', children: <><Typography.Paragraph type="secondary">{documentationNote}</Typography.Paragraph>{selectedOperation && <Button style={{ marginBottom: 12 }} onClick={() => setSelectedOperation(undefined)}>查看全部接口文档</Button>}<ReferenceFrame operation={selectedOperation} scope={scope} referenceUrl={referenceUrl} /></> },
      ...(tokenPanel ? [{ key: 'tokens', label: '访问令牌', children: tokenPanel }] : []),
    ]} />
  </>;
}
