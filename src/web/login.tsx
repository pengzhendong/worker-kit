import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography, theme } from 'antd';

export function LoginPage({ title, description = '登录你的管理后台', onLogin }: {
  title: string;
  description?: string;
  onLogin: (values: { username: string; password: string }) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { token } = theme.useToken();
  return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: token.colorBgLayout }}>
    <Card style={{ width: '100%', maxWidth: 420 }}>
      <Typography.Title level={2} style={{ marginTop: 4 }}>{title}</Typography.Title>
      <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 20 }} />}
      <Form layout="vertical" requiredMark={false} onFinish={async (values) => {
        setError(''); setBusy(true);
        try { await onLogin(values); }
        catch (failure) { setError(failure instanceof Error ? failure.message : '登录失败'); }
        finally { setBusy(false); }
      }}>
        <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}><Input autoComplete="username" size="large" maxLength={256} /></Form.Item>
        <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}><Input.Password autoComplete="current-password" size="large" maxLength={1024} /></Form.Item>
        <Button type="primary" htmlType="submit" loading={busy} block size="large">登录</Button>
      </Form>
    </Card>
  </main>;
}
