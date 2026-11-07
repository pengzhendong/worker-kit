import { createApp, h, ref } from 'vue';
import { choices } from './examples.js';

export const names = Object.fromEntries(
  choices.map(({ label, value }) => [value, label]),
);
export const row = (...children) =>
  h('div', { class: 'gallery-row' }, children);
export const text = (value) => h('span', { role: 'status' }, value);
export const sample = (component, props, content) =>
  h(component, props, content == null ? undefined : { default: () => content });
export const update = (key, state) => ({
  [key]: state.value,
  ['onUpdate:' + key]: (value) => {
    state.value = value;
  },
});

export const branches = [
  {
    label: '运维任务',
    key: 'operations',
    children: choices.map(({ value: key, label }) => ({ key, label })),
  },
];
export const events = ['开始同步', '处理记录', '同步完成'];
export const details = '该任务每 30 分钟运行一次。';
const initial = {
  button: 0,
  dialog: false,
  drawer: false,
  modal: false,
  checkbox: false,
  switch: false,
  slider: 40,
  progress: 35,
  rating: 3,
  number: 3,
  pagination: 1,
  radio: 'sync',
  tabs: 'sync',
  date: null,
  fileInput: null,
  fileUpload: null,
  inputTags: ['Vue'],
  color: '#315bd6',
  colorInput: '#315bd6',
  range: [20, 65],
  transfer: ['sync'],
  multiSelect: [],
  checkboxGroup: [],
  checkboxList: [],
  stepper: 1,
  snackbar: false,
  knob: 35,
  toggleButton: false,
  toggle: false,
  segmented: 'sync',
  cascader: null,
  treeSelect: null,
  select: null,
};
export function mountVue(
  demos,
  { configure = () => {}, wrap = (child) => child } = {},
) {
  return (target, kind, OfficialSample) => {
    const value = ref(kind in initial ? initial[kind] : '');
    const app = createApp({
      render() {
        const content = OfficialSample ? h(OfficialSample) : demos[kind](value);
        return wrap(
          h('div', { class: 'gallery-sample' }, [
            content,
            kind === 'progress'
              ? h(
                  'button',
                  {
                    type: 'button',
                    class: 'catalog-action',
                    onClick: () => {
                      value.value =
                        value.value >= 100
                          ? 0
                          : Math.min(100, value.value + 20);
                    },
                  },
                  '推进进度',
                )
              : null,
            kind === 'pagination' ? text('第 ' + value.value + ' 页') : null,
          ]),
          Boolean(OfficialSample),
        );
      },
    });
    configure(app, Boolean(OfficialSample));
    app.mount(target);
    return () => app.unmount();
  };
}
