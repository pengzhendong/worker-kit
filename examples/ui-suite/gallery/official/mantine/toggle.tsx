import { Group, Toggle } from '@mantine/core';

export default function Demo() {
  return (
    <Group>
      <Toggle autoWidth>Save</Toggle>
      <Toggle autoWidth active>Active</Toggle>
      <Toggle autoWidth disabled>Disabled</Toggle>
    </Group>
  );
}
