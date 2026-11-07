import { Spoiler } from '@mantine/core';

export default function Demo() {
  return (
    <Spoiler maxHeight={120} showLabel="Show more" hideLabel="Hide">
      <p>项目简介</p>
      <p>这段内容展示如何把较长的说明折叠在固定高度内。</p>
      <p>点击 Show more 可以展开并阅读剩余内容。</p>
      <p>再次点击 Hide 会恢复折叠高度。</p>
      <p>按钮会根据内容的实际高度决定是否显示。</p>
    </Spoiler>
  );
}
