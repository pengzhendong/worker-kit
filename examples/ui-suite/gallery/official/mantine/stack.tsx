import { Stack, Button } from '@mantine/core';

export default function Demo() {
  return (
    <Stack
      h={300}
      bg="var(--mantine-color-body)"

    >
      <Button variant="default">1</Button>
      <Button variant="default">2</Button>
      <Button variant="default">3</Button>
    </Stack>
  );
}
