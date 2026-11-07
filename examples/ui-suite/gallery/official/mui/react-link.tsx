import * as React from 'react';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';

const preventDefault = (event: React.SyntheticEvent) => event.preventDefault();

export default function Links() {
  return (
    <Box
      sx={{
        typography: 'body1',
        '& > :not(style) ~ :not(style)': {
          ml: 2,
        },
      }}
      onClick={preventDefault}
    >
      <Link href="#links">Link</Link>
      <Link href="#links" color="inherit">
        {'color="inherit"'}
      </Link>
      <Link href="#links" variant="body2">
        {'variant="body2"'}
      </Link>
    </Box>
  );
}
