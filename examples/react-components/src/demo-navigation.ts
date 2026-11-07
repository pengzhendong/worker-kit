import {
  BgColorsOutlined,
  DashboardOutlined,
  EyeOutlined,
  FileTextOutlined,
  FormOutlined,
  LayoutOutlined,
  BookOutlined,
  ScheduleOutlined,
  SettingOutlined,
  SwitcherOutlined,
  TableOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import workspacePages from '../../ui-demo/workspace-pages.json';
import componentPages from '../../ui-demo/component-pages.json';

const componentIcons: Record<string, typeof TableOutlined> = {
  table: TableOutlined,
  form: FormOutlined,
  dialogs: SwitcherOutlined,
  preview: EyeOutlined,
  layout: LayoutOutlined,
  theme: BgColorsOutlined,
};
const workspaceIcons: Record<string, typeof TableOutlined> = {
  workspace: ThunderboltOutlined,
  overview: DashboardOutlined,
  tasks: ScheduleOutlined,
  runs: FileTextOutlined,
  settings: SettingOutlined,
};
const gallery = { id: 'gallery', label: '组件目录', icon: BookOutlined };
const galleryEntry = ['/mui/', '/mantine/'].includes(import.meta.env.BASE_URL);
const initialPage = componentPages.find((page) =>
  location.pathname.endsWith(page.path),
)?.key;
export const initialComponent =
  galleryEntry && location.pathname.endsWith('/components/gallery')
    ? gallery.id
    : initialPage;
const comparisonItems = componentPages.map((page) => ({
  id: page.key,
  label: page.title,
  icon: componentIcons[page.key],
}));

const catalogItems = galleryEntry && initialComponent ? [gallery] : [];
export const componentMenu = [...catalogItems, ...comparisonItems];

export const groups = [
  ...(!initialComponent
    ? [
        {
          title: '工作空间',
          items: workspacePages.map((page) => ({
            ...page,
            icon: workspaceIcons[page.id],
          })),
        },
      ]
    : []),
  ...(catalogItems.length ? [{ title: '', items: catalogItems }] : []),
  { title: '对比示例', items: comparisonItems },
];
