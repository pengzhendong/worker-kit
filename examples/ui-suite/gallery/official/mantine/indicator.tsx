import { Indicator, Avatar } from '@mantine/core';

export default function Demo() {
  return (
    <Indicator>
      <Avatar
        size="lg"
        radius="sm"
        src="/nuxt/media/coast.svg"
      />
    </Indicator>
  );
}
