import { AppShell, Box, Burger, Group, NavLink, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';

export default function Demo() {
  const [opened, { toggle }] = useDisclosure(true);
  const [page, setPage] = useState('概览');

  return (
    <AppShell
      header={{ height: 44 }}
      navbar={{ width: 108, breakpoint: 0, collapsed: { desktop: !opened } }}
      offsetScrollbars={false}
      padding="sm"
      style={{ position: 'relative', minHeight: 210, overflow: 'hidden' }}
    >
      <AppShell.Header style={{ position: 'absolute' }}>
        <Group h="100%" px="sm">
          <Burger
            opened={opened}
            onClick={toggle}
            size="sm"
            aria-label="切换导航"
          />
          <Text fw={600}>工作区</Text>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p={4} style={{ position: 'absolute' }}>
        {['概览', '项目', '设置'].map((label) => (
          <NavLink
            key={label}
            component="button"
            label={label}
            active={page === label}
            onClick={() => setPage(label)}
          />
        ))}
      </AppShell.Navbar>
      <AppShell.Main style={{ minHeight: 210 }}>
        <Box p="sm">
          <Text aria-live="polite">{page}</Text>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
