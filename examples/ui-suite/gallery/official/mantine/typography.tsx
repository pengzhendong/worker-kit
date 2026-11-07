import { Typography } from '@mantine/core';

export default function Demo() {
  return (
    <Typography>
      <h2>发布记录</h2>
      <p>
        在这里可以阅读 <strong>更新摘要</strong> 和 <em>部署说明</em>。
      </p>
      <ul>
        <li>构建静态资源</li>
        <li>检查预览结果</li>
      </ul>
      <blockquote>先预览，再发布。</blockquote>
    </Typography>
  );
}
