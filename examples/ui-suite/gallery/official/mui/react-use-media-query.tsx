import useMediaQuery from '@mui/material/useMediaQuery';

export default function JavaScriptMedia() {
  const matches = useMediaQuery(
    '(min-width: 600px)',
  );

  return <span>{`{ minWidth: 600 } matches: ${matches}`}</span>;
}
