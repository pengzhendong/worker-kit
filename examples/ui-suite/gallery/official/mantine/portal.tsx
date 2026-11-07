import { Portal } from '@mantine/core';

export default function Usage() {
  return (
    <>
      <div id="portal-target" aria-label="传送目标" />
      <Portal target="#portal-target" style={{ background: 'pink' }} className="class1 class2">
        <p>First</p>
      </Portal>
      <Portal target="#portal-target" style={{ background: 'pink' }}>
        <p>Second</p>
      </Portal>
    </>
  );
}
