import { useState } from 'react';
import { Group, SegmentedControl, ThemeIcon } from '@mantine/core';

export default function Demo() {
  const [variant, setVariant] = useState('filled');

  return (
    <Group>
      <ThemeIcon variant={variant} size="xl" aria-hidden="true">
        ✓
      </ThemeIcon>
      <SegmentedControl
        aria-label="图标样式"
        data={['filled', 'light', 'outline']}
        value={variant}
        onChange={setVariant}
      />
    </Group>
  );
}
