import { Button, Card, Col, Flex, Row, Space, Tag, Typography } from 'antd';
import { useModuleAccess } from '@pengzhendong/worker-kit/web';
import { isModuleEnabled } from '@pengzhendong/worker-kit/modules';

export function ModulesPanel({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { modules, access, can, canOpen } = useModuleAccess();
  return <Space orientation="vertical" size={24} className="demo-stack">
    <Typography.Paragraph type="secondary" style={{ margin: 0 }}>下列内容来自实际模块声明与服务端权限。当前示例由服务端明确授予单管理员全部已启用操作；这里展示结果，不修改权限。</Typography.Paragraph>
    <Row gutter={[16, 16]}>{modules.map((module) => {
      const enabled = isModuleEnabled(module, access); const allowed = canOpen(module.id);
      return <Col key={module.id} xs={24} xl={12}><section aria-label={`${module.label}模块声明`} style={{ height: '100%' }}><Card style={{ height: '100%' }} styles={{ body: { padding: 20 } }}>
        <Flex align="center" justify="space-between" gap={12} wrap><Typography.Title level={5} style={{ margin: 0 }}>{module.label}</Typography.Title><Tag color={allowed ? 'green' : 'default'}>{!enabled ? '未启用' : allowed ? '可访问' : '无访问权限'}</Tag></Flex>
        <Space orientation="vertical" size={8} style={{ marginBlock: 16, width: '100%' }}>
          <div><Typography.Text type="secondary">模块 ID：</Typography.Text><Typography.Text code>{module.id}</Typography.Text></div>
          <div><Typography.Text type="secondary">页面路径：</Typography.Text><Typography.Text code>{module.path}</Typography.Text></div>
          <div><Typography.Text type="secondary">菜单位置：</Typography.Text>{module.navigation?.placement === 'sidebar' ? '左侧导航' : module.navigation?.placement === 'user' ? '用户菜单' : '不显示菜单'}{module.navigation && ` · 顺序 ${module.navigation.order}`}</div>
          <div><Typography.Text type="secondary">页面访问：</Typography.Text>{module.access ? <Typography.Text code>{`${module.id}:${module.access}`}</Typography.Text> : '登录后可访问'}</div>
          {module.developmentOnly && <Tag color="blue">仅开发环境</Tag>}
        </Space>
        <div aria-label="模块操作权限">{Object.entries(module.actions).length ? <Space orientation="vertical" size={8} style={{ width: '100%', marginBottom: 16 }}>{Object.entries(module.actions).map(([action, label]) => {
          const permission = `${module.id}:${action}`;
          return <Flex key={action} gap={8} align="center" wrap><Typography.Text>{label}</Typography.Text><Typography.Text code style={{ overflowWrap: 'anywhere' }}>{permission}</Typography.Text><Tag color={can(permission) ? 'green' : 'default'}>{can(permission) ? '已授予' : '未授予'}</Tag></Flex>;
        })}</Space> : <Typography.Paragraph type="secondary">没有声明独立操作权限，属于登录后使用的辅助页面。</Typography.Paragraph>}</div>
        {allowed && <Button onClick={() => onNavigate(module.id)}>打开{module.label}</Button>}
      </Card></section></Col>;
    })}</Row>
    <Typography.Paragraph type="secondary" style={{ margin: 0 }}>模块停用会同时移除导航、阻止页面访问和接口操作。菜单隐藏只影响导航，服务端仍独立校验每个操作；这里的页面路径不是 API 路由。</Typography.Paragraph>
  </Space>;
}
