import { Badge, Group, Scroller } from '@mantine/core';

export default function Demo() {
  return (
    <Scroller>
      <Group gap="xs" wrap="nowrap">
        {Array.from({ length: 20 }).map((_, index) => (
          <Badge key={index} variant="light" size="lg">
            Badge {index + 1}
          </Badge>
        ))}
      </Group>
    </Scroller>
  );
}
