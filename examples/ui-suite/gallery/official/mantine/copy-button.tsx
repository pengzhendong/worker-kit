import { CopyButton, Button } from '@mantine/core';

export default function Demo() {
  return (
    <CopyButton value="WorkerKit">
      {({ copied, copy }) => (
        <Button color={copied ? 'teal' : 'blue'} onClick={copy}>
          {copied ? 'Copied url' : 'Copy url'}
        </Button>
      )}
    </CopyButton>
  );
}
