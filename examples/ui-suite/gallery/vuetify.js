import { h } from 'vue';
import { choices, tableColumns, tableRows } from './examples.js';
import {
  mountVue,
  names,
  row,
  text,
  sample,
  update,
  branches,
  events,
  details,
} from './vue-mount.js';

import { createVuetify } from 'vuetify';
import * as V from 'vuetify/components';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import 'vuetify/styles';
const configure = (app) =>
  app.use(
    createVuetify({ icons: { defaultSet: 'mdi', aliases, sets: { mdi } } }),
  );
const dense = { variant: 'outlined', density: 'compact', hideDetails: true };
const demos = {
  colorInput: (state) =>
    sample(V.VColorInput, {
      ...dense,
      ...update('modelValue', state),
      label: '选择颜色',
    }),
  table: () =>
    sample(V.VTable, { density: 'compact' }, [
      h(
        'thead',
        h(
          'tr',
          tableColumns.map(({ key, label }) => h('th', { key }, label)),
        ),
      ),
      h(
        'tbody',
        tableRows.map((item) =>
          h(
            'tr',
            { key: item.name },
            tableColumns.map(({ key }) => h('td', { key }, item[key])),
          ),
        ),
      ),
    ]),
  dataTable: () =>
    sample(V.VDataTable, {
      headers: tableColumns.map(({ key, label }) => ({ key, title: label })),
      items: tableRows,
      itemValue: 'name',
      hideDefaultFooter: true,
    }),
  fileInput: (state) =>
    sample(V.VFileInput, {
      ...update('modelValue', state),
      label: '选择文件',
      clearable: true,
    }),
  fileUpload: (state) =>
    sample(V.VFileUpload, {
      ...update('modelValue', state),
      title: '选择或拖入文件',
      clearable: true,
    }),
  snackbar: (state) => [
    sample(
      V.VBtn,
      {
        color: 'primary',
        onClick: () => {
          state.value = true;
        },
      },
      '显示提示',
    ),
    h(
      V.VSnackbar,
      { ...update('modelValue', state), timeout: 4000 },
      {
        default: () => '任务已更新',
        actions: () =>
          sample(
            V.VBtn,
            {
              onClick: () => {
                state.value = false;
              },
            },
            '关闭',
          ),
      },
    ),
  ],
  autocomplete: (state) =>
    sample(V.VAutocomplete, {
      ...dense,
      ...update('modelValue', state),
      items: choices,
      itemTitle: 'label',
      label: '搜索任务',
      clearable: true,
    }),
  combobox: (state) =>
    sample(V.VCombobox, {
      ...dense,
      ...update('modelValue', state),
      items: choices.map(({ label }) => label),
      label: '选择或输入任务',
      clearable: true,
    }),
  color: (state) =>
    sample(V.VColorPicker, {
      ...update('modelValue', state),
      mode: 'hex',
      hideModeSwitch: true,
      width: '100%',
      maxWidth: 320,
    }),
  range: (state) =>
    sample(V.VRangeSlider, {
      ...update('modelValue', state),
      min: 0,
      max: 100,
      thumbLabel: true,
      hideDetails: true,
    }),
  inputOtp: (state) =>
    sample(V.VOtpInput, { ...update('modelValue', state), length: 4 }),
  stepper: (state) =>
    sample(V.VStepper, {
      ...update('modelValue', state),
      items: choices.map(({ label }, index) => ({
        title: label,
        value: index + 1,
      })),
      editable: true,
    }),
  carousel: (state) =>
    sample(
      V.VCarousel,
      {
        ...update('modelValue', state),
        modelValue: state.value || choices[0].value,
        height: 170,
        hideDelimiterBackground: true,
      },
      choices.map(({ label, value }) =>
        sample(
          V.VCarouselItem,
          { value },
          h('div', { class: 'gallery-slide' }, label),
        ),
      ),
    ),
  toolbar: (state) =>
    sample(V.VToolbar, { density: 'compact' }, [
      sample(V.VToolbarTitle, {}, '任务工具栏'),
      sample(
        V.VBtn,
        {
          onClick: () => {
            state.value = '已刷新';
          },
        },
        '刷新',
      ),
      text(state.value),
    ]),
  buttonGroup: (state) =>
    sample(
      V.VBtnGroup,
      { variant: 'outlined' },
      choices.map(({ label, value }) =>
        sample(
          V.VBtn,
          {
            active: state.value === value,
            onClick: () => {
              state.value = value;
            },
          },
          label,
        ),
      ),
    ),

  dialog: (open) => [
    sample(
      V.VBtn,
      {
        variant: 'outlined',
        onClick: () => {
          open.value = true;
        },
      },
      '打开弹窗',
    ),
    sample(
      V.VDialog,
      { ...update('modelValue', open), maxWidth: 420 },
      sample(V.VCard, { title: '任务详情', text: details }),
    ),
  ],
  tree: () =>
    sample(V.VTreeview, {
      items: branches.map((branch) => ({
        title: branch.label,
        value: branch.key,
        children: branch.children.map((child) => ({
          title: child.label,
          value: child.key,
        })),
      })),
      selectable: true,
    }),
  timeline: () =>
    sample(
      V.VTimeline,
      { side: 'end', density: 'compact' },
      events.map((label, index) =>
        sample(
          V.VTimelineItem,
          { dotColor: 'success', size: 'small' },
          '09:0' + index + ' · ' + label,
        ),
      ),
    ),
  breadcrumb: () =>
    sample(V.VBreadcrumbs, { items: ['工作空间', '任务', '详情'] }),
  tooltip: () =>
    h(
      V.VTooltip,
      { text: '该任务每 30 分钟运行一次。', location: 'top' },
      {
        activator: ({ props }) =>
          sample(V.VBtn, { ...props, variant: 'outlined' }, '查看提示'),
      },
    ),
  button: (count) =>
    row(
      sample(
        V.VBtn,
        { color: 'primary', onClick: () => count.value++ },
        '执行',
      ),
      sample(V.VBtn, { disabled: true }, '禁用'),
      text('已点击 ' + count.value + ' 次'),
    ),
  input: (value) =>
    sample(V.VTextField, {
      ...dense,
      ...update('modelValue', value),
      label: '任务名称',
      clearable: true,
    }),
  textarea: (value) =>
    sample(V.VTextarea, {
      ...dense,
      ...update('modelValue', value),
      label: '备注',
      rows: 2,
    }),
  number: (value) =>
    sample(V.VNumberInput, {
      ...dense,
      ...update('modelValue', value),
      label: '重试次数',
      min: 0,
      max: 100,
    }),
  checkbox: (value) =>
    sample(V.VCheckbox, {
      ...update('modelValue', value),
      label: '包含失败记录',
      hideDetails: true,
    }),
  radio: (value) =>
    sample(
      V.VRadioGroup,
      { ...update('modelValue', value), inline: true, hideDetails: true },
      choices.map((item) => sample(V.VRadio, item)),
    ),
  switch: (value) =>
    sample(V.VSwitch, {
      ...update('modelValue', value),
      label: '自动刷新',
      hideDetails: true,
      color: 'primary',
    }),
  slider: (value) =>
    sample(V.VSlider, {
      ...update('modelValue', value),
      step: 5,
      thumbLabel: true,
      'aria-label': '阈值',
      hideDetails: true,
    }),
  rating: (value) =>
    sample(V.VRating, {
      ...update('modelValue', value),
      halfIncrements: true,
      activeColor: 'amber-darken-2',
    }),
  select: (value) =>
    sample(V.VSelect, {
      ...dense,
      ...update('modelValue', value),
      items: choices,
      itemTitle: 'label',
      label: '选择任务',
      clearable: true,
    }),
  date: (value) =>
    sample(V.VDatePicker, {
      ...update('modelValue', value),
      width: '100%',
      maxWidth: '340px',
    }),
  tabs: (value) => [
    sample(
      V.VTabs,
      update('modelValue', value),
      choices.map(({ label, value }) => sample(V.VTab, { value }, label)),
    ),
    text('查看' + names[value.value] + '的记录。'),
  ],
  accordion: () =>
    sample(
      V.VExpansionPanels,
      {},
      choices.map(({ label }) =>
        sample(V.VExpansionPanel, {
          title: label,
          text: '打开后显示' + label + '的详情。',
        }),
      ),
    ),
  progress: (value) =>
    sample(V.VProgressLinear, {
      modelValue: value.value,
      color: 'primary',
      height: 10,
      rounded: true,
    }),
  pagination: (value) =>
    sample(V.VPagination, {
      ...update('modelValue', value),
      length: 5,
      density: 'compact',
    }),
  avatar: () =>
    row(
      sample(V.VAvatar, { color: 'primary' }, 'WK'),
      sample(V.VAvatar, { color: 'secondary', rounded: 0 }, 'API'),
    ),
  badge: () =>
    sample(
      V.VBadge,
      { content: 3, color: 'error' },
      sample(V.VBtn, { variant: 'outlined' }, '待处理'),
    ),
  chip: () =>
    row(
      sample(V.VChip, { color: 'success' }, '成功'),
      sample(V.VChip, { color: 'warning', variant: 'outlined' }, '待确认'),
    ),
  card: () =>
    sample(V.VCard, {
      title: '任务摘要',
      text: '今天成功执行 12 次。',
      variant: 'tonal',
    }),
  divider: () => [text('基本信息'), sample(V.VDivider), text('运行记录')],
  alert: () =>
    sample(V.VAlert, {
      type: 'success',
      title: '同步已完成',
      text: '已更新 12 条记录。',
      closable: true,
    }),
  skeleton: () =>
    sample(V.VSkeletonLoader, { type: 'list-item-avatar-two-line' }),
  spinner: () =>
    row(
      sample(V.VProgressCircular, { indeterminate: true, color: 'primary' }),
      text('正在读取记录'),
    ),
  empty: () => sample(V.VEmptyState, { title: '暂无运行记录' }),
};

export const available = Object.keys(demos);
export const mount = mountVue(demos, { configure });
