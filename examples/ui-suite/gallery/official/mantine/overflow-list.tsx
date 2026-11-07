import { useState } from 'react';
import { Badge, OverflowList, Slider, Stack } from '@mantine/core';

const data = ['概览', '开发', '联调', '测试', '构建', '发布', '日志'];

export default function Demo() {
  const [width, setWidth] = useState(260);

  return (
    <Stack>
      <Slider
        aria-label="可用宽度"
        value={width}
        onChange={setWidth}
        min={120}
        max={520}
      />
      <div style={{ width, maxWidth: '100%' }}>
        <OverflowList
          data={data}
          gap={4}
          renderOverflow={(items) => <Badge>+{items.length}</Badge>}
          renderItem={(item) => <Badge key={item}>{item}</Badge>}
        />
      </div>
    </Stack>
  );
}
