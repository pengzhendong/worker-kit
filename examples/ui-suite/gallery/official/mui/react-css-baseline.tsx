import { useState } from 'react';
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

export default function Demo() {
  const [enabled, setEnabled] = useState(true);
  const content = (
    <Box sx={{ p: 2 }}>
      <h3>排版基础样式</h3>
      <p>这块区域展示默认字体、背景与排版。</p>
    </Box>
  );

  return (
    <Stack spacing={1}>
      <FormControlLabel
        label="应用基础样式"
        control={
          <Switch
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
        }
      />
      {enabled ? <ScopedCssBaseline>{content}</ScopedCssBaseline> : content}
    </Stack>
  );
}
