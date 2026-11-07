import { Blockquote } from '@mantine/core';

export default function Demo() {
  return (
    <Blockquote
      color="blue"
      cite="WorkerKit 示例笔记"
      icon={<span aria-hidden="true">“</span>}
    >
      在调整界面之前，先用真实数据走一遍完整流程。
    </Blockquote>
  );
}
