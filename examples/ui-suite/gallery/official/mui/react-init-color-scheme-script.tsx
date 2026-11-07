import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import scripts from '#gallery-ssr-fixture';

type Mode = 'light' | 'dark';

function preview(mode: Mode) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
    ${scripts[mode]}
    <style>
      html { color-scheme: light; font: 14px system-ui; }
      html[data-workerkit-demo-mode="dark"] { color-scheme: dark; }
      body { background: Canvas; color: CanvasText; margin: 1rem; }
      .dark { display: none; }
      html[data-workerkit-demo-mode="dark"] .dark { display: inline; }
      html[data-workerkit-demo-mode="dark"] .light { display: none; }
    </style>
    </head><body>页面首次绘制时使用<span class="light">浅色</span><span class="dark">深色</span>模式。</body></html>`;
}

export default function Demo() {
  const [mode, setMode] = useState<Mode>('light');

  return (
    <Stack spacing={2}>
      <ToggleButtonGroup
        size="small"
        value={mode}
        exclusive
        aria-label="页面初始配色"
        onChange={(_, value) => value && setMode(value)}
      >
        <ToggleButton value="light">浅色启动</ToggleButton>
        <ToggleButton value="dark">深色启动</ToggleButton>
      </ToggleButtonGroup>
      <Box
        component="iframe"
        title="初始配色预览"
        srcDoc={preview(mode)}
        sx={{
          width: '100%',
          height: 72,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      />
    </Stack>
  );
}
