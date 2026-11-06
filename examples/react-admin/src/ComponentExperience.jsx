import React, { useState } from 'react';
import { Alert, Button, Card, Col, Modal, Row, Space, Tag } from 'antd';

export default function ComponentExperience({ kind, dark, toggleTheme }) {
  const [dialog, setDialog] = useState(null);
  const [result, setResult] = useState('尚未执行操作');
  const [long, setLong] = useState(false);
  if (kind === 'dialogs') return <><Card title="弹窗交互"><p>比较遮罩、焦点、取消、确认以及 Escape 关闭。</p><Space wrap><Button type="primary" onClick={() => setDialog('example')}>打开示例弹窗</Button><Button danger onClick={() => setDialog('confirm')}>打开确认弹窗</Button></Space><p role="status" className="demo-section">{result}</p></Card><Modal title={dialog === 'confirm' ? '确认演示操作' : '示例弹窗'} open={!!dialog} onCancel={() => setDialog(null)} cancelText="取消" okText={dialog === 'confirm' ? '确认操作' : '完成操作'} okButtonProps={{ danger: dialog === 'confirm' }} onOk={() => { setResult(dialog === 'confirm' ? '已确认演示操作' : '已完成演示操作'); setDialog(null); }}><Alert type={dialog === 'confirm' ? 'warning' : 'info'} showIcon message="此操作只更新演示结果，取消会保留当前结果。" /></Modal></>;
  if (kind === 'layout') return <><Card title="响应式布局"><p>调整窗口宽度或切换手机预览；填充长内容后比较侧栏、顶栏与页面滚动。</p><Button onClick={() => setLong(!long)}>{long ? '收起长内容' : '填充长内容'}</Button></Card><Row gutter={[16, 16]} className="demo-section">{Array.from({ length: long ? 36 : 6 }, (_, i) => <Col xs={24} md={12} xl={8} key={i}><Card title={`布局卡片 ${i + 1}`}><p className="muted">相同内容在不同宽度下自动排列，可以观察间距和滚动表现。</p></Card></Col>)}</Row></>;
  return <><Card title="主题与状态" extra={<Tag>{dark ? '深色' : '浅色'}</Tag>}><p>使用框架原生主题，比较文字、背景、边框与状态颜色。</p><Button onClick={toggleTheme} aria-label="切换示例主题">切换明暗主题</Button></Card><Row gutter={[16, 16]} className="demo-section"><Col xs={24} lg={12}><Card title="按钮层级"><Space wrap><Button type="primary">主要按钮</Button><Button>描边按钮</Button><Button type="dashed">虚线按钮</Button><Button type="text">文字按钮</Button><Button disabled>禁用按钮</Button></Space></Card></Col><Col xs={24} lg={12}><Card title="状态与表面"><Space wrap><Tag color="success">成功</Tag><Tag color="warning">注意</Tag><Tag color="error">错误</Tag></Space><Alert className="demo-section" type="info" showIcon message="比较深浅背景下的文字、边框与状态色。" /></Card></Col></Row></>;
}
