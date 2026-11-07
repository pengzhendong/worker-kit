import { computed, nextTick, ref, type Component } from 'vue';
import {
  Activity,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  LibraryBig,
  PanelsTopLeft,
  LayoutPanelLeft,
  Palette,
  Table2,
  TextCursorInput,
  ScanEye,
  Settings2,
} from '@lucide/vue';
import workspacePages from '../../ui-demo/workspace-pages.json';
import componentPages from '../../ui-demo/component-pages.json';

export const galleryPage = {
  id: 'gallery',
  path: '/components/gallery',
  label: '组件目录',
  description: '浏览和试用组件。',
  icon: LibraryBig,
};
const hasGallery = ['/element/', '/naive/', '/shadcn/', '/vuetify/'].includes(
  import.meta.env.BASE_URL,
);
const entry = componentPages.find((item) =>
  location.pathname.endsWith(item.path),
);
const galleryEntry = hasGallery && location.pathname.endsWith(galleryPage.path);
export const componentPreview = !!entry || galleryEntry;
export const componentIcons: Record<string, Component> = {
  table: Table2,
  form: TextCursorInput,
  dialogs: PanelsTopLeft,
  layout: LayoutPanelLeft,
  theme: Palette,
  preview: ScanEye,
};
export const componentMenu = componentPages.map((item) => ({
  id: item.key,
  label: item.title,
  icon: componentIcons[item.key],
}));
export const componentGroups = [
  ...(hasGallery && componentPreview
    ? [{ title: '', items: [galleryPage] }]
    : []),
  { title: '对比示例', items: componentMenu },
];

const icons = [
  Activity,
  LayoutDashboard,
  LibraryBig,
  CalendarClock,
  ClipboardList,
  Settings2,
];
export const workspaceMenu = workspacePages.map((item, index) => ({
  ...item,
  icon: icons[index],
}));
export const filePreview = { id: 'preview', label: '文件', icon: ScanEye };
export const dialogPreview = {
  id: 'dialogs',
  label: '弹窗',
  icon: PanelsTopLeft,
};

export function useDemoNavigation(
  groups: { items: { id: string; label: string }[] }[],
  initialPage = galleryEntry ? galleryPage.id : (entry?.key ?? 'workspace'),
) {
  const page = ref(initialPage);
  const open = ref(false);
  const title = computed(
    () =>
      groups
        .flatMap((group) => group.items)
        .find((item) => item.id === page.value)?.label || '业务工作台',
  );
  async function select(id: string) {
    page.value = id;
    open.value = false;
    await nextTick();
    document.querySelector('[data-library-scroll]')?.scrollTo({ top: 0 });
  }
  return { page, open, title, select };
}
