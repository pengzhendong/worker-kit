import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FileTextOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Select } from 'antd';
import { AdminShell, PageHeader, WorkerKitProvider } from '@pengzhendong/worker-kit/web';
import { ModalForm, ProDescriptions, ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';

const resourceKinds = ['仁果', '柑橘', '热带', '浆果', '核果'] as const;
type Resource = {
  id: string;
  name: string;
  kind: (typeof resourceKinds)[number];
  enabled: boolean;
};

const fruits: [string, Resource['kind']][] = [
  ['苹果', '仁果'], ['橙子', '柑橘'], ['香蕉', '热带'],
  ['梨', '仁果'], ['柚子', '柑橘'], ['芒果', '热带'],
  ['蓝莓', '浆果'], ['桃子', '核果'], ['柠檬', '柑橘'],
  ['菠萝', '热带'], ['葡萄', '浆果'], ['李子', '核果'],
];
const initialResources: Resource[] = fruits.map(([name, kind], index) => ({
  id: String(index),
  name,
  kind,
  enabled: index % 4 !== 0,
}));
const navigation = [
  { key: 'list', label: 'ProTable 表格', icon: <UnorderedListOutlined /> },
  { key: 'detail', label: 'ProDescriptions 详情', icon: <FileTextOutlined /> },
];
const kindOptions = Object.fromEntries(resourceKinds.map((kind) => [kind, { text: kind }]));

function ResourceDemo() {
  const [rows, setRows] = useState(initialResources);
  const [page, setPage] = useState('list');
  const [selectedId, setSelectedId] = useState(initialResources[0].id);
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const [editing, setEditing] = useState<Resource | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<Omit<Resource, 'id'>>();

  function edit(resource: Resource | null) {
    setEditing(resource);
    form.setFieldsValue(resource ?? { name: '', kind: resourceKinds[0], enabled: true });
    setOpen(true);
  }

  const columns: ProColumns<Resource>[] = [
    {
      title: '名称',
      dataIndex: 'name',
      render: (_, row) => (
        <Button type="link" style={{ paddingInline: 0 }} onClick={() => {
          setSelectedId(row.id);
          setPage('detail');
        }}>{row.name}</Button>
      ),
    },
    { title: '类型', dataIndex: 'kind', valueType: 'select', valueEnum: kindOptions },
    {
      title: '状态', dataIndex: 'enabled', search: false,
      renderText: (_, row) => row.enabled ? '启用' : '停用',
    },
    {
      title: '操作', valueType: 'option', hideInSetting: true,
      render: (_, row) => <Button type="link" onClick={() => edit(row)}>编辑</Button>,
    },
  ];

  return (
    <AdminShell
      title="ProComponents"
      navigationLabel={false}
      items={navigation}
      activeKey={page}
      onNavigate={setPage}
      sidebarStorageKey="workerkit.pro-components.sidebar"
      compactContent
      pageTitleInHeader
    >
      <PageHeader title={page === 'detail' ? 'ProDescriptions 详情' : 'ProTable 表格'} />
      <section hidden={page !== 'list'}>
        <ProTable<Resource>
          headerTitle="水果列表"
          tooltip="示例数据，刷新页面后恢复"
          rowKey="id"
          columns={columns}
          scroll={{ x: 480 }}
          pagination={{ defaultPageSize: 5, pageSizeOptions: [5, 10, 20] }}
          params={{ resources: rows }}
          request={async ({ name, kind, resources }) => ({
            data: (resources as Resource[]).filter((row) =>
              (!name || row.name.includes(String(name).trim())) && (!kind || row.kind === kind),
            ),
            success: true,
          })}
          toolBarRender={() => [
            <Button key="add" type="primary" onClick={() => edit(null)}>新增水果</Button>,
          ]}
        />
      </section>
      {page === 'detail' && (
        <Card
          title={selected.name}
          extra={<Button onClick={() => edit(selected)}>编辑水果</Button>}
        >
          <ProDescriptions<Resource>
            dataSource={selected}
            column={{ xs: 1, sm: 2 }}
            columns={[
              { title: '类型', dataIndex: 'kind' },
              { title: '状态', dataIndex: 'enabled', renderText: (_, row) => row.enabled ? '启用' : '停用' },
            ]}
          />
        </Card>
      )}
      <ModalForm<Omit<Resource, 'id'>>
        form={form}
        open={open}
        onOpenChange={setOpen}
        title={editing ? '编辑水果' : '新增水果'}
        modalProps={{ okText: '保存', cancelText: '取消' }}
        onFinish={async (values) => {
          const resource = { ...values, name: values.name.trim(), id: editing?.id ?? crypto.randomUUID() };
          setRows((previous) => editing
            ? previous.map((row) => row.id === editing.id ? resource : row)
            : [resource, ...previous]);
          return true;
        }}
      >
        <Form.Item name="name" label="名称" rules={[{ required: true, whitespace: true, message: '请输入名称' }]}>
          <Input maxLength={80} />
        </Form.Item>
        <Form.Item name="kind" label="类型" rules={[{ required: true }]}>
          <Select options={resourceKinds.map((kind) => ({ label: kind, value: kind }))} />
        </Form.Item>
        <Form.Item name="enabled" label="状态" rules={[{ required: true }]}>
          <Select options={[{ label: '启用', value: true }, { label: '停用', value: false }]} />
        </Form.Item>
      </ModalForm>
    </AdminShell>
  );
}

createRoot(document.getElementById('root')!).render(
  <WorkerKitProvider storageKey="workerkit.pro-components.theme"><ResourceDemo /></WorkerKitProvider>,
);
