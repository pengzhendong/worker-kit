import { DEFAULT_THEME, rgba } from '@mantine/core';
import { Box } from '@mantine/core';

export default function Usage() {
  return (
    <div style={{ padding: 40 }}>
      <Box bg="orange.4" ms="xl" fz="h2" lh="h1" bdrs={100}>
        Visible from sm
      </Box>
    </div>
  );
}
