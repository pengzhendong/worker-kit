import { createElement as h } from 'react';
import {
  Autocomplete,
  ButtonGroup,
  Fab,
  Snackbar,
  Step,
  StepLabel,
  Stepper,
  TextareaAutosize,
  ToggleButton,
  ToggleButtonGroup,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  Drawer,
  Divider,
  Modal,
  Popover,
  FormControlLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Radio,
  RadioGroup,
  Tooltip,
  Rating,
  Skeleton,
  Slider,
  Stack,
  Switch,
  Tab,
  Tabs,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { choices, tableColumns, tableRows } from './examples.js';
import { mountReact, row, status } from './react-mount.js';

const theme = createTheme();
const provider = ({ children }) => h(ThemeProvider, { theme }, children);
const input = (props, value, change) =>
  h(TextField, {
    fullWidth: true,
    size: 'small',
    value,
    onChange: (event) => change(event.target.value),
    ...props,
  });
const details = '该任务每 30 分钟运行一次。';
const demos = {
  list: (value, change) =>
    h(
      List,
      { dense: true, 'aria-label': '选择任务' },
      choices.map(({ value: key, label }) =>
        h(
          ListItem,
          { key, disablePadding: true },
          h(
            ListItemButton,
            { selected: value === key, onClick: () => change(key) },
            h(ListItemText, { primary: label }),
          ),
        ),
      ),
    ),
  menu: (anchor, change) => [
    h(
      Button,
      { key: 'button', onClick: (event) => change(event.currentTarget) },
      '打开菜单',
    ),
    h(
      Menu,
      {
        key: 'menu',
        open: Boolean(anchor),
        anchorEl: anchor || null,
        onClose: () => change(null),
      },
      choices.map(({ value, label }) =>
        h(MenuItem, { key: value, onClick: () => change(null) }, label),
      ),
    ),
  ],
  paper: () => h(Paper, { elevation: 2, sx: { p: 2 } }, '带阴影的内容容器'),
  stack: () =>
    h(
      Stack,
      { spacing: 1 },
      choices.map(({ value, label }) =>
        h(Paper, { key: value, variant: 'outlined', sx: { p: 1 } }, label),
      ),
    ),
  table: () =>
    h(
      Table,
      { size: 'small' },
      h(
        TableHead,
        null,
        h(
          TableRow,
          null,
          tableColumns.map(({ key, label }) => h(TableCell, { key }, label)),
        ),
      ),
      h(
        TableBody,
        null,
        tableRows.map((item) =>
          h(
            TableRow,
            { key: item.name },
            tableColumns.map(({ key }) => h(TableCell, { key }, item[key])),
          ),
        ),
      ),
    ),
  autocomplete: (value, change) =>
    h(Autocomplete, {
      options: choices.map(({ label }) => label),
      inputValue: value,
      onInputChange: (_, next) => change(next),
      renderInput: (props) => h(TextField, { ...props, label: '搜索任务' }),
    }),
  buttonGroup: (value, change) =>
    h(
      ButtonGroup,
      { size: 'small', 'aria-label': '任务按钮组' },
      choices.map((item) =>
        h(
          Button,
          {
            key: item.value,
            variant: value === item.value ? 'contained' : 'outlined',
            onClick: () => change(item.value),
          },
          item.label,
        ),
      ),
    ),
  fab: (value, change) =>
    row(
      h(
        Fab,
        {
          color: 'primary',
          size: 'small',
          'aria-label': '新建任务',
          onClick: () => change('任务已创建'),
        },
        '+',
      ),
      status(value),
    ),
  transfer: (value, change) =>
    h(
      'div',
      { className: 'gallery-transfer' },
      ...[false, true].map((selected) =>
        h(
          Card,
          { variant: 'outlined', key: String(selected) },
          h(
            CardContent,
            null,
            h('strong', null, selected ? '已分配' : '待分配'),
            h(
              'ul',
              { className: 'gallery-example-list' },
              choices
                .filter((item) => value.includes(item.value) === selected)
                .map((item) =>
                  h(
                    'li',
                    { key: item.value },
                    row(
                      h('span', null, item.label),
                      h(
                        Button,
                        {
                          size: 'small',
                          'aria-label':
                            (selected ? '移出' : '加入') + item.label,
                          onClick: () =>
                            change(
                              selected
                                ? value.filter((id) => id !== item.value)
                                : [...value, item.value],
                            ),
                        },
                        selected ? '移出' : '加入',
                      ),
                    ),
                  ),
                ),
            ),
          ),
        ),
      ),
    ),
  toggleButton: (value, change) =>
    h(
      ToggleButtonGroup,
      {
        exclusive: true,
        value,
        size: 'small',
        onChange: (_, next) => change(next),
        'aria-label': '选择任务',
      },
      choices.map((item) =>
        h(ToggleButton, { key: item.value, value: item.value }, item.label),
      ),
    ),
  stepper: (value, change) => [
    h(
      Stepper,
      { activeStep: value - 1, orientation: 'vertical', key: 'steps' },
      choices.map((item) =>
        h(Step, { key: item.value }, h(StepLabel, null, item.label)),
      ),
    ),
    h(
      Button,
      { key: 'next', onClick: () => change((value % choices.length) + 1) },
      '下一步',
    ),
  ],
  snackbar: (value, change) =>
    row(
      h(Button, { onClick: () => change(true) }, '显示提示'),
      h(Snackbar, {
        open: value,
        autoHideDuration: 4000,
        onClose: () => change(false),
        message: '任务已更新',
      }),
    ),
  textareaAutosize: (value, change) =>
    h(TextareaAutosize, {
      minRows: 3,
      maxRows: 6,
      value,
      'aria-label': '任务备注',
      placeholder: '输入备注，行数会随内容增加',
      onChange: (event) => change(event.target.value),
      style: {
        width: '100%',
        font: 'inherit',
        padding: 8,
        border: '1px solid #a8b5ca',
        borderRadius: 4,
      },
    }),

  dialog: (open, change) =>
    row(
      h(
        Button,
        { variant: 'outlined', onClick: () => change(true) },
        '打开弹窗',
      ),
      h(
        Dialog,
        { open, onClose: () => change(false) },
        h(DialogTitle, null, '任务详情'),
        h(DialogContent, null, details),
      ),
    ),
  drawer: (open, change) =>
    row(
      h(
        Button,
        { variant: 'outlined', onClick: () => change(true) },
        '打开抽屉',
      ),
      h(
        Drawer,
        { open, anchor: 'right', onClose: () => change(false) },
        h(
          'div',
          { style: { padding: 24 } },
          h('h3', null, '任务详情'),
          details,
        ),
      ),
    ),
  modal: (open, change) =>
    row(
      h(
        Button,
        { variant: 'outlined', onClick: () => change(true) },
        '打开弹窗',
      ),
      h(
        Modal,
        {
          open,
          onClose: () => change(false),
          'aria-labelledby': 'sample-modal-title',
        },
        h(
          'div',
          {
            role: 'dialog',
            style: {
              position: 'absolute',
              top: '30%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(380px, 90vw)',
              padding: 24,
              background: 'white',
              borderRadius: 8,
            },
          },
          h('h3', { id: 'sample-modal-title' }, '任务详情'),
          details,
        ),
      ),
    ),
  popover: (anchor, change) =>
    row(
      h(
        Button,
        {
          variant: 'outlined',
          onClick: (event) => change(event.currentTarget),
        },
        '打开面板',
      ),
      h(
        Popover,
        {
          open: Boolean(anchor),
          anchorEl: anchor || null,
          onClose: () => change(null),
          anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
        },
        h('div', { style: { padding: 16 } }, details),
      ),
    ),
  breadcrumb: () =>
    h(
      Breadcrumbs,
      { 'aria-label': '当前位置' },
      ['工作空间', '任务', '详情'].map((label) =>
        h('span', { key: label }, label),
      ),
    ),

  tooltip: () =>
    h(
      Tooltip,
      { describeChild: true, title: '该任务每 30 分钟运行一次。' },
      h(Button, { variant: 'outlined' }, '查看提示'),
    ),
  button: (value, change) =>
    row(
      h(
        Button,
        { variant: 'contained', onClick: () => change(value + 1) },
        '执行',
      ),
      h(Button, { disabled: true }, '禁用'),
      status('已点击 ' + value + ' 次'),
    ),
  input: (value, change) => input({ label: '任务名称' }, value, change),
  textarea: (value, change) =>
    input({ label: '备注', multiline: true, rows: 3 }, value, change),
  checkbox: (value, change) =>
    h(FormControlLabel, {
      label: '包含失败记录',
      control: h(Checkbox, {
        checked: value,
        onChange: (_, checked) => change(checked),
      }),
    }),
  radio: (value, change) =>
    h(
      RadioGroup,
      {
        row: true,
        value,
        onChange: (_, next) => change(next),
        'aria-label': '任务类型',
      },
      choices.map(({ label, value }) =>
        h(FormControlLabel, { key: value, label, value, control: h(Radio) }),
      ),
    ),
  switch: (value, change) =>
    h(FormControlLabel, {
      label: '自动刷新',
      control: h(Switch, {
        checked: value,
        onChange: (_, checked) => change(checked),
      }),
    }),
  slider: (value, change) =>
    h(Slider, {
      value,
      onChange: (_, next) => change(next),
      valueLabelDisplay: 'auto',
      step: 5,
      'aria-label': '阈值',
    }),
  rating: (value, change) =>
    h(Rating, { value, precision: 0.5, onChange: (_, next) => change(next) }),
  select: (value, change) =>
    h(
      TextField,
      {
        select: true,
        label: '选择任务',
        size: 'small',
        fullWidth: true,
        value: value ?? '',
        onChange: (e) => change(e.target.value),
      },
      choices.map(({ label, value }) =>
        h(MenuItem, { key: value, value }, label),
      ),
    ),
  tabs: (value, change) =>
    h(
      'div',
      null,
      h(
        Tabs,
        {
          value,
          onChange: (_, next) => change(next),
          variant: 'scrollable',
          'aria-label': '任务分类',
        },
        choices.map(({ label, value }) => h(Tab, { key: value, value, label })),
      ),
      h(
        'p',
        { role: 'tabpanel' },
        '查看' + choices.find((c) => c.value === value).label + '的记录。',
      ),
    ),
  accordion: () =>
    choices.map(({ label, value }) =>
      h(
        Accordion,
        { key: value },
        h(AccordionSummary, { expandIcon: '⌄' }, label),
        h(AccordionDetails, null, '打开后显示' + label + '的详情。'),
      ),
    ),
  progress: (value) =>
    h(LinearProgress, {
      variant: 'determinate',
      value,
      'aria-label': '演示任务进度',
    }),
  pagination: (value, change) =>
    h(Pagination, {
      count: 5,
      page: value,
      onChange: (_, page) => change(page),
      size: 'small',
    }),
  avatar: () =>
    row(
      h(Avatar, { sx: { bgcolor: 'primary.main' } }, 'WK'),
      h(Avatar, { variant: 'rounded' }, 'API'),
    ),
  badge: () =>
    h(
      Badge,
      { badgeContent: 3, color: 'error' },
      h(Button, { variant: 'outlined' }, '待处理'),
    ),
  chip: () =>
    row(
      h(Chip, { label: '成功', color: 'success' }),
      h(Chip, { label: '待确认', color: 'warning', variant: 'outlined' }),
    ),
  card: () =>
    h(
      Card,
      { variant: 'outlined' },
      h(
        CardContent,
        null,
        h('strong', null, '任务摘要'),
        h('div', null, '今天成功执行 12 次。'),
      ),
    ),
  divider: () =>
    h(
      'div',
      null,
      status('基本信息'),
      h(Divider, null, '下一节'),
      status('运行记录'),
    ),
  alert: () =>
    h(Alert, { severity: 'success' }, '同步已完成。已更新 12 条记录。'),
  skeleton: () =>
    row(
      h(Skeleton, { variant: 'circular', width: 48, height: 48 }),
      h(Skeleton, { width: 180 }),
    ),
};

export const sampleLoaders = {
  'react-number-field/': () => import('./MuiNumberField.jsx'),
};
export const available = Object.keys(demos);
export const mount = (target, kind, OfficialSample) =>
  mountReact(target, kind, demos, provider, OfficialSample);
