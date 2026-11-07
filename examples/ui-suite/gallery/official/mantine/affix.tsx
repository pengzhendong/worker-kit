import { useRef, useState } from 'react';
import { Affix, Box, Button, Text, Transition } from '@mantine/core';

export default function Demo() {
  const preview = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  return (
    <Box pos="relative">
      <Box
        ref={preview}
        h={176}
        p="sm"
        tabIndex={0}
        aria-label="滚动区"
        onScroll={(event) => setScrolled(event.currentTarget.scrollTop > 0)}
        style={{ overflow: 'auto' }}
      >
        <Text h={192}>向下滚动，观察按钮如何固定在预览区底部。</Text>
        <Text h={192}>这是后续内容。</Text>
      </Box>
      <Affix
        withinPortal={false}
        position={{ bottom: 12, right: 12 }}
        style={{ position: 'absolute' }}
      >
        <Transition transition="slide-up" mounted={scrolled}>
          {(styles) => (
            <Button
              style={styles}
              onClick={() =>
                preview.current?.scrollTo({ top: 0, behavior: 'smooth' })
              }
            >
              返回顶部
            </Button>
          )}
        </Transition>
      </Affix>
    </Box>
  );
}
