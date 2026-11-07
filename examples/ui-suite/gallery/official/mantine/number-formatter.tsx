import { NumberFormatter } from '@mantine/core';

export default function Demo() {
  return <NumberFormatter prefix="$ " value={1000000} thousandSeparator />;
}
