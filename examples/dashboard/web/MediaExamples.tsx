import { useState } from 'react';
import { App, Button, Card, Col, Input, Row, Typography } from 'antd';
import { PageToolbar } from '@pengzhendong/worker-kit/web';
import { ImageViewer, MediaCard, MediaGrid, MediaPlayer } from '@pengzhendong/worker-kit/web/media';
import '@pengzhendong/worker-kit/web/media/styles.css';

export function MediaExamples() {
  const [search, setSearch] = useState('');
  const { modal } = App.useApp();
  const samples = ['短标题', '这是一段用于检查两行排版与作者行对齐的资源标题'].filter(title => title.includes(search));
  return <><Row gutter={[16, 16]}>
    <Col xs={24} lg={12}><Card title="图片预览" extra={<Typography.Text type="secondary">Ant Design Image</Typography.Text>}>
      <div style={{ height: 200 }}><ImageViewer src="/media/landscape.svg" title="山间日落" /></div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>点击图片可缩放、旋转和全屏查看，按 Escape 关闭。</Typography.Paragraph>
    </Card></Col>
    <Col xs={24} lg={12}><Card title="音频试听" extra={<Typography.Text type="secondary">WaveSurfer + Video.js</Typography.Text>}>
      <MediaPlayer kind="audio" src="/media/tone.wav" title="示例提示音" bytes={256078} duration={8} waveform />
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>按需生成真实波形，可点击定位；播放另一段媒体时暂停当前播放。</Typography.Paragraph>
      <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 8 }}>列表试听（240 px 卡片）</Typography.Paragraph>
      <div style={{ width: 240, maxWidth: '100%' }}><MediaPlayer kind="audio" src="/media/tone.wav" title="紧凑试听示例" duration={8} compact /></div>
    </Card></Col>
    <Col xs={24} lg={12}><Card title="视频播放" extra={<Typography.Text type="secondary">Video.js 10</Typography.Text>}>
      <MediaPlayer kind="video" src="/media/clip.mp4" poster="/media/landscape.svg" title="示例视频" />
    </Card></Col>
    <Col xs={24} lg={12}><Card title="大文件与失败恢复">
      <MediaPlayer kind="audio" src="/media/tone.wav" title="大音频示例" bytes={100 * 1024 ** 2} duration={3600} waveform />
      <Typography.Paragraph type="secondary">列表与大文件默认不下载音频生成波形。应用可提供预计算 peaks 和时长。</Typography.Paragraph>
      <MediaPlayer kind="video" src="/media/unavailable.mp4" title="不可用视频示例" />
    </Card></Col>
  </Row><section data-testid="media-card-demo" style={{ marginTop: 16 }}>
    <PageToolbar title="资源卡片" meta={`${samples.length} 项`} actions={<Input placeholder="搜索卡片示例" value={search}
      onChange={event => setSearch(event.target.value)} style={{ width: 240, maxWidth: '100%' }} />} />
    <MediaGrid>{samples.map(title => <MediaCard key={title} title={title} description="示例作者" extra="2.9 MB"
      preview={<div style={{ height: 112 }}><ImageViewer src="/media/landscape.svg" title={`${title}封面`} /></div>}
      onOpen={() => { modal.info({ title: '资源详情', content: title }); }}
      action={<Button type="text" href="/media/landscape.svg" download aria-label={`下载 ${title}`}>下载</Button>} />)}</MediaGrid>
  </section></>;
}
