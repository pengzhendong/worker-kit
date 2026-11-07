import {
  Button,
  Card,
  Chip,
  CardContent,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { taskColumns, taskValue } from '../../ui-demo/component-fixtures';
import ComponentDemos from './ComponentDemos';
import type { ComponentProps } from 'react';

export default function MuiDemos(
  props: Omit<ComponentProps<typeof ComponentDemos>, 'controls'>,
) {
  return (
    <ComponentDemos
      {...props}
      controls={{
        card: (content) => (
          <Card variant="outlined">
            <CardContent>{content}</CardContent>
          </Card>
        ),
        button: (label, onClick, disabled, primary) => (
          <Button
            variant={primary ? 'contained' : 'outlined'}
            onClick={onClick}
            disabled={disabled}
          >
            {label}
          </Button>
        ),
        input: (label, value, change) => (
          <TextField
            fullWidth
            size="small"
            label={label}
            value={value}
            onChange={(event) => change(event.target.value)}
          />
        ),
        description: (value, change) => (
          <TextField
            fullWidth
            multiline
            minRows={2}
            size="small"
            label="说明"
            value={value}
            onChange={(event) => change(event.target.value)}
          />
        ),
        select: (label, value, options, change) => (
          <TextField
            fullWidth
            select
            size="small"
            label={label}
            value={value}
            onChange={(event) => change(event.target.value)}
          >
            {options.map((zone) => (
              <MenuItem key={zone} value={zone}>
                {zone}
              </MenuItem>
            ))}
          </TextField>
        ),
        retention: (value, change) => (
          <TextField
            fullWidth
            size="small"
            type="number"
            label="日志保留天数"
            value={value ?? ''}
            onChange={(event) =>
              change(
                event.target.value === '' ? null : Number(event.target.value),
              )
            }
          />
        ),
        toggle: (label, value, change) => (
          <FormControlLabel
            label={label}
            control={
              <Switch
                checked={value}
                onChange={(_, checked) => change(checked)}
              />
            }
          />
        ),
        table: (rows, run, toggle) => (
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                {taskColumns.map(({ key, title }) => (
                  <TableCell key={key}>{title}</TableCell>
                ))}
                <TableCell>启用</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {taskColumns.map(({ key }) => (
                    <TableCell key={key}>{taskValue(row, key)}</TableCell>
                  ))}
                  <TableCell>
                    <Switch
                      checked={row.enabled}
                      slotProps={{ input: { 'aria-label': '启用' + row.name } }}
                      onChange={(_, checked) => toggle(row, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      aria-label={'运行' + row.name}
                      onClick={() => run(row)}
                    >
                      运行
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ),
        statuses: () => (
          <div className="react-component-actions demo-statuses">
            <Chip label="成功" color="success" />
            <Chip label="警告" color="warning" />
            <Chip label="错误" color="error" />
          </div>
        ),
        dialog: (open, confirming, close, complete) => (
          <Dialog
            open={open}
            onClose={close}
            aria-labelledby="mui-demo-dialog-title"
          >
            <DialogTitle id="mui-demo-dialog-title">
              {confirming ? '确认演示操作' : '示例弹窗'}
            </DialogTitle>
            <DialogContent>确认后显示演示结果。</DialogContent>
            <DialogActions>
              <Button onClick={close}>取消</Button>
              <Button onClick={complete}>
                {confirming ? '确认操作' : '完成操作'}
              </Button>
            </DialogActions>
          </Dialog>
        ),
      }}
    />
  );
}
