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

import * as E from 'element-plus';
import 'element-plus/dist/index.css';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
const wrap = (child) => sample(E.ElConfigProvider, { locale: zhCn }, child);
const demos = {
  inputTags: (state) =>
    sample(E.ElInputTag, {
      ...update('modelValue', state),
      placeholder: '输入标签后按回车',
    }),
  form: (state) =>
    sample(
      E.ElForm,
      {
        labelPosition: 'top',
        model: { name: state.value },
        onSubmit: (event) => event.preventDefault(),
      },
      sample(
        E.ElFormItem,
        { label: '名称', prop: 'name' },
        sample(E.ElInput, {
          ...update('modelValue', state),
          placeholder: '输入名称',
        }),
      ),
    ),
  table: () =>
    sample(
      E.ElTable,
      { data: tableRows },
      tableColumns.map(({ key, label }) =>
        sample(E.ElTableColumn, { key, prop: key, label }),
      ),
    ),
  fileUpload: () =>
    sample(
      E.ElUpload,
      { autoUpload: false },
      sample(E.ElButton, { type: 'primary' }, '选择文件'),
    ),
  color: (state) =>
    row(
      sample(E.ElColorPicker, {
        ...update('modelValue', state),
        ariaLabel: '选择颜色',
      }),
      text(state.value || '未选择'),
    ),
  autocomplete: (state) =>
    sample(E.ElAutocomplete, {
      ...update('modelValue', state),
      placeholder: '输入任务名称',
      fetchSuggestions: (query, done) =>
        done(
          choices
            .filter(({ label }) => label.includes(query))
            .map(({ label }) => ({ value: label })),
        ),
    }),
  cascader: (state) =>
    sample(E.ElCascader, {
      ...update('modelValue', state),
      clearable: true,
      placeholder: '选择任务',
      options: [{ label: '运维任务', value: 'jobs', children: choices }],
    }),
  treeSelect: (state) =>
    sample(E.ElTreeSelect, {
      ...update('modelValue', state),
      clearable: true,
      placeholder: '选择树节点',
      data: [{ label: '运维任务', value: 'jobs', children: choices }],
    }),
  transfer: (state) =>
    sample(E.ElTransfer, {
      ...update('modelValue', state),
      data: choices.map(({ label, value: key }) => ({ label, key })),
      titles: ['待分配', '已分配'],
    }),
  segmented: (state) =>
    sample(E.ElSegmented, { ...update('modelValue', state), options: choices }),
  inputOtp: (state) =>
    sample(E.ElInputOtp, {
      ...update('modelValue', state),
      length: 4,
      ariaLabel: '演示验证码',
    }),
  statistic: () =>
    sample(E.ElStatistic, {
      title: '成功运行',
      value: 1284,
      groupSeparator: ',',
    }),
  descriptions: () =>
    sample(E.ElDescriptions, { title: '任务摘要', column: 1, border: true }, [
      sample(E.ElDescriptionsItem, { label: '任务' }, '数据同步'),
      sample(E.ElDescriptionsItem, { label: '状态' }, '运行正常'),
    ]),
  carousel: () =>
    sample(
      E.ElCarousel,
      { height: '160px', autoplay: false },
      choices.map(({ label, value }) =>
        sample(
          E.ElCarouselItem,
          { name: value },
          h('div', { class: 'gallery-slide' }, label),
        ),
      ),
    ),
  calendar: () => sample(E.ElCalendar, { class: 'gallery-calendar' }),
  stepper: (state) => [
    sample(
      E.ElSteps,
      { active: state.value - 1, finishStatus: 'success', simple: true },
      choices.map(({ label }) => sample(E.ElStep, { title: label })),
    ),
    sample(
      E.ElButton,
      {
        onClick: () => {
          state.value = (state.value % choices.length) + 1;
        },
      },
      '下一步',
    ),
  ],
  buttonGroup: (state) =>
    sample(
      E.ElButtonGroup,
      {},
      choices.map(({ label, value }) =>
        sample(
          E.ElButton,
          {
            type: state.value === value ? 'primary' : undefined,
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
      E.ElButton,
      {
        onClick: () => {
          open.value = true;
        },
      },
      '打开弹窗',
    ),
    sample(
      E.ElDialog,
      {
        ...update('modelValue', open),
        title: '任务详情',
        width: 'min(420px, 90vw)',
      },
      details,
    ),
  ],
  drawer: (open) => [
    sample(
      E.ElButton,
      {
        onClick: () => {
          open.value = true;
        },
      },
      '打开抽屉',
    ),
    sample(
      E.ElDrawer,
      {
        ...update('modelValue', open),
        title: '任务详情',
        size: 'min(360px, 90vw)',
      },
      details,
    ),
  ],
  popover: () =>
    h(
      E.ElPopover,
      { trigger: 'click', width: 220 },
      {
        reference: () => sample(E.ElButton, {}, '打开面板'),
        default: () => details,
      },
    ),
  tree: () =>
    sample(E.ElTree, { data: branches, nodeKey: 'key', showCheckbox: true }),
  timeline: () =>
    sample(
      E.ElTimeline,
      {},
      events.map((label, index) =>
        sample(
          E.ElTimelineItem,
          { timestamp: '09:0' + index, type: 'success' },
          label,
        ),
      ),
    ),
  breadcrumb: () =>
    sample(
      E.ElBreadcrumb,
      { separator: '/' },
      ['工作空间', '任务', '详情'].map((label) =>
        sample(E.ElBreadcrumbItem, {}, label),
      ),
    ),
  tooltip: () =>
    sample(
      E.ElTooltip,
      { content: '该任务每 30 分钟运行一次。', placement: 'top' },
      sample(E.ElButton, {}, '查看提示'),
    ),
  button: (count) =>
    row(
      sample(
        E.ElButton,
        { type: 'primary', onClick: () => count.value++ },
        '执行',
      ),
      sample(E.ElButton, { disabled: true }, '禁用'),
      text('已点击 ' + count.value + ' 次'),
    ),
  input: (value) =>
    sample(E.ElInput, {
      ...update('modelValue', value),
      placeholder: '输入任务名称',
      clearable: true,
    }),
  textarea: (value) =>
    sample(E.ElInput, {
      ...update('modelValue', value),
      type: 'textarea',
      maxlength: 100,
      showWordLimit: true,
      placeholder: '输入备注',
    }),
  number: (value) =>
    sample(E.ElInputNumber, {
      ...update('modelValue', value),
      min: 0,
      max: 100,
      'aria-label': '重试次数',
    }),
  checkbox: (value) =>
    sample(E.ElCheckbox, update('modelValue', value), '包含失败记录'),
  radio: (value) =>
    sample(
      E.ElRadioGroup,
      update('modelValue', value),
      choices.map(({ label, value }) => sample(E.ElRadio, { value }, label)),
    ),
  switch: (value) =>
    sample(E.ElSwitch, {
      ...update('modelValue', value),
      activeText: '自动刷新',
    }),
  slider: (value) =>
    sample(E.ElSlider, {
      ...update('modelValue', value),
      step: 5,
      'aria-label': '阈值',
    }),
  rating: (value) =>
    sample(E.ElRate, {
      ...update('modelValue', value),
      allowHalf: true,
      showScore: true,
    }),
  select: (value) =>
    sample(
      E.ElSelect,
      {
        ...update('modelValue', value),
        placeholder: '选择任务',
        clearable: true,
      },
      choices.map((item) => sample(E.ElOption, item)),
    ),
  date: (value) =>
    sample(E.ElDatePicker, {
      ...update('modelValue', value),
      type: 'date',
      placeholder: '选择日期',
    }),
  tabs: (value) =>
    sample(
      E.ElTabs,
      update('modelValue', value),
      choices.map(({ label, value }) =>
        sample(
          E.ElTabPane,
          { label, name: value },
          '查看' + label + '的记录。',
        ),
      ),
    ),
  accordion: () =>
    sample(
      E.ElCollapse,
      { accordion: true },
      choices.map(({ label, value }) =>
        sample(
          E.ElCollapseItem,
          { title: label, name: value },
          '打开后显示' + label + '的详情。',
        ),
      ),
    ),
  progress: (value) =>
    sample(E.ElProgress, {
      percentage: value.value,
      status: value.value === 100 ? 'success' : undefined,
    }),
  pagination: (value) =>
    sample(E.ElPagination, {
      ...update('currentPage', value),
      pageSize: 10,
      total: 50,
      layout: 'prev, pager, next',
    }),
  avatar: () =>
    row(
      sample(E.ElAvatar, {}, 'WK'),
      sample(E.ElAvatar, { shape: 'square', size: 48 }, 'API'),
    ),
  badge: () =>
    sample(E.ElBadge, { value: 3 }, sample(E.ElButton, {}, '待处理')),
  chip: () =>
    row(
      sample(E.ElTag, { type: 'success' }, '成功'),
      sample(E.ElTag, { type: 'warning', effect: 'plain' }, '待确认'),
    ),
  card: () =>
    h(
      E.ElCard,
      { shadow: 'hover' },
      { header: () => '任务摘要', default: () => '今天成功执行 12 次。' },
    ),
  divider: () => [
    text('基本信息'),
    sample(E.ElDivider, {}, '下一节'),
    text('运行记录'),
  ],
  alert: () =>
    sample(E.ElAlert, {
      title: '同步已完成',
      description: '已更新 12 条记录。',
      type: 'success',
      showIcon: true,
    }),
  skeleton: () => sample(E.ElSkeleton, { rows: 3, animated: true }),
  empty: () =>
    sample(E.ElEmpty, { description: '暂无运行记录', imageSize: 82 }),
};

export const available = Object.keys(demos);
export const mount = mountVue(demos, { wrap });
