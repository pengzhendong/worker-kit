import { Card, Col, Row, Typography } from 'antd';
import { ImageViewer, MediaPlayer } from '@pengzhendong/worker-kit/web/media';
import '@pengzhendong/worker-kit/web/media/styles.css';

export function MediaExamples() {
  return <Row gutter={[16, 16]}>
    <Col xs={24} lg={12}><Card title="图片预览" extra={<Typography.Text type="secondary">Ant Design Image</Typography.Text>}>
      <div style={{ height: 200 }}><ImageViewer src="/media/landscape.svg" title="山间日落" /></div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>点击图片可缩放、旋转和全屏查看，按 Escape 关闭。</Typography.Paragraph>
    </Card></Col>
    <Col xs={24} lg={12}><Card title="音频试听" extra={<Typography.Text type="secondary">WaveSurfer + Video.js</Typography.Text>}>
      <MediaPlayer kind="audio" src="/media/tone.wav" title="示例提示音" bytes={256078} duration={8} waveform />
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>按需生成真实波形，可点击定位；播放另一段媒体时暂停当前播放。</Typography.Paragraph>
    </Card></Col>
    <Col xs={24} lg={12}><Card title="视频播放" extra={<Typography.Text type="secondary">Video.js 10</Typography.Text>}>
      <MediaPlayer kind="video" src="/media/clip.mp4" poster="/media/landscape.svg" title="示例视频" />
    </Card></Col>
    <Col xs={24} lg={12}><Card title="大文件与失败恢复">
      <MediaPlayer kind="audio" src="/media/tone.wav" title="大音频示例" bytes={100 * 1024 ** 2} duration={3600} waveform />
      <Typography.Paragraph type="secondary">列表与大文件默认不下载音频生成波形。应用可提供预计算 peaks 和时长。</Typography.Paragraph>
      <MediaPlayer kind="video" src="/media/unavailable.mp4" title="不可用视频示例" />
    </Card></Col>
  </Row>;
}
