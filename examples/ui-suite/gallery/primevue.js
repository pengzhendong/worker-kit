import { h, resolveDirective, withDirectives } from 'vue';
import 'primeicons/primeicons.css';
import { choices, tableColumns, tableRows } from './examples.js';
import {
  mountVue,
  row,
  text,
  sample,
  update,
  branches,
  events,
  details,
} from './vue-mount.js';

import Button from 'primevue/button';
import Input from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import NumberInput from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import Radio from 'primevue/radiobutton';
import Switch from 'primevue/toggleswitch';
import Slider from 'primevue/slider';
import Rating from 'primevue/rating';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Progress from 'primevue/progressbar';
import Paginator from 'primevue/paginator';
import Avatar from 'primevue/avatar';
import Badge from 'primevue/badge';
import Tag from 'primevue/tag';
import Card from 'primevue/card';
import Divider from 'primevue/divider';
import Message from 'primevue/message';
import Skeleton from 'primevue/skeleton';
import Spinner from 'primevue/progressspinner';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ConfirmDialog from 'primevue/confirmdialog';
import ConfirmPopup from 'primevue/confirmpopup';
import DialogService from 'primevue/dialogservice';
import Fluid from 'primevue/fluid';
import FocusTrap from 'primevue/focustrap';
import IftaLabel from 'primevue/iftalabel';
import KeyFilter from 'primevue/keyfilter';
import Ripple from 'primevue/ripple';
import StyleClass from 'primevue/styleclass';
import Toast from 'primevue/toast';
import ToastService from 'primevue/toastservice';
import Aura from '@primeuix/themes/aura';
import Tooltip from 'primevue/tooltip';
import Dialog from 'primevue/dialog';
import Drawer from 'primevue/drawer';
import Tree from 'primevue/tree';
import Timeline from 'primevue/timeline';
import Breadcrumb from 'primevue/breadcrumb';
const configure = (app, official) => {
  app
    .use(PrimeVue, {
      theme: { preset: Aura, options: { darkModeSelector: false } },
      ripple: official,
    })
    .directive('tooltip', Tooltip);
  if (official)
    app
      .use(ToastService)
      .use(ConfirmationService)
      .use(DialogService)
      .component('ConfirmDialog', ConfirmDialog)
      .component('ConfirmPopup', ConfirmPopup)
      .component('Fluid', Fluid)
      .component('IftaLabel', IftaLabel)
      .component('Toast', Toast)
      .directive('focustrap', FocusTrap)
      .directive('keyfilter', KeyFilter)
      .directive('ripple', Ripple)
      .directive('styleclass', StyleClass);
};

