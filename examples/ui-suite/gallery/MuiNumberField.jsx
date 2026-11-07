import { NumberField } from '@base-ui/react/number-field';
import { Box, IconButton, Typography } from '@mui/material';

export default function MuiNumberField() {
  return (
    <NumberField.Root id="retry-count" defaultValue={3} min={0} max={100}>
      <Typography component="label" htmlFor="retry-count" variant="body2">
        重试次数
      </Typography>
      <NumberField.Group
        render={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mt: 0.5,
              width: 'fit-content',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              '&:focus-within': { borderColor: 'primary.main' },
            }}
          />
        }
      >
        <NumberField.Decrement
          aria-label="减少"
          render={<IconButton size="small" />}
        >
          −
        </NumberField.Decrement>
        <NumberField.Input
          render={
            <Box
              component="input"
              sx={{
                width: 64,
                textAlign: 'center',
                border: 0,
                bgcolor: 'transparent',
                color: 'text.primary',
                font: 'inherit',
              }}
            />
          }
        />
        <NumberField.Increment
          aria-label="增加"
          render={<IconButton size="small" />}
        >
          +
        </NumberField.Increment>
      </NumberField.Group>
    </NumberField.Root>
  );
}
