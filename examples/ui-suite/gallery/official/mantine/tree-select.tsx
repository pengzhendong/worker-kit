import { TreeSelect } from '@mantine/core';
import { data } from './tree-select-data';

export default function Demo() {
  return (
    <TreeSelect
      label="Your favorite item"
      placeholder="Pick value"
      data={data}
      searchable
    />
  );
}
