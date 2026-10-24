import { useState } from 'react';
import { App, Button, Card, Input, Popconfirm, Space, Table, Tag, Typography, Upload } from 'antd';
import { PageHeader, workerKitLayout } from '@pengzhendong/worker-kit/web';
import { api, formatBytes, formatTime, Icon, QueryError, useQuery } from './data';
import type { CursorList } from '@pengzhendong/worker-kit/contracts';
import type { FileItem } from './data';

export function FilesPage() {
  const [cursor, setCursor] = useState(''); const [history, setHistory] = useState<string[]>([]); const [search, setSearch] = useState(''); const [uploading, setUploading] = useState(false);
  const { data, error, loading, refresh } = useQuery<CursorList<FileItem> & { maxBytes: number }>(`/api/admin/files?cursor=${encodeURIComponent(cursor)}`);
  const { message } = App.useApp();
  const items = data?.items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  async function remove(file: FileItem) {
    try { await api(`/api/admin/files?key=${encodeURIComponent(file.key)}`, { method: 'DELETE' }); void message.success('文件已删除'); refresh(); }
    catch (failure) { void message.error(failure instanceof Error ? failure.message : '删除失败'); }
  }
  return <>
    <PageHeader title="文件管理" description="上传、下载与整理当前应用的私有文件。" actions={<Button onClick={refresh}>刷新</Button>} />
    <QueryError error={error} retry={refresh} />
    <div className="file-upload"><Upload.Dragger height={workerKitLayout.uploadHeight} multiple={false} disabled={uploading} showUploadList={false} beforeUpload={(file) => {
      if (file.size > (data?.maxBytes ?? 10 * 1024 * 1024)) { void message.error('单个文件不能超过 10 MB'); return Upload.LIST_IGNORE; } return true;
    }} customRequest={async ({ file, onSuccess, onError }) => {
      setUploading(true);
      try { const body = new FormData(); body.set('file', file as Blob); const result = await api('/api/admin/files', { method: 'POST', body }); onSuccess?.(result); void message.success('文件已上传'); setCursor(''); setHistory([]); refresh(); }
      catch (failure) { const error = failure instanceof Error ? failure : new Error('上传失败'); onError?.(error); void message.error(error.message); }
      finally { setUploading(false); }
    }}>
      <div className="upload-strip"><span className="upload-symbol"><Icon name="files" /></span><div className="upload-copy"><Typography.Text strong>{uploading ? '正在上传…' : '点击上传，或拖拽文件到这里'}</Typography.Text><Typography.Text type="secondary">单文件最大 10 MB · 仅管理员可见</Typography.Text></div><span className="upload-action">选择文件</span></div>
    </Upload.Dragger></div>
    <Card styles={{ body: { padding: 20 } }}>
      <div className="table-toolbar file-list-toolbar"><Space><Typography.Text strong>全部文件</Typography.Text><Tag>{data?.items.length ?? 0}</Tag></Space><Input.Search aria-label="搜索当前页文件" allowClear placeholder="搜索当前页文件" onSearch={setSearch} style={{ width: '100%', maxWidth: 260 }} /></div>
      <Table<FileItem> size="middle" rowKey="key" loading={loading || uploading} dataSource={items} pagination={false} scroll={{ x: 650 }} columns={[
        { title: '文件名', dataIndex: 'name', render: (value: string) => <Space><span className="file-symbol"><Icon name="audit" /></span><Typography.Text strong>{value}</Typography.Text></Space> },
        { title: '大小', dataIndex: 'size', width: 120, render: formatBytes },
        { title: '上传时间', dataIndex: 'uploadedAt', width: 190, render: formatTime },
        { title: '操作', key: 'actions', width: 140, render: (_, row) => <Space><Button type="link" size="small" href={`/api/admin/files/download?key=${encodeURIComponent(row.key)}`}>下载</Button><Popconfirm title="删除这个文件？" description="删除后无法恢复。" okText="删除" cancelText="取消" onConfirm={() => remove(row)}><Button type="link" size="small" danger>删除</Button></Popconfirm></Space> },
      ]} />
      {(history.length > 0 || data?.cursor) && <Space style={{ marginTop: 20 }}><Button disabled={!history.length} onClick={() => { setCursor(history.at(-1) ?? ''); setHistory((items) => items.slice(0, -1)); }}>上一页</Button><Button disabled={!data?.cursor} onClick={() => { setHistory((items) => [...items, cursor]); setCursor(data?.cursor ?? ''); }}>下一页</Button></Space>}
    </Card>
  </>;
}
