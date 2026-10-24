import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography, theme } from 'antd';
import { ApiClientError } from './api';
import { isRequestCancelled } from './session';

export function LoginPage({ title, description = '登录你的管理后台', onLogin }: {
  title: string;
  description?: string;
  onLogin: (values: { username: string; password: string }, signal?: AbortSignal) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const pending = useRef<AbortController | null>(null); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pending.current?.abort(); }; }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const { token } = theme.useToken();
  return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: token.colorBgLayout }}>
    <Card style={{ width: '100%', maxWidth: 420 }}>
      <Typography.Title level={2} style={{ marginTop: 4 }}>{title}</Typography.Title>
      <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
      {(error || cooldown > 0) && <Alert type="error" title={cooldown ? `登录尝试过于频繁，请在 ${cooldown} 秒后重试。` : error} showIcon style={{ marginBottom: 20 }} />}
      <Form layout="vertical" requiredMark={false} onFinish={async (values) => {
        if (pending.current || cooldown) return;
        const controller = new AbortController(); pending.current = controller;
        setError(''); setBusy(true);
        try { await onLogin(values, controller.signal); }
        catch (failure) {
          if (!mounted.current || controller.signal.aborted || isRequestCancelled(failure)) return;
          if (failure instanceof ApiClientError && failure.status === 429) { setCooldown(failure.retryAfterSeconds ?? 60); setError('请求过于频繁，请稍后重试'); }
          else if (failure instanceof ApiClientError && failure.status === 401) setError('用户名或密码错误');
          else if (failure instanceof ApiClientError && failure.status >= 500) setError('登录服务暂时不可用，请稍后重试');
          else if (failure instanceof TypeError) setError('网络连接失败，请检查连接后重试');
          else setError(failure instanceof Error ? failure.message : '登录失败');
        }
        finally { pending.current = null; if (mounted.current) setBusy(false); }
      }}>
        <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}><Input autoComplete="username" size="large" maxLength={256} /></Form.Item>
        <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}><Input.Password autoComplete="current-password" size="large" maxLength={1024} /></Form.Item>
        <Button type="primary" htmlType="submit" loading={busy} disabled={cooldown > 0} block size="large">{cooldown ? `${cooldown} 秒后重试` : '登录'}</Button>
      </Form>
    </Card>
  </main>;
}
