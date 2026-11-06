import { useState } from 'react';
import { Button } from 'antd';
import { PageHeader } from '@pengzhendong/worker-kit/web';
import { MediaExamples } from './MediaExamples';

/** Development-only integration examples for the shared React media components. */
export function MediaPage() {
  const [version, setVersion] = useState(0);
  return <>
    <PageHeader title="媒体预览" description="验证共享媒体组件的播放、定位与错误恢复，素材仅用于本地演示。"
      actions={<Button onClick={() => setVersion(value => value + 1)}>重置媒体</Button>} />
    <MediaExamples key={version} />
  </>;
}
