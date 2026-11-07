import { useState, type CSSProperties } from 'react';
import { Stack, Text, Toolbar } from '@mantine/core';

export default function Demo() {
  const [formatting, setFormatting] = useState<string[]>([]);
  const [alignment, setAlignment] = useState<string | null>('left');

  return (
    <Stack>
      <Toolbar aria-label="文字格式">
        <Toolbar.ToggleGroup
          type="multiple"
          value={formatting}
          onChange={setFormatting}
        >
          <Toolbar.ToggleItem value="bold" aria-label="加粗">
            <b>B</b>
          </Toolbar.ToggleItem>
          <Toolbar.ToggleItem value="italic" aria-label="斜体">
            <i>I</i>
          </Toolbar.ToggleItem>
          <Toolbar.ToggleItem value="underline" aria-label="下划线">
            <u>U</u>
          </Toolbar.ToggleItem>
        </Toolbar.ToggleGroup>
        <Toolbar.Divider />
        <Toolbar.ToggleGroup
          type="single"
          value={alignment}
          onChange={setAlignment}
        >
          <Toolbar.ToggleItem value="left" aria-label="左对齐">
            左
          </Toolbar.ToggleItem>
          <Toolbar.ToggleItem value="center" aria-label="居中对齐">
            中
          </Toolbar.ToggleItem>
          <Toolbar.ToggleItem value="right" aria-label="右对齐">
            右
          </Toolbar.ToggleItem>
        </Toolbar.ToggleGroup>
      </Toolbar>
      <Text
        p="sm"
        style={{
          textAlign: (alignment ?? 'left') as CSSProperties['textAlign'],
          fontWeight: formatting.includes('bold') ? 700 : undefined,
          fontStyle: formatting.includes('italic') ? 'italic' : undefined,
          textDecoration: formatting.includes('underline')
            ? 'underline'
            : undefined,
        }}
      >
        选中工具栏按钮，可以改变这段文字的格式。
      </Text>
    </Stack>
  );
}