import TreeTable from 'primevue/treetable';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import FileUpload from 'primevue/fileupload';
import Carousel from 'primevue/carousel';
import AutoComplete from 'primevue/autocomplete';
import MultiSelect from 'primevue/multiselect';
import TreeSelect from 'primevue/treeselect';
import ColorPicker from 'primevue/colorpicker';
import InputOtp from 'primevue/inputotp';
import SelectButton from 'primevue/selectbutton';
import ToggleButton from 'primevue/togglebutton';
import MeterGroup from 'primevue/metergroup';
import DataView from 'primevue/dataview';
import Toolbar from 'primevue/toolbar';
import CascadeSelect from 'primevue/cascadeselect';
import Knob from 'primevue/knob';
import Password from 'primevue/password';
import Popover from 'primevue/popover';
import Stepper from 'primevue/stepper';
import StepList from 'primevue/steplist';
import Step from 'primevue/step';
import StepPanels from 'primevue/steppanels';
import StepPanel from 'primevue/steppanel';
const demos = {
  cascader: (state) =>
    sample(CascadeSelect, {
      ...update('modelValue', state),
      options: [{ label: '运维任务', children: choices }],
      optionLabel: 'label',
      optionGroupLabel: 'label',
      optionGroupChildren: ['children'],
      placeholder: '选择任务',
    }),
  knob: (state) =>
    sample(Knob, { ...update('modelValue', state), ariaLabel: '阈值' }),
  password: (state) =>
    sample(Password, {
      ...update('modelValue', state),
      toggleMask: true,
      placeholder: '输入密码',
    }),
  popover: () => {
    let panel;
    return row(
      sample(Button, { onClick: (event) => panel.toggle(event) }, '打开面板'),
      sample(
        Popover,
        {
          ref: (instance) => {
            panel = instance;
          },
        },
        details,
      ),
    );
  },
  stepper: (state) =>
    sample(Stepper, update('value', state), [
      sample(
        StepList,
        {},
        choices.map(({ label }, index) =>
          sample(Step, { key: label, value: index + 1 }, label),
        ),
      ),
      sample(
        StepPanels,
        {},
        choices.map(({ label }, index) =>
          sample(StepPanel, { key: label, value: index + 1 }, `${label}的设置`),
        ),
      ),
    ]),
  dataTable: () =>
    sample(
      DataTable,
      { value: tableRows, size: 'small' },
      tableColumns.map(({ key, label }) =>
        sample(Column, { key, field: key, header: label }),
      ),
    ),
  fileUpload: () =>
    sample(FileUpload, {
      chooseLabel: '选择文件',
      showUploadButton: false,
      showCancelButton: false,
    }),
  treeTable: () =>
    sample(
      TreeTable,
      {
        value: [
          {
            key: 'jobs',
            data: { name: '运维任务', schedule: '3 项任务' },
            children: choices.map(({ value, label }, index) => ({
              key: value,
              data: { name: label, schedule: '09:0' + index },
            })),
          },
        ],
      },
      [
        sample(Column, { field: 'name', header: '任务', expander: true }),
        sample(Column, { field: 'schedule', header: '执行计划' }),
      ],
    ),
  carousel: () =>
    h(
      Carousel,
      { value: choices, numVisible: 1, numScroll: 1 },
      {
        item: ({ data }) => h('div', { class: 'gallery-slide' }, data.label),
      },
    ),
  autocomplete: (state) =>
    sample(AutoComplete, {
      ...update('modelValue', state),
      dropdown: true,
      placeholder: '输入或选择任务',
      suggestions: choices
        .map(({ label }) => label)
        .filter((label) => label.includes(state.value || '')),
      onComplete: () => {},
    }),
  multiSelect: (state) =>
    sample(MultiSelect, {
      ...update('modelValue', state),
      options: choices,
      optionLabel: 'label',
      optionValue: 'value',
      placeholder: '选择多个任务',
      display: 'chip',
    }),
  treeSelect: (state) =>
    sample(TreeSelect, {
      ...update('modelValue', state),
      options: branches,
      placeholder: '选择树节点',
    }),
  color: (state) =>
    row(
      sample(ColorPicker, {
        ...update('modelValue', state),
        modelValue: state.value.replace(/^#/, ''),
        'aria-label': '选择颜色',
      }),
      text('#' + state.value.replace(/^#/, '')),
    ),
  inputOtp: (state) =>
    sample(InputOtp, {
      ...update('modelValue', state),
      integerOnly: true,
      length: 4,
    }),
  segmented: (state) =>
    sample(SelectButton, {
      ...update('modelValue', state),
      options: choices,
      optionLabel: 'label',
      optionValue: 'value',
    }),
  toggleButton: (state) =>
    sample(ToggleButton, {
      ...update('modelValue', state),
      onLabel: '已订阅',
      offLabel: '订阅',
    }),
  meter: () =>
    sample(MeterGroup, {
      value: [
        { label: '成功', color: '#198754', value: 65 },
        { label: '待确认', color: '#e6a23c', value: 20 },
        { label: '失败', color: '#cf414c', value: 15 },
      ],
    }),
  dataView: () =>
    h(
      DataView,
      { value: choices },
      {
        list: ({ items }) =>
          h(
            'ul',
            { class: 'gallery-example-list' },
            items.map((item) => h('li', { key: item.value }, item.label)),
          ),
      },
    ),
  toolbar: (state) =>
    h(
      Toolbar,
      {},
      {
        start: () =>
          sample(Button, {
            label: '刷新',
            onClick: () => {
              state.value = '已刷新';
            },
          }),
        end: () => text(state.value || '任务工具栏'),
      },
    ),

  dialog: (open) => [
    sample(Button, {
      label: '打开弹窗',
      outlined: true,
      onClick: () => {
        open.value = true;
      },
    }),
    sample(
      Dialog,
      {
        ...update('visible', open),
        modal: true,
        header: '任务详情',
        style: { width: 'min(420px, 90vw)' },
      },
      details,
    ),
  ],
  drawer: (open) => [
    sample(Button, {
      label: '打开抽屉',
      outlined: true,
      onClick: () => {
        open.value = true;
      },
    }),
    sample(
      Drawer,
      { ...update('visible', open), position: 'right', header: '任务详情' },
      details,
    ),
  ],
  tree: () => sample(Tree, { value: branches, selectionMode: 'checkbox' }),
  timeline: () =>
    h(
      Timeline,
      {
        value: events.map((label, index) => ({
          label,
          time: '09:0' + index,
        })),
      },
      { content: ({ item }) => item.time + ' · ' + item.label },
    ),
  breadcrumb: () =>
    sample(Breadcrumb, {
      model: ['工作空间', '任务', '详情'].map((label) => ({ label })),
    }),
  tooltip: () =>
    withDirectives(sample(Button, { label: '查看提示', outlined: true }), [
      [resolveDirective('tooltip'), '该任务每 30 分钟运行一次。'],
    ]),
  button: (count) =>
    row(
      sample(Button, { label: '执行', onClick: () => count.value++ }),
      sample(Button, { label: '禁用', disabled: true }),
      text('已点击 ' + count.value + ' 次'),
    ),
  input: (value) =>
    sample(Input, {
      ...update('modelValue', value),
      placeholder: '输入任务名称',
      fluid: true,
    }),
  textarea: (value) =>
    sample(Textarea, {
      ...update('modelValue', value),
      rows: 3,
      placeholder: '输入备注',
      fluid: true,
      autoResize: true,
    }),
  number: (value) =>
    sample(NumberInput, {
      ...update('modelValue', value),
      showButtons: true,
      min: 0,
      max: 100,
      inputId: 'demo-number',
      placeholder: '重试次数',
    }),
  checkbox: (value) =>
    row(
      sample(Checkbox, {
        ...update('modelValue', value),
        inputId: 'demo-check',
        binary: true,
      }),
      h('label', { for: 'demo-check' }, '包含失败记录'),
    ),
  radio: (state) =>
    row(
      ...choices.map(({ label, value }) =>
        row(
          sample(Radio, {
            ...update('modelValue', state),
            inputId: value,
            name: 'demo-radio',
            value,
          }),
          h('label', { for: value }, label),
        ),
      ),
    ),
  switch: (value) =>
    row(
      sample(Switch, {
        ...update('modelValue', value),
        inputId: 'demo-switch',
      }),
      h('label', { for: 'demo-switch' }, '自动刷新'),
    ),
  slider: (value) =>
    sample(Slider, {
      ...update('modelValue', value),
      step: 5,
      'aria-label': '阈值',
    }),
  rating: (value) => sample(Rating, update('modelValue', value)),
  select: (value) =>
    sample(Select, {
      ...update('modelValue', value),
      options: choices,
      optionLabel: 'label',
      optionValue: 'value',
      showClear: true,
      placeholder: '选择任务',
    }),
  date: (value) =>
    sample(DatePicker, {
      ...update('modelValue', value),
      showIcon: true,
      placeholder: '选择日期',
    }),
  tabs: (value) =>
    sample(Tabs, update('value', value), [
      sample(
        TabList,
        {},
        choices.map(({ label, value }) => sample(Tab, { value }, label)),
      ),
      sample(
        TabPanels,
        {},
        choices.map(({ label, value }) =>
          sample(TabPanel, { value }, '查看' + label + '的记录。'),
        ),
      ),
    ]),
  accordion: () =>
    sample(
      Accordion,
      {},
      choices.map(({ label, value }) =>
        sample(AccordionPanel, { value }, [
          sample(AccordionHeader, {}, label),
          sample(AccordionContent, {}, '打开后显示' + label + '的详情。'),
        ]),
      ),
    ),
  progress: (value) => sample(Progress, { value: value.value }),
  pagination: (value) =>
    sample(Paginator, {
      first: (value.value - 1) * 10,
      rows: 10,
      totalRecords: 50,
      onPage: (event) => {
        value.value = event.page + 1;
      },
    }),
  avatar: () =>
    row(
      sample(Avatar, { label: 'WK', shape: 'circle' }),
      sample(Avatar, { label: 'API', size: 'large' }),
    ),
  badge: () =>
    row(text('待处理'), sample(Badge, { value: 3, severity: 'danger' })),
  chip: () =>
    row(
      sample(Tag, { value: '成功', severity: 'success' }),
      sample(Tag, { value: '待确认', severity: 'warn' }),
    ),
  card: () =>
    h(
      Card,
      {},
      { title: () => '任务摘要', content: () => '今天成功执行 12 次。' },
    ),
  divider: () => [
    text('基本信息'),
    sample(Divider, {}, '下一节'),
    text('运行记录'),
  ],
  alert: () =>
    sample(
      Message,
      { severity: 'success', closable: true },
      '同步已完成。已更新 12 条记录。',
    ),
  skeleton: () =>
    row(
      sample(Skeleton, { shape: 'circle', size: '3rem' }),
      sample(Skeleton, { width: '12rem' }),
    ),
  spinner: () =>
    sample(Spinner, {
      'aria-label': '正在读取记录',
      style: { width: '38px', height: '38px' },
    }),
};

export const available = Object.keys(demos);
export const mount = mountVue(demos, { configure });
