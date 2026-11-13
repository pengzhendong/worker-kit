import labels from './zh-CN.js';

const template = location.pathname.split('/')[1];
const languageKey = `workerkit-template-language-${template}`;
const language = localStorage.getItem(languageKey) === 'en' ? 'en' : 'zh-CN';
document.documentElement.lang = language;

const menu =
  template === 'tabler'
    ? document.querySelector('[data-lang="zh"]')?.parentElement
    : document.querySelector('[aria-labelledby="language-menu"]');
for (const option of menu?.querySelectorAll('a') ?? []) {
  const code = option.dataset.lang ?? option.hreflang;
  if (code !== 'en' && code !== 'zh') {
    option.hidden = true;
    continue;
  }
  option.addEventListener('click', (event) => {
    event.preventDefault();
    localStorage.setItem(languageKey, code === 'en' ? 'en' : 'zh-CN');
    location.reload();
  });
  option.setAttribute(
    'aria-current',
    String(code === (language === 'en' ? 'en' : 'zh')),
  );
}
if (template === 'adminlte' && menu && !menu.querySelector('[hreflang="zh"]')) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.className = 'dropdown-item';
  link.href = '#';
  link.hreflang = 'zh';
  link.textContent = '简体中文';
  link.setAttribute('aria-current', String(language === 'zh-CN'));
  link.onclick = (event) => {
    event.preventDefault();
    localStorage.setItem(languageKey, 'zh-CN');
    location.reload();
  };
  item.append(link);
  menu.append(item);
}
let toggle = menu?.parentElement.querySelector('[data-bs-toggle="dropdown"]');
if (toggle && template === 'tabler') {
  toggle.textContent = language === 'en' ? 'EN' : '中文';
  const sidebarBrand = document.querySelector('.navbar-vertical .navbar-brand');
  const brandLink = sidebarBrand?.querySelector('a');
  if (brandLink) {
    brandLink.classList.add('d-inline-flex', 'align-items-center', 'gap-2');
    brandLink.setAttribute('aria-label', 'WorkerKit');
    brandLink.querySelector('svg')?.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.textContent = 'WorkerKit';
    brandLink.append(name);
  }
  if (
    sidebarBrand && brandLink &&
    document.documentElement.dataset.bsNavbarPosition === 'vertical'
  ) {
    const dropdown = menu.parentElement;
    const brandRow = document.createElement('div');
    brandRow.className = 'd-flex align-items-center justify-content-between gap-2 w-100';
    sidebarBrand.before(brandRow);
    dropdown.classList.remove('nav-item', 'd-none', 'd-md-flex');
    dropdown.classList.add('flex-shrink-0', 'me-2');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline-secondary btn-sm dropdown-toggle text-nowrap';
    button.textContent = toggle.textContent;
    toggle.replaceWith(button);
    toggle = button;
    menu.classList.add('dropdown-menu-end');
    brandRow.append(sidebarBrand, dropdown);
  }
}
if (toggle) {
  toggle.setAttribute(
    'aria-label',
    language === 'en' ? 'Select language' : '选择语言',
  );
  toggle.removeAttribute('data-bs-toggle');
  toggle.setAttribute('aria-expanded', 'false');
  const setOpen = (open) => {
    menu.classList.toggle('show', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    setOpen(!menu.classList.contains('show'));
  });
  document.addEventListener('click', (event) => {
    if (!menu.parentElement.contains(event.target)) setOpen(false);
  });
  menu.parentElement.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setOpen(false);
    toggle.focus();
  });
}

if (language === 'zh-CN') {
  const attributes = [
    'aria-label',
    'placeholder',
    'title',
    'alt',
    'data-bs-title',
  ];
  const translate = (value) => {
    const key = value.trim().replace(/\s+/g, ' ').toLowerCase();
    if (key.startsWith('welcome back, ')) {
      const name = value.trim().slice('welcome back, '.length);
      return value.replace(value.trim(), `欢迎回来，${name}`);
    }
    return Object.hasOwn(labels, key)
      ? value.replace(value.trim(), labels[key])
      : value;
  };
  const updateAttributes = (element) => {
    for (const attribute of attributes) {
      const current = element.getAttribute(attribute);
      if (current && translate(current) !== current)
        element.setAttribute(attribute, translate(current));
    }
  };
  const updateText = (node) => {
    if (
      !node.parentElement?.closest(
        'script, style, pre, code, svg, textarea, [contenteditable]',
      )
    ) {
      const next = translate(node.data);
      if (node.data !== next) node.data = next;
    }
  };
  const updateTree = (root) => {
    if (root.nodeType === Node.TEXT_NODE) {
      updateText(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    updateAttributes(root);
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.TEXT_NODE) updateText(node);
      else updateAttributes(node);
    }
  };
  updateTree(document.body);
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') updateAttributes(record.target);
      else if (record.type === 'characterData') updateText(record.target);
      else for (const child of record.addedNodes) updateTree(child);
    }
  }).observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: attributes,
  });
}
