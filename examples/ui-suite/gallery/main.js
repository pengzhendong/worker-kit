import './styles.css';
import index from './component-index.json';
import { describeComponent } from './examples.js';
import officialSamples from '#gallery-official';

const view = __GALLERY_LIBRARY__;
const [name, source, prefix, records] = index[view];
const get = (id) => document.getElementById(id);
const root = get('demo');
const search = get('search');
const category = get('category');
const result = get('results');
const list = get('entries');
const reference = get('reference');
const library = get('library');
const variantPicker = get('variant-picker');
const variant = get('variant');

if (new URLSearchParams(location.search).get('embed') === '1')
  document.documentElement.classList.add('gallery-embedded');

const adapter = await import('#gallery-adapter');

const entries = records
  .map(([path, title, docsPath, parent]) => {
    const info = describeComponent(path);
    const page = docsPath ?? path;
    return {
      ...info,
      path,
      title,
      parent,
      load: officialSamples[path] ?? adapter.sampleLoaders?.[path],
      url: new URL(page.startsWith('https://') ? page : prefix + page),
    };
  })
  .filter(({ kind, load }) => load || adapter.available.includes(kind))
  .sort((a, b) => Number(b.kind === 'button') - Number(a.kind === 'button'));

const byPath = new Map(entries.map((entry) => [entry.path, entry]));
for (const entry of entries) {
  entry.component = byPath.get(entry.parent) ?? entry;
  if (entry.component !== entry) (entry.component.variants ??= []).push(entry);
}
const components = entries.filter((entry) => entry.component === entry);

get('title').textContent = name + ' 组件目录';
get('back').href = '/?view=' + view;
get('source').href = source;
for (const [key, [label]] of Object.entries(index))
  library.add(new Option(label, key));
library.value = view;
library.onchange = () => {
  location.href = '/' + library.value + '/gallery/';
};
for (const group of new Set(components.map((e) => e.group)))
  category.add(new Option(group, group));

let unmount;
let selected;
let selection = 0;
let loadFailed = false;
async function show(entry) {
  if (!entry || (selected === entry && !loadFailed)) return;
  const current = ++selection;
  loadFailed = false;
  selected = entry;
  unmount?.();
  unmount = undefined;
  root.replaceChildren();
  root.scrollTop = 0;
  const component = entry.component;
  get('selected-title').textContent = component.title;
  variantPicker.hidden = !component.variants?.length;
  variant.replaceChildren(
    new Option('基础示例', component.path),
    ...(component.variants ?? []).map(
      ({ title, path }) => new Option(title, path),
    ),
  );
  variant.value = entry.path;
  reference.href = entry.url;
  history.replaceState(null, '', '#' + encodeURIComponent(entry.path));
  for (const item of list.querySelectorAll('button')) {
    if (item.dataset.path === component.path)
      item.setAttribute('aria-current', 'true');
    else item.removeAttribute('aria-current');
  }
  if (!entry.load) {
    unmount = adapter.mount(root, entry.kind);
    return;
  }
  const status = document.createElement('p');
  status.role = 'status';
  status.textContent = '正在加载示例…';
  root.append(status);
  try {
    const { default: Sample } = await entry.load();
    if (current !== selection) return;
    root.replaceChildren();
    unmount = adapter.mount(root, entry.kind, Sample);
  } catch (error) {
    if (current !== selection) return;
    loadFailed = true;
    status.textContent = '示例加载失败。可重新选择此组件。';
    root.replaceChildren(status);
    console.error(error);
  }
}

function render() {
  const query = search.value.trim().toLowerCase();
  const filtered = components.filter(
    (entry) =>
      (!category.value || entry.group === category.value) &&
      [
        entry.title,
        entry.path,
        entry.label,
        entry.group,
        ...(entry.variants ?? []).flatMap(({ title, path }) => [title, path]),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
  );
  result.textContent = filtered.length
    ? `${filtered.length} 个组件`
    : '没有符合条件的组件';
  list.replaceChildren(
    ...filtered.map((entry) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      const name = document.createElement('span');
      button.type = 'button';
      button.className = 'catalog-entry';
      button.dataset.path = entry.path;
      if (entry === selected?.component)
        button.setAttribute('aria-current', 'true');
      name.textContent = entry.title;
      button.append(name);
      button.onclick = () => {
        show(entry);
        if (matchMedia('(max-width: 640px)').matches)
          root.parentElement.scrollIntoView({ block: 'start' });
      };
      li.append(button);
      return li;
    }),
  );
  list.scrollTop = 0;
  if (!filtered.includes(selected?.component) && filtered.length)
    show(filtered[0]);
}

let initialPath;
try {
  initialPath = decodeURIComponent(location.hash.slice(1));
} catch {}
show(byPath.get(initialPath) ?? components[0]);
render();
search.oninput = render;
category.onchange = render;
variant.onchange = () => show(byPath.get(variant.value));
