import { BackgroundImage, Center, Text, Box } from '@mantine/core';


export default function Demo() {
  return (
    <Box maw={300} mx="auto">
      <BackgroundImage
        src="/nuxt/media/coast.svg"

      >
        <Center p="md">
          <Text c="white">
            BackgroundImage component can be used to add any content on image. It is useful for hero
            headers and other similar sections
          </Text>
        </Center>
      </BackgroundImage>
    </Box>
  );
}
