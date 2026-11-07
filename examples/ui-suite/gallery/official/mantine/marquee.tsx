import { Badge, Marquee } from '@mantine/core';

export default function Demo() {
  return (
    <Marquee gap="lg">
      <Badge size="lg" color="blue">设计</Badge>
      <Badge size="lg" color="cyan">开发</Badge>
      <Badge size="lg" color="teal">测试</Badge>
      <Badge size="lg" color="green">构建</Badge>
      <Badge size="lg" color="lime">预览</Badge>
      <Badge size="lg" color="yellow">发布</Badge>
      <Badge size="lg" color="orange">运行</Badge>
      <Badge size="lg" color="red">归档</Badge>
    </Marquee>
  );
}
