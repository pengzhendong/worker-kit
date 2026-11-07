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

import * as Q from 'quasar';
import 'quasar/dist/quasar.css';
import lang from 'quasar/lang/zh-CN';
import iconSet from 'quasar/icon-set/svg-mdi-v7';
const configure = (app, official) =>
  app.use(Q.Quasar, {
    lang,
    iconSet,
    plugins: official ? { Notify: Q.Notify, Loading: Q.Loading } : undefined,
  });
const outlined = { outlined: true, dense: true };
const demos = {
  table: () =>
    sample(Q.QTable, {
      rows: tableRows,
      columns: tableColumns.map(({ key, label }) => ({
        name: key,
        field: key,
        label,
        align: 'left',
      })),
      rowKey: 'name',
      flat: true,
      bordered: true,
      hideBottom: true,
    }),
  fileInput: (state) =>
    sample(Q.QFile, {
      ...outlined,
      ...update('modelValue', state),
      label: '选择文件',
      clearable: true,
    }),
  toggle: (state) =>
    sample(Q.QToggle, { ...update('modelValue', state), label: '自动刷新' }),

  stepper: (state) =>
    sample(
      Q.QStepper,
      {
        ...update('modelValue', state),
        flat: true,
        bordered: true,
        vertical: true,
      },
      choices.map(({ label }, index) =>
        sample(
          Q.QStep,
          {
            name: index + 1,
            title: label,
            done: state.value > index + 1,
          },
          sample(Q.QBtn, {
            label: index === choices.length - 1 ? '重新开始' : '下一步',
            color: 'primary',
            onClick: () => {
              state.value = (state.value % choices.length) + 1;
            },
          }),
        ),
      ),
    ),
  carousel: (state) =>
    sample(
      Q.QCarousel,
      {
        ...update('modelValue', state),
        modelValue: state.value || choices[0].value,
        arrows: true,
        navigation: true,
        height: '170px',
        class: 'bg-primary text-white',
      },
      choices.map(({ label, value }) =>
        sample(
          Q.QCarouselSlide,
          { name: value },
          h('div', { class: 'gallery-slide' }, label),
        ),
      ),
    ),
  color: (state) =>
    row(
      sample(Q.QColor, { ...update('modelValue', state), noHeader: true }),
      text(state.value),
    ),
  range: (state) => {
    const [min, max] = state.value;
    return sample(Q.QRange, {
      modelValue: { min, max },
      min: 0,
      max: 100,
      label: true,
      'onUpdate:modelValue': ({ min, max }) => {
        state.value = [min, max];
      },
    });
  },
  knob: (state) =>
    sample(Q.QKnob, {
      ...update('modelValue', state),
      showValue: true,
      size: '86px',
      color: 'primary',
      trackColor: 'grey-3',
    }),
  toggleButton: (state) =>
    sample(Q.QBtnToggle, {
      ...update('modelValue', state),
      options: choices,
      toggleColor: 'primary',
    }),
  checkboxList: (state) =>
    sample(Q.QOptionGroup, {
      ...update('modelValue', state),
      options: choices,
      type: 'checkbox',
    }),
  editor: (state) =>
    sample(Q.QEditor, {
      ...update('modelValue', state),
      minHeight: '7rem',
      toolbar: [
        ['bold', 'italic', 'underline'],
        ['undo', 'redo'],
      ],
    }),
  toolbar: (state) =>
    sample(Q.QToolbar, { class: 'bg-grey-2' }, [
      sample(Q.QToolbarTitle, {}, '任务工具栏'),
      sample(Q.QBtn, {
        label: '刷新',
        flat: true,
        onClick: () => {
          state.value = '已刷新';
        },
      }),
      text(state.value),
    ]),
  buttonGroup: (state) =>
    sample(
      Q.QBtnGroup,
      { flat: true },
      choices.map(({ label, value }) =>
        sample(Q.QBtn, {
          label,
          color: state.value === value ? 'primary' : 'grey-7',
          flat: true,
          onClick: () => {
            state.value = value;
          },
        }),
      ),
    ),

  dialog: (open) => [
    sample(Q.QBtn, {
      outline: true,
      label: '打开弹窗',
      onClick: () => {
        open.value = true;
      },
    }),
    sample(
      Q.QDialog,
      update('modelValue', open),
      sample(
        Q.QCard,
        {},
        sample(Q.QCardSection, {}, [
          h('strong', '任务详情'),
          h('div', details),
        ]),
      ),
    ),
  ],
  tree: () =>
    sample(Q.QTree, {
      nodes: branches,
      nodeKey: 'key',
      tickStrategy: 'leaf',
    }),
  timeline: () =>
    sample(
      Q.QTimeline,
      { color: 'primary' },
      events.map((title, index) =>
        sample(Q.QTimelineEntry, { title, subtitle: '09:0' + index }),
      ),
    ),
  breadcrumb: () =>
    sample(
      Q.QBreadcrumbs,
      {},
      ['工作空间', '任务', '详情'].map((label) =>
        sample(Q.QBreadcrumbsEl, { label }),
      ),
    ),
  tooltip: () =>
    sample(
      Q.QBtn,
      { outline: true, label: '查看提示' },
      sample(Q.QTooltip, {}, '该任务每 30 分钟运行一次。'),
    ),
  button: (count) =>
    row(
      sample(Q.QBtn, {
        color: 'primary',
        label: '执行',
        onClick: () => count.value++,
      }),
      sample(Q.QBtn, { disable: true, label: '禁用' }),
      text('已点击 ' + count.value + ' 次'),
    ),
  input: (value) =>
    sample(Q.QInput, {
      ...outlined,
      ...update('modelValue', value),
      label: '任务名称',
      clearable: true,
    }),
  number: (value) =>
    sample(Q.QInput, {
      ...outlined,
      ...update('modelValue', value),
      type: 'number',
      min: 0,
      max: 100,
      label: '重试次数',
    }),
  checkbox: (value) =>
    sample(Q.QCheckbox, {
      ...update('modelValue', value),
      label: '包含失败记录',
    }),
  radio: (state) =>
    row(
      ...choices.map(({ label, value }) =>
        sample(Q.QRadio, {
          ...update('modelValue', state),
          label,
          val: value,
        }),
      ),
    ),
  switch: (value) =>
    sample(Q.QToggle, { ...update('modelValue', value), label: '自动刷新' }),
  slider: (value) =>
    sample(Q.QSlider, {
      ...update('modelValue', value),
      step: 5,
      min: 0,
      max: 100,
      label: true,
      'aria-label': '阈值',
    }),
  rating: (value) =>
    sample(Q.QRating, {
      ...update('modelValue', value),
      max: 5,
      size: '28px',
      color: 'amber',
    }),
  select: (value) =>
    sample(Q.QSelect, {
      ...outlined,
      ...update('modelValue', value),
      options: choices,
      emitValue: true,
      mapOptions: true,
      label: '选择任务',
      clearable: true,
    }),
  date: (value) =>
    sample(Q.QDate, {
      ...update('modelValue', value),
      minimal: true,
      class: 'gallery-calendar',
    }),
  tabs: (value) => [
    sample(
      Q.QTabs,
      update('modelValue', value),
      choices.map(({ label, value }) => sample(Q.QTab, { label, name: value })),
    ),
    sample(
      Q.QTabPanels,
      { modelValue: value.value, animated: true },
      choices.map(({ label, value }) =>
        sample(Q.QTabPanel, { name: value }, '查看' + label + '的记录。'),
      ),
    ),
  ],
  accordion: () =>
    sample(
      Q.QList,
      { bordered: true },
      choices.map(({ label }) =>
        sample(
          Q.QExpansionItem,
          { label, group: 'demo' },
          h('p', { class: 'q-pa-md' }, '打开后显示' + label + '的详情。'),
        ),
      ),
    ),
  progress: (value) =>
    sample(Q.QLinearProgress, {
      value: value.value / 100,
      rounded: true,
      size: '12px',
    }),
  pagination: (value) =>
    sample(Q.QPagination, {
      ...update('modelValue', value),
      max: 5,
      directionLinks: true,
    }),
  avatar: () =>
    row(
      sample(Q.QAvatar, { color: 'primary', textColor: 'white' }, 'WK'),
      sample(
        Q.QAvatar,
        { square: true, color: 'secondary', textColor: 'white' },
        'API',
      ),
    ),
  badge: () =>
    sample(
      Q.QBtn,
      { outline: true, label: '待处理' },
      sample(Q.QBadge, { floating: true, color: 'negative' }, '3'),
    ),
  chip: () =>
    row(
      sample(Q.QChip, { color: 'positive', textColor: 'white' }, '成功'),
      sample(Q.QChip, { outline: true, color: 'warning' }, '待确认'),
    ),
  card: () =>
    sample(
      Q.QCard,
      { bordered: true, flat: true },
      sample(Q.QCardSection, {}, [
        h('strong', '任务摘要'),
        h('div', '今天成功执行 12 次。'),
      ]),
    ),
  divider: () => [text('基本信息'), sample(Q.QSeparator), text('运行记录')],
  alert: () =>
    sample(
      Q.QBanner,
      { class: 'bg-green-1 text-green-10', rounded: true },
      '同步已完成。已更新 12 条记录。',
    ),
  skeleton: () =>
    row(
      sample(Q.QSkeleton, { type: 'QAvatar' }),
      sample(Q.QSkeleton, { type: 'text', width: '180px' }),
    ),
  spinner: () =>
    row(
      sample(Q.QSpinner, { size: '30px', color: 'primary' }),
      text('正在读取记录'),
    ),
};

export const available = Object.keys(demos);
export const mount = mountVue(demos, { configure });
