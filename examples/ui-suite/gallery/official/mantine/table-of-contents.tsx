import { useLayoutEffect, useRef, useState } from 'react';
import { Box, SimpleGrid, TableOfContents, Title } from '@mantine/core';

const headings = ['开始使用', '组件配置', '部署站点'];

export default function Demo() {
  const article = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useLayoutEffect(() => {
    function measure() {
      const viewport = article.current?.getBoundingClientRect();
      if (viewport) setOffset(Math.round(viewport.top));
    }

    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, []);

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <TableOfContents
        scrollSpyOptions={{
          selector: '#mantine-toc-preview h3',
          scrollHost: article,
          offset,
        }}
        getControlProps={({ data }) => ({
          onClick: () => {
            article.current?.scrollTo({
              top: data.getNode().offsetTop,
              behavior: 'smooth',
            });
          },
          children: data.value,
        })}
      />
      <Box
        id="mantine-toc-preview"
        ref={article}
        h={156}
        pos="relative"
        style={{ overflow: 'auto' }}
      >
        {headings.map((heading) => (
          <Box
            key={heading}
            h={156}
            p="sm"
            style={{
              borderBottom: '1px solid var(--mantine-color-default-border)',
            }}
          >
            <Title order={3}>{heading}</Title>
          </Box>
        ))}
      </Box>
    </SimpleGrid>
  );
}
