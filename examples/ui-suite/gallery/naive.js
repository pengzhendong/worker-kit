import { h } from 'vue';
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

import * as N from 'naive-ui';
const wrap = (child, official) =>
  sample(
    N.NConfigProvider,
    { locale: N.zhCN, dateLocale: N.dateZhCN },
    official
      ? sample(
          N.NLoadingBarProvider,
          {},
          sample(
            N.NNotificationProvider,
            {},
            sample(N.NMessageProvider, {}, child),
          ),
        )
      : child,
  );
const demos = {
  table: () =>
    sample(N.NTable, {}, [
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
  dialog: () =>
    sample(N.NDialog, { title: '任务详情', content: details, closable: false }),
  dataTable: () =>
    sample(N.NDataTable, {
      columns: tableColumns.map(({ key, label }) => ({ key, title: label })),
      data: tableRows,
    }),
  fileUpload: () =>
    sample(
      N.NUpload,
      { defaultUpload: false },
      sample(N.NButton, {}, '选择文件'),
    ),
  transfer: (state) =>
    sample(N.NTransfer, {
      ...update('value', state),
      options: choices,
      sourceTitle: '待分配',
      targetTitle: '已分配',
    }),
  color: (state) =>
    row(
      sample(N.NColorPicker, {
        ...update('value', state),
        modes: ['hex'],
        showAlpha: false,
      }),
      text(state.value || '未选择'),
    ),
  autocomplete: (state) =>
    sample(N.NAutoComplete, {
      ...update('value', state),
      placeholder: '输入任务名称',
      options: choices
        .map(({ label }) => label)
        .filter((label) => label.includes(state.value || '')),
    }),
  cascader: (state) =>
    sample(N.NCascader, {
      ...update('value', state),
      clearable: true,
      placeholder: '选择任务',
      options: [{ label: '运维任务', value: 'jobs', children: choices }],
    }),
  treeSelect: (state) =>
    sample(N.NTreeSelect, {
      ...update('value', state),
      clearable: true,
      placeholder: '选择树节点',
      options: branches,
    }),
  inputOtp: (state) =>
    sample(N.NInputOtp, {
      ...update('value', state),
      value: Array.isArray(state.value) ? state.value : [],
      length: 4,
    }),
  stepper: (state) => [
    sample(
      N.NSteps,
      { current: state.value },
      choices.map(({ label }) => sample(N.NStep, { title: label })),
    ),
    sample(
      N.NButton,
      {
        onClick: () => {
          state.value = (state.value % choices.length) + 1;
        },
      },
      '下一步',
    ),
  ],
  statistic: () => sample(N.NStatistic, { label: '成功运行', value: 1284 }),
  descriptions: () =>
    sample(N.NDescriptions, { title: '任务摘要', column: 1, bordered: true }, [
      sample(N.NDescriptionsItem, { label: '任务' }, '数据同步'),
      sample(N.NDescriptionsItem, { label: '状态' }, '运行正常'),
    ]),
  carousel: () =>
    sample(
      N.NCarousel,
      { style: { height: '160px' }, showArrow: true },
      choices.map(({ label }) =>
        h('div', { class: 'gallery-slide', key: label }, label),
      ),
    ),
  calendar: (state) =>
    sample(N.NCalendar, {
      ...update('value', state),
      value: state.value || Date.now(),
    }),
  checkboxGroup: (state) =>
    sample(
      N.NCheckboxGroup,
      update('value', state),
      row(
        ...choices.map(({ value, label }) =>
          sample(N.NCheckbox, { value }, label),
        ),
      ),
    ),
  buttonGroup: (state) =>
    sample(
      N.NButtonGroup,
      {},
      choices.map(({ label, value }) =>
        sample(
          N.NButton,
          {
            type: state.value === value ? 'primary' : 'default',
            onClick: () => {
              state.value = value;
            },
          },
          label,
        ),
      ),
    ),

  modal: (open) => [
    sample(
      N.NButton,
      {
        onClick: () => {
          open.value = true;
        },
      },
      '打开弹窗',
    ),
    sample(
      N.NModal,
      {
        ...update('show', open),
        preset: 'card',
        title: '任务详情',
        style: { width: 'min(420px, 90vw)' },
      },
      details,
    ),
  ],
  drawer: (open) => [
    sample(
      N.NButton,
      {
        onClick: () => {
          open.value = true;
        },
      },
      '打开抽屉',
    ),
    sample(
      N.NDrawer,
      { ...update('show', open), width: 'min(360px, 90vw)' },
      sample(N.NDrawerContent, { title: '任务详情', closable: true }, details),
    ),
  ],
  popover: () =>
    h(
      N.NPopover,
      { trigger: 'click' },
      {
        trigger: () => sample(N.NButton, {}, '打开面板'),
        default: () => details,
      },
    ),
  tree: () => sample(N.NTree, { data: branches, checkable: true }),
  timeline: () =>
    sample(
      N.NTimeline,
      {},
      events.map((title, index) =>
        sample(N.NTimelineItem, {
          title,
          time: '09:0' + index,
          type: 'success',
        }),
      ),
    ),
  breadcrumb: () =>
    sample(
      N.NBreadcrumb,
      {},
      ['工作空间', '任务', '详情'].map((label) =>
        sample(N.NBreadcrumbItem, {}, label),
      ),
    ),
  tooltip: () =>
    h(
      N.NTooltip,
      {},
      {
        trigger: () => sample(N.NButton, {}, '查看提示'),
        default: () => '该任务每 30 分钟运行一次。',
      },
    ),
  button: (count) =>
    row(
      sample(
        N.NButton,
        { type: 'primary', onClick: () => count.value++ },
        '执行',
      ),
      sample(N.NButton, { disabled: true }, '禁用'),
      text('已点击 ' + count.value + ' 次'),
    ),
  input: (value) =>
    sample(N.NInput, {
      ...update('value', value),
      placeholder: '输入任务名称',
      clearable: true,
    }),
  textarea: (value) =>
    sample(N.NInput, {
      ...update('value', value),
      type: 'textarea',
      maxlength: 100,
      showCount: true,
      placeholder: '输入备注',
    }),
  number: (value) =>
    sample(N.NInputNumber, {
      ...update('value', value),
      min: 0,
      max: 100,
      placeholder: '重试次数',
    }),
  checkbox: (value) =>
    sample(N.NCheckbox, update('checked', value), '包含失败记录'),
  radio: (value) =>
    sample(
      N.NRadioGroup,
      update('value', value),
      row(
        ...choices.map(({ label, value }) =>
          sample(N.NRadio, { value }, label),
        ),
      ),
    ),
  switch: (value) =>
    row(
      sample(N.NSwitch, {
        ...update('value', value),
        'aria-label': '自动刷新',
      }),
      text(value.value ? '自动刷新已开启' : '自动刷新已关闭'),
    ),
  slider: (value) => sample(N.NSlider, { ...update('value', value), step: 5 }),
  rating: (value) =>
    sample(N.NRate, { ...update('value', value), allowHalf: true }),
  select: (value) =>
    sample(N.NSelect, {
      ...update('value', value),
      options: choices,
      placeholder: '选择任务',
      clearable: true,
    }),
  date: (value) =>
    sample(N.NDatePicker, {
      ...update('value', value),
      type: 'date',
      clearable: true,
    }),
  tabs: (value) =>
    sample(
      N.NTabs,
      update('value', value),
      choices.map(({ label, value }) =>
        sample(
          N.NTabPane,
          { tab: label, name: value },
          '查看' + label + '的记录。',
        ),
      ),
    ),
  accordion: () =>
    sample(
      N.NCollapse,
      { accordion: true },
      choices.map(({ label, value }) =>
        sample(
          N.NCollapseItem,
          { title: label, name: value },
          '打开后显示' + label + '的详情。',
        ),
      ),
    ),
  progress: (value) =>
    sample(N.NProgress, {
      type: 'line',
      percentage: value.value,
      status: value.value === 100 ? 'success' : 'info',
    }),
  pagination: (value) =>
    sample(N.NPagination, { ...update('page', value), pageCount: 5 }),
  avatar: () =>
    row(
      sample(N.NAvatar, { round: true }, 'WK'),
      sample(N.NAvatar, { size: 'large' }, 'API'),
    ),
  badge: () => sample(N.NBadge, { value: 3 }, sample(N.NButton, {}, '待处理')),
  chip: () =>
    row(
      sample(N.NTag, { type: 'success' }, '成功'),
      sample(N.NTag, { type: 'warning', round: true }, '待确认'),
    ),
  card: () =>
    sample(
      N.NCard,
      { title: '任务摘要', hoverable: true },
      '今天成功执行 12 次。',
    ),
  divider: () => [
    text('基本信息'),
    sample(N.NDivider, {}, '下一节'),
    text('运行记录'),
  ],
  alert: () =>
    sample(
      N.NAlert,
      { title: '同步已完成', type: 'success', closable: true },
      '已更新 12 条记录。',
    ),
  skeleton: () => sample(N.NSkeleton, { text: true, repeat: 3 }),
  spinner: () =>
    sample(N.NSpin, { size: 'medium', description: '正在读取记录' }),
  empty: () => sample(N.NEmpty, { description: '暂无运行记录' }),
};

export const available = Object.keys(demos);
export const mount = mountVue(demos, { wrap });
