import { useState } from 'react';
import { HueSlider } from '@mantine/core';

export default function Usage() {
  const [value, onChange] = useState(250);

  return (
    <>
      <div>Hue value: {value}</div>
      <HueSlider value={value} onChange={onChange} />
    </>
  );
}
