import { ActionIcon } from '@mantine/core';
import { VisuallyHidden } from '@mantine/core';

export default function Usage() {
  return (
    <div style={{ padding: 40 }}>
      <ActionIcon>
        <VisuallyHidden>Pronounce this</VisuallyHidden>
        $$
      </ActionIcon>
    </div>
  );
}
