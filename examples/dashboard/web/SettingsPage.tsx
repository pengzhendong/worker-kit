import { useEffect, useState } from 'react';
import { App, Button, Card, Col, Form, Input, Row, Select, Space, Switch, Typography } from 'antd';
import { PageHeader, useModuleAccess } from '@pengzhendong/worker-kit/web';
import { api, formatTime, jsonRequest, QueryError, useQuery } from './data';
import type { Settings } from './data';

export function SettingsPage({ onSaved }: { onSaved: (settings: Settings) => void }) {
  const { can } = useModuleAccess();
  const { data, error, loading, refresh } = useQuery<{ values: Settings; updatedAt: string | null }>('/api/admin/settings');
  const [form] = Form.useForm(); const [saving, setSaving] = useState(false); const { message } = App.useApp();
  useEffect(() => { if (data) form.setFieldsValue(data.values); }, [data, form]);
  async function save(values: Settings) {
    setSaving(true);
    try { const saved = await api<{ values: Settings }>('/api/admin/settings', jsonRequest('PUT', { values })); onSaved(saved.values); void message.success('设置已保存'); refresh(); }
    catch (failure) { void message.error(failure instanceof Error ? failure.message : '保存失败'); } finally { setSaving(false); }
  }
  return <>
    <PageHeader title="系统设置" description="调整应用名称、显示偏好与联系信息。" />
    <QueryError error={error} retry={refresh} />
    <Row gutter={[24, 24]}><Col xs={24} xl={16}><Card title="基本设置" loading={loading && !data}>
      <Form form={form} layout="vertical" onFinish={save} requiredMark={false} disabled={!can('settings:update')}>
        <Form.Item label="应用名称" name="siteName" extra="显示在导航栏和浏览器标签上。" rules={[{ required: true, whitespace: true, message: '请输入应用名称' }]}><Input maxLength={40} /></Form.Item>
        <Form.Item label="应用描述" name="description"><Input.TextArea rows={3} maxLength={200} /></Form.Item>
        <Form.Item label="联系邮箱" name="contactEmail" rules={[{ type: 'email', message: '请输入有效邮箱' }]}><Input placeholder="admin@example.com" maxLength={254} /></Form.Item>
        <Form.Item label="默认每页条数" name="pageSize"><Select style={{ width: 180 }} options={[10, 20, 50, 100].map((value) => ({ value, label: `${value} 条` }))} /></Form.Item>
        <Form.Item label="显示欢迎区域" name="showWelcome" valuePropName="checked"><Switch /></Form.Item>
        {can('settings:update') && <Space><Button type="primary" htmlType="submit" loading={saving}>保存设置</Button><Button onClick={() => data && form.setFieldsValue(data.values)}>撤销未保存修改</Button></Space>}
      </Form>
    </Card></Col><Col xs={24} xl={8}><Card title="保存状态"><Typography.Paragraph>{data?.updatedAt ? `最近保存：${formatTime(data.updatedAt)}` : '当前使用初始设置，尚未保存修改。'}</Typography.Paragraph><Typography.Paragraph type="secondary">设置保存在当前应用中。更改应用名称与显示偏好不会影响其他项目。</Typography.Paragraph><Typography.Paragraph type="secondary">管理员密码由部署配置管理，此处不保存认证凭据。</Typography.Paragraph></Card></Col></Row>
  </>;
}
