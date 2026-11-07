import { useState } from 'react';
import { AlphaSlider } from '@mantine/core';

export default function Usage() {
  const [value, onChange] = useState(0.55);

  return (
    <>
      <div>Alpha value: {value}</div>
      <AlphaSlider
        color="#ff0"
        value={value}
        onChange={onChange}
        styles={{ thumb: { border: '1px solid red' } }}
      />
    </>
  );
}
