import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Typography,
} from 'antd';
export default function ManagementPanel({ client, state }) {
  const data = state.data?.management;
  const [section, setSection] = useState(''),
    [selected, setSelected] = useState(null);
  const [settings] = Form.useForm();
  useEffect(() => {
    settings.setFieldsValue(data?.settings?.values || {});
  }, [data?.settings, settings]);
  if (!data) return null;
  const tabs = [
    ...(data.capabilities.settings.read ? [['settings', 'KV 设置']] : []),
    ...(data.capabilities.keys.manage ? [['keys', '访问密钥']] : []),
    ...(data.capabilities.audit.read ? [['audit', '操作审计']] : []),
    ['api', 'API 中心'],
  ];
  const labels = {
    siteTitle: '站点名称',
    refreshSeconds: '刷新间隔（秒）',
    maintenance: '维护模式',
  };
  return (
    <section data-management style={{ margin: '20px 0' }}>
      <Card title="管理功能">
        <p>与当前后端共用登录；配置、密钥和审计按后端隔离。</p>
        <Space wrap style={{ margin: '16px 0' }}>
          {tabs.map(([key, label]) => (
            <Button
              key={key}
              type={section === key ? 'primary' : 'default'}
              onClick={() => setSection(section === key ? '' : key)}
            >
              {label}
            </Button>
          ))}
        </Space>
        {section === 'settings' && data.settings && (
          <>
            <h3>KV 设置</h3>
            <Form
              form={settings}
              layout="vertical"
              onFinish={client.saveSettings}
            >
              {Object.entries(data.settings.values).map(([key, value]) => (
                <Form.Item
                  key={key}
                  name={key}
                  label={labels[key] || key}
                  valuePropName={
                    typeof value === 'boolean' ? 'checked' : 'value'
                  }
                >
                  {typeof value === 'boolean' ? (
                    <Switch />
                  ) : typeof value === 'number' ? (
                    <InputNumber min={0} max={10000} />
                  ) : (
                    <Input maxLength={2000} />
                  )}
                </Form.Item>
              ))}
              <Button
                htmlType="submit"
                type="primary"
                disabled={state.busy || !data.capabilities.settings.manage}
              >
                保存设置
              </Button>
            </Form>
            <p>仅存储声明的非敏感字段；KV 跨区域同步可能短暂延迟。</p>
          </>
        )}
        {section === 'keys' && data.keys && (
          <>
            <h3>访问密钥</h3>
            <Form
              layout="inline"
              initialValues={{ expiresInDays: 30 }}
              onFinish={(value) =>
                client.issueKey(value.name, value.expiresInDays)
              }
            >
              <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                <Input maxLength={80} />
              </Form.Item>
              <Form.Item
                name="expiresInDays"
                label="有效期（天）"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={365} />
              </Form.Item>
              <Button htmlType="submit" disabled={state.busy}>
                签发密钥
              </Button>
            </Form>
            {state.issuedToken && (
              <div role="status" style={{ margin: '16px 0' }}>
                <p>完整令牌只显示一次，请保存后关闭。</p>
                <code
                  data-issued-token
                  style={{ display: 'block', overflowWrap: 'anywhere' }}
                >
                  {state.issuedToken}
                </code>
                <Button onClick={client.closeToken}>已保存，关闭</Button>
              </div>
            )}
            <Table
              rowKey="id"
              pagination={false}
              scroll={{ x: 500 }}
              dataSource={data.keys.items}
              columns={[
                { title: '名称', dataIndex: 'name' },
                { title: '前缀', dataIndex: 'prefix' },
                {
                  title: '状态',
                  render: (_, key) =>
                    key.revokedAt
                      ? '已撤销'
                      : Date.parse(key.expiresAt) <= Date.now()
                        ? '已过期'
                        : '有效',
                },
                {
                  title: '操作',
                  render: (_, key) =>
                    !key.revokedAt && (
                      <Button onClick={() => setSelected(key.id)}>撤销</Button>
                    ),
                },
              ]}
            />
            <Space>
              <Button disabled={state.busy} onClick={() => client.pageKeys()}>
                返回首页
              </Button>
              <Button
                disabled={state.busy || !data.keys.cursor}
                onClick={() => client.pageKeys(data.keys.cursor)}
              >
                下一页密钥
              </Button>
            </Space>
          </>
        )}
        {section === 'audit' && data.audit && (
          <>
            <h3>操作审计</h3>
            <p>
              最近 30
              天的操作元数据；不包含配置值、密码和完整令牌，采用尽力写入。
            </p>
            <Table
              rowKey="id"
              pagination={false}
              scroll={{ x: 650 }}
              dataSource={data.audit.items}
              columns={[
                {
                  title: '时间',
                  dataIndex: 'at',
                  render: (value) => new Date(value).toLocaleString('zh-CN'),
                },
                { title: '操作人', dataIndex: 'actor' },
                { title: '动作', dataIndex: 'action' },
                { title: '对象', dataIndex: 'target' },
              ]}
            />
            <Space>
              <Button disabled={state.busy} onClick={() => client.pageAudit()}>
                返回首页
              </Button>
              <Button
                disabled={state.busy || !data.audit.cursor}
                onClick={() => client.pageAudit(data.audit.cursor)}
              >
                下一页审计
              </Button>
            </Space>
          </>
        )}
        {section === 'api' && (
          <>
            <h3>API 中心</h3>
            <p>调试使用当前后端登录；写请求会修改真实数据。</p>
            <Space wrap>
              <Typography.Link
                href={client.apiUrl('/reference')}
                target="_blank"
                rel="noopener"
              >
                打开交互式 API 文档 ↗
              </Typography.Link>
              <Typography.Link
                href={client.apiUrl('/openapi.json')}
                target="_blank"
                rel="noopener"
              >
                查看 OpenAPI 声明
              </Typography.Link>
            </Space>
          </>
        )}
      </Card>
      <Modal
        open={!!selected}
        title="撤销访问密钥？"
        onCancel={() => setSelected(null)}
        footer={
          <>
            <Button onClick={() => setSelected(null)}>取消</Button>
            <Button
              danger
              loading={state.busy}
              onClick={async () => {
                await client.revokeKey(selected);
                setSelected(null);
              }}
            >
              确认撤销
            </Button>
          </>
        }
      >
        <p>撤销后不可恢复。KV 跨区域同步可能短暂延迟。</p>
      </Modal>
    </section>
  );
}
