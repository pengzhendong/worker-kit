import { Button, Card, Space, Typography } from 'antd';
import { ErrorBoundary } from 'react-error-boundary';
import type { ComponentProps } from 'react';

/** Rendering/lazy-load failures only. Async requests and event handlers still handle their own errors. */
export function AppErrorBoundary({ children, resetKeys, onReset, onError, scope = 'page' }: Pick<ComponentProps<typeof ErrorBoundary>, 'children' | 'resetKeys' | 'onReset' | 'onError'> & { scope?: 'page' | 'application' }) {
  return <ErrorBoundary children={children} resetKeys={resetKeys} onReset={onReset} onError={onError} fallbackRender={({ resetErrorBoundary }) =>
    <div role="alert" aria-label={scope === 'page' ? '页面错误' : '应用错误'} style={{ padding: 24, width: '100%', boxSizing: 'border-box' }}>
      <Card style={{ maxWidth: 640, margin: '24px auto' }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>{scope === 'page' ? '页面暂时无法显示' : '应用暂时无法显示'}</Typography.Title>
        <Typography.Paragraph type="secondary">{scope === 'page' ? '可以重试当前页面，或通过导航打开其他页面。' : '可以重试，或重新加载应用。'} 如果刚完成升级，重新加载可获取最新页面文件。</Typography.Paragraph>
        <Space wrap><Button type="primary" onClick={resetErrorBoundary}>重试{scope === 'page' ? '当前页面' : '应用'}</Button><Button onClick={() => window.location.reload()}>重新加载应用</Button></Space>
      </Card>
    </div>} />;
}
