import { AspectRatio } from '@mantine/core';

export default function Demo() {
  return (
    <AspectRatio ratio={1080 / 720} maw={300} mx="auto">
      <img
        src="/nuxt/media/coast.svg"
        alt="Panda"
      />
    </AspectRatio>
  );
}
