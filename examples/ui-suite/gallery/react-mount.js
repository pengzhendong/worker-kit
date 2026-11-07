import { createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';

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
  select: null,
  fileInput: null,
  range: [20, 65],
  multiSelect: [],
  transfer: ['sync'],
  color: '#315bd6',
  segmented: 'sync',
  stepper: 1,
  snackbar: false,
  toggleButton: 'sync',
};
export function mountReact(target, kind, demos, Provider, OfficialSample) {
  function Demo() {
    const [value, setValue] = useState(kind in initial ? initial[kind] : '');
    return h(
      'div',
      { className: 'gallery-sample' },
      OfficialSample ? h(OfficialSample) : demos[kind](value, setValue),
      kind === 'progress' &&
        h(
          'button',
          {
            className: 'catalog-action',
            type: 'button',
            onClick: () =>
              setValue((current) =>
                current >= 100 ? 0 : Math.min(100, current + 20),
              ),
          },
          '推进进度',
        ),
      kind === 'pagination' &&
        h('span', { role: 'status' }, '第 ' + value + ' 页'),
    );
  }
  const root = createRoot(target);
  root.render(h(Provider, null, h(Demo)));
  return () => root.unmount();
}
export const row = (...children) =>
  h('div', { className: 'gallery-row' }, ...children);
export const status = (value) => h('span', { role: 'status' }, value);
