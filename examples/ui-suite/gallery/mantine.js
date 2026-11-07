import '@mantine/core/styles.css';
import { createElement as h } from 'react';
import {
  Autocomplete,
  ButtonGroup,
  ColorPicker,
  ColorInput,
  FileInput,
  Input,
  NativeSelect,
  TagsInput,
  JsonInput,
  Kbd,
  MultiSelect,
  PasswordInput,
  PinInput,
  RangeSlider,
  SegmentedControl,
  Stepper,
  Accordion,
  Alert,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  Divider,
  Drawer,
  Modal,
  Popover,
  Timeline,
  Tree,
  EmptyState,
  Loader,
  MantineProvider,
  NumberInput,
  Pagination,
  Progress,
  Radio,
  Tooltip,
  Rating,
  Select,
  Skeleton,
  Slider,
  Switch,
  Tabs,
  Table,
  Textarea,
  TextInput,
} from '@mantine/core';
import { choices, tableColumns, tableRows } from './examples.js';
import { mountReact, row, status } from './react-mount.js';

const provider = ({ children }) =>
  h(MantineProvider, { forceColorScheme: 'light' }, children);
const details = '该任务每 30 分钟运行一次。';
const demos = {
  inputBase: (value, onChange) =>
    h(Input, {
      value,
      'aria-label': '名称',
      placeholder: '输入名称',
      onChange: (event) => onChange(event.currentTarget.value),
    }),
  nativeSelect: () => h(NativeSelect, { label: '选择任务', data: choices }),
  inputTags: () =>
    h(TagsInput, {
      label: '标签',
      placeholder: '输入标签后按回车',
      defaultValue: ['Vue'],
    }),
  colorInput: () =>
    h(ColorInput, { label: '选择颜色', defaultValue: '#315bd6' }),
  table: () =>
    h(Table, {
      data: {
        head: tableColumns.map(({ label }) => label),
        body: tableRows.map((item) => tableColumns.map(({ key }) => item[key])),
      },
    }),
  fileInput: (value, onChange) =>
    h(FileInput, {
      value,
      onChange,
      label: '选择文件',
      placeholder: '选择一个文件',
      clearable: true,
    }),
  range: (value, change) =>
    h(RangeSlider, {
      value,
      onChange: change,
      min: 0,
      max: 100,
      thumbFromLabel: '最小值',
      thumbToLabel: '最大值',
      marks: [
        { value: 20, label: '20' },
        { value: 65, label: '65' },
      ],
      mb: 'lg',
    }),
  autocomplete: (value, change) =>
    h(Autocomplete, {
      label: '搜索任务',
      value,
      onChange: change,
      data: choices.map(({ label }) => label),
    }),
  multiSelect: (value, change) =>
    h(MultiSelect, {
      label: '选择多个任务',
      value,
      onChange: change,
      data: choices,
      searchable: true,
    }),
  segmented: (value, change) =>
    h(SegmentedControl, {
      value,
      onChange: change,
      data: choices,
      'aria-label': '切换任务',
    }),
  inputOtp: (value, change) =>
    h(PinInput, {
      value,
      onChange: change,
      length: 4,
      type: 'number',
      'aria-label': '演示验证码',
    }),
  password: (value, change) =>
    h(PasswordInput, {
      label: '示例密码',
      value,
      onChange: (event) => change(event.target.value),
      placeholder: '输入示例内容',
    }),
  color: (value, change) =>
    row(
      h(ColorPicker, {
        format: 'hex',
        value,
        onChange: change,
        'aria-label': '选择颜色',
      }),
      status(value),
    ),
  jsonInput: () =>
    h(JsonInput, {
      label: '任务配置',
      defaultValue: '{ "enabled": true }',
      formatOnBlur: true,
      validationError: 'JSON 格式有误',
      autosize: true,
      minRows: 3,
    }),
  kbd: () => row(h(Kbd, null, 'Ctrl'), h('span', null, '+'), h(Kbd, null, 'K')),
  stepper: (value, change) => [
    h(
      Stepper,
      {
        key: 'steps',
        active: value - 1,
        orientation: 'vertical',
        onStepClick: (step) => change(step + 1),
      },
      choices.map((item) =>
        h(
          Stepper.Step,
          { key: item.value, label: item.label },
          '当前任务：' + item.label,
        ),
      ),
    ),
    h(
      Button,
      { key: 'next', onClick: () => change((value % choices.length) + 1) },
      '下一步',
    ),
  ],
  buttonGroup: (value, change) =>
    h(
      ButtonGroup,
      null,
      choices.map((item) =>
        h(
          Button,
          {
            key: item.value,
            variant: value === item.value ? 'filled' : 'default',
            onClick: () => change(item.value),
          },
          item.label,
        ),
      ),
    ),

  dialog: (open, change) =>
    row(
      h(
        Button,
        { variant: 'outline', onClick: () => change(!open) },
        '打开弹窗',
      ),
      h(
        Dialog,
        {
          opened: open,
          onClose: () => change(false),
          withCloseButton: true,
          position: { top: 84, right: 20 },
        },
        details,
      ),
    ),
  modal: (open, change) =>
    row(
      h(
        Button,
        { variant: 'outline', onClick: () => change(true) },
        '打开弹窗',
      ),
      h(
        Modal,
        { opened: open, onClose: () => change(false), title: '任务详情' },
        details,
      ),
    ),
  drawer: (open, change) =>
    row(
      h(
        Button,
        { variant: 'outline', onClick: () => change(true) },
        '打开抽屉',
      ),
      h(
        Drawer,
        {
          opened: open,
          onClose: () => change(false),
          position: 'right',
          title: '任务详情',
        },
        details,
      ),
    ),
  popover: () =>
    h(
      Popover,
      { position: 'bottom-start', withArrow: true },
      h(Popover.Target, null, h(Button, { variant: 'outline' }, '打开面板')),
      h(Popover.Dropdown, null, details),
    ),
  tree: () =>
    h(Tree, {
      data: [{ label: '运维任务', value: 'operations', children: choices }],
    }),
  timeline: () =>
    h(
      Timeline,
      { active: 2 },
      ['开始同步', '处理记录', '同步完成'].map((title, index) =>
        h(Timeline.Item, { key: title, title }, '09:0' + index),
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
      { label: '该任务每 30 分钟运行一次。' },
      h(Button, { variant: 'outline' }, '查看提示'),
    ),
  button: (value, change) =>
    row(
      h(Button, { onClick: () => change(value + 1) }, '执行'),
      h(Button, { disabled: true }, '禁用'),
      status('已点击 ' + value + ' 次'),
    ),
  input: (value, change) =>
    h(TextInput, {
      label: '任务名称',
      value,
      onChange: (e) => change(e.target.value),
    }),
  textarea: (value, change) =>
    h(Textarea, {
      label: '备注',
      value,
      onChange: (e) => change(e.target.value),
      rows: 3,
    }),
  number: (value, change) =>
    h(NumberInput, {
      label: '重试次数',
      value,
      onChange: change,
      min: 0,
      max: 100,
    }),
  checkbox: (value, change) =>
    h(Checkbox, {
      label: '包含失败记录',
      checked: value,
      onChange: (e) => change(e.target.checked),
    }),
  radio: (value, change) =>
    h(
      Radio.Group,
      { value, onChange: change, label: '任务类型' },
      row(...choices.map((item) => h(Radio, { key: item.value, ...item }))),
    ),
  switch: (value, change) =>
    h(Switch, {
      label: '自动刷新',
      checked: value,
      onChange: (e) => change(e.target.checked),
    }),
  slider: (value, change) =>
    h(Slider, { value, onChange: change, step: 5, 'aria-label': '阈值' }),
  rating: (value, change) =>
    h(Rating, { value, onChange: change, fractions: 2 }),
  select: (value, change) =>
    h(Select, {
      value,
      onChange: change,
      label: '选择任务',
      data: choices,
      searchable: true,
      clearable: true,
    }),
  tabs: (value, change) =>
    h(
      Tabs,
      { value, onChange: change },
      h(
        Tabs.List,
        null,
        choices.map(({ label, value }) =>
          h(Tabs.Tab, { key: value, value }, label),
        ),
      ),
      choices.map(({ label, value }) =>
        h(
          Tabs.Panel,
          { key: value, value, pt: 'md' },
          '查看' + label + '的记录。',
        ),
      ),
    ),
  accordion: () =>
    h(
      Accordion,
      null,
      choices.map(({ label, value }) =>
        h(
          Accordion.Item,
          { key: value, value },
          h(Accordion.Control, null, label),
          h(Accordion.Panel, null, '打开后显示' + label + '的详情。'),
        ),
      ),
    ),
  progress: (value) =>
    h(Progress, { value, size: 'lg', 'aria-label': '演示任务进度' }),
  pagination: (value, change) =>
    h(Pagination, { total: 5, value, onChange: change, size: 'sm' }),
  avatar: () =>
    row(
      h(Avatar, { color: 'blue' }, 'WK'),
      h(Avatar, { radius: 'sm', color: 'grape' }, 'API'),
    ),
  badge: () =>
    row(
      h(Badge, { color: 'green' }, '成功'),
      h(Badge, { color: 'orange', variant: 'outline' }, '待确认'),
    ),
  chip: () => h(Chip, { defaultChecked: true }, '只看启用任务'),
  card: () =>
    h(
      Card,
      { withBorder: true },
      h('strong', null, '任务摘要'),
      h('div', null, '今天成功执行 12 次。'),
    ),
  divider: () =>
    h(
      'div',
      null,
      status('基本信息'),
      h(Divider, { label: '下一节', my: 'sm' }),
      status('运行记录'),
    ),
  alert: () =>
    h(Alert, { color: 'green', title: '同步已完成' }, '已更新 12 条记录。'),
  skeleton: () =>
    row(
      h(Skeleton, { circle: true, height: 48 }),
      h(Skeleton, { width: 180, height: 16 }),
    ),
  spinner: () => row(h(Loader, { size: 'sm' }), status('正在读取记录')),
  empty: () => h(EmptyState, null, h(EmptyState.Title, null, '暂无运行记录')),
};

export const available = Object.keys(demos);
export const mount = (target, kind, OfficialSample) =>
  mountReact(target, kind, demos, provider, OfficialSample);
