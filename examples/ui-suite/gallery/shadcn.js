import { createApp, h, ref } from 'vue';
import { Badge } from '../../vue-components/src/components/ui/badge';
import { Button } from '../../vue-components/src/components/ui/button';
import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
} from '../../vue-components/src/components/ui/card';
import { Input } from '../../vue-components/src/components/ui/input';
import { Label } from '../../vue-components/src/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../vue-components/src/components/ui/select';
import { Switch } from '../../vue-components/src/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../vue-components/src/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../vue-components/src/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './shadcn-components/accordion';
import { Alert, AlertDescription, AlertTitle } from './shadcn-components/alert';
import { Avatar, AvatarFallback } from './shadcn-components/avatar';
import { Checkbox } from './shadcn-components/checkbox';
import { RadioGroup, RadioGroupItem } from './shadcn-components/radio-group';
import { Progress } from './shadcn-components/progress';
import { Skeleton } from './shadcn-components/skeleton';
import { Slider } from './shadcn-components/slider';
import { Textarea } from './shadcn-components/textarea';
import { Separator } from './shadcn-components/separator';
import { Spinner } from './shadcn-components/spinner';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from './shadcn-components/empty';
import {
  Pagination,
  PaginationContent,
  PaginationPrevious,
  PaginationNext,
} from './shadcn-components/pagination';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './shadcn-components/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './shadcn-components/collapsible';
import { Kbd, KbdGroup } from './shadcn-components/kbd';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../../vue-components/src/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '../../vue-components/src/components/ui/sheet';
import { Calendar } from './shadcn-components/calendar';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from './shadcn-components/carousel';
import { Toggle } from './shadcn-components/toggle';
import { ToggleGroup, ToggleGroupItem } from './shadcn-components/toggle-group';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './shadcn-components/breadcrumb';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from './shadcn-components/alert-dialog';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from './shadcn-components/hover-card';
import { ButtonGroup } from './shadcn-components/button-group';
import {
  NativeSelect,
  NativeSelectOption,
} from './shadcn-components/native-select';
import { choices, tableColumns, tableRows } from './examples.js';
import '../../vue-components/src/shadcn.css';
import './official/shadcn/nova-example-styles.css';

const row = (...children) => h('div', { class: 'gallery-row' }, children);
const sample = (component, props, content) =>
  h(component, props, content == null ? undefined : { default: () => content });
const model = (value) => ({
  modelValue: value.value,
  'onUpdate:modelValue': (next) => {
    value.value = next;
  },
});
const details = '该任务每 30 分钟运行一次。';
export const sampleLoaders = {
  'data-table': () => import('./ShadcnDataTable.vue'),
};
const demos = {
  fieldLabel: () => [
    sample(Label, { for: 'gallery-name' }, '名称'),
    sample(Input, { id: 'gallery-name', placeholder: '输入名称' }),
  ],
  table: () =>
    sample(Table, {}, [
      sample(
        TableHeader,
        {},
        sample(
          TableRow,
          {},
          tableColumns.map(({ key, label }) =>
            sample(TableHead, { key }, label),
          ),
        ),
      ),
      sample(
        TableBody,
        {},
        tableRows.map((item) =>
          sample(
            TableRow,
            { key: item.name },
            tableColumns.map(({ key }) =>
              sample(TableCell, { key }, item[key]),
            ),
          ),
        ),
      ),
    ]),
  calendar: (state) => [
    sample(Calendar, {
      ...model(state),
      locale: 'zh-CN',
      class: 'gallery-calendar',
    }),
    h('span', { role: 'status' }, state.value?.toString() || '请选择日期'),
  ],
  carousel: () =>
    sample(Carousel, { class: 'gallery-carousel' }, [
      sample(
        CarouselContent,
        {},
        choices.map((item) =>
          sample(
            CarouselItem,
            { key: item.value },
            h('div', { class: 'gallery-slide' }, item.label),
          ),
        ),
      ),
      sample(CarouselPrevious, { class: 'left-1' }),
      sample(CarouselNext, { class: 'right-1' }),
    ]),
  toggle: (state) =>
    sample(
      Toggle,
      { ...model(state), variant: 'outline', 'aria-label': '订阅任务' },
      state.value ? '已订阅' : '订阅任务',
    ),
  toggleGroup: (state) =>
    sample(
      ToggleGroup,
      {
        ...model(state),
        type: 'single',
        variant: 'outline',
        'aria-label': '切换任务',
      },
      choices.map((item) =>
        sample(
          ToggleGroupItem,
          { key: item.value, value: item.value },
          item.label,
        ),
      ),
    ),
  breadcrumb: () =>
    sample(
      Breadcrumb,
      {},
      sample(BreadcrumbList, {}, [
        sample(BreadcrumbItem, {}, '工作空间'),
        sample(BreadcrumbSeparator),
        sample(BreadcrumbItem, {}, '任务'),
        sample(BreadcrumbSeparator),
        sample(BreadcrumbItem, {}, sample(BreadcrumbPage, {}, '详情')),
      ]),
    ),
  alertDialog: (state) => [
    sample(AlertDialog, {}, [
      sample(
        AlertDialogTrigger,
        { asChild: true },
        sample(Button, { variant: 'outline' }, '打开确认弹窗'),
      ),
      sample(AlertDialogContent, {}, [
        sample(AlertDialogTitle, {}, '确认归档任务？'),
        sample(AlertDialogDescription, {}, '归档后可在历史记录中查看。'),
        sample(AlertDialogFooter, {}, [
          sample(AlertDialogCancel, {}, '取消'),
          sample(
            AlertDialogAction,
            {
              onClick: () => {
                state.value = '任务已归档';
              },
            },
            '确认',
          ),
        ]),
      ]),
    ]),
    h('span', { role: 'status' }, state.value),
  ],
  hoverCard: () =>
    sample(HoverCard, { openDelay: 150 }, [
      sample(
        HoverCardTrigger,
        { asChild: true },
        sample(Button, { variant: 'outline' }, '任务摘要'),
      ),
      sample(HoverCardContent, {}, '任务负责人：运维组'),
    ]),
  buttonGroup: (state) =>
    sample(
      ButtonGroup,
      {},
      choices.map((item) =>
        sample(
          Button,
          {
            key: item.value,
            variant: state.value === item.value ? 'default' : 'outline',
            onClick: () => {
              state.value = item.value;
            },
          },
          item.label,
        ),
      ),
    ),
  nativeSelect: (state) =>
    sample(
      NativeSelect,
      {
        'aria-label': '选择任务',
        value: state.value,
        onChange: (event) => {
          state.value = event.target.value;
        },
      },
      choices.map((item) =>
        sample(
          NativeSelectOption,
          { key: item.value, value: item.value },
          item.label,
        ),
      ),
    ),

  dialog: () =>
    sample(Dialog, {}, [
      sample(
        DialogTrigger,
        { asChild: true },
        sample(Button, { variant: 'outline', class: 'w-fit' }, '打开弹窗'),
      ),
      sample(DialogContent, {}, [
        sample(DialogTitle, {}, '任务详情'),
        sample(DialogDescription, {}, details),
      ]),
    ]),
  sheet: () =>
    sample(Sheet, {}, [
      sample(
        SheetTrigger,
        { asChild: true },
        sample(Button, { variant: 'outline', class: 'w-fit' }, '打开抽屉'),
      ),
      sample(SheetContent, { class: 'p-6' }, [
        sample(SheetTitle, {}, '任务详情'),
        sample(SheetDescription, {}, details),
      ]),
    ]),
  button: (count) =>
    row(
      sample(Button, { onClick: () => count.value++ }, '执行'),
      sample(Button, { disabled: true }, '禁用'),
      h('span', { role: 'status' }, '已点击 ' + count.value + ' 次'),
    ),
  input: (value) =>
    sample(Input, { ...model(value), placeholder: '输入任务名称' }),
  switch: (value) =>
    row(
      sample(Switch, { ...model(value), id: 'demo-switch' }),
      h('label', { for: 'demo-switch' }, '自动刷新'),
    ),
  select: (value) =>
    sample(Select, model(value), [
      sample(
        SelectTrigger,
        { 'aria-label': '选择任务' },
        sample(SelectValue, { placeholder: '选择任务' }),
      ),
      sample(
        SelectContent,
        {},
        choices.map(({ label, value }) => sample(SelectItem, { value }, label)),
      ),
    ]),
  tabs: (value) =>
    sample(Tabs, model(value), [
      sample(
        TabsList,
        {},
        choices.map(({ label, value }) =>
          sample(TabsTrigger, { value }, label),
        ),
      ),
      ...choices.map(({ label, value }) =>
        sample(TabsContent, { value }, '查看' + label + '的记录。'),
      ),
    ]),
  textarea: (value) =>
    sample(Textarea, { ...model(value), placeholder: '输入备注' }),
  checkbox: (value) =>
    row(
      sample(Checkbox, { ...model(value), id: 'demo-check' }),
      h('label', { for: 'demo-check' }, '包含失败记录'),
    ),
  radio: (state) =>
    sample(
      RadioGroup,
      { ...model(state), 'aria-label': '任务类型' },
      choices.map(({ value, label }) =>
        row(
          sample(RadioGroupItem, { id: value, value }),
          h('label', { for: value }, label),
        ),
      ),
    ),
  slider: (value) =>
    row(
      sample(Slider, {
        ...model(value),
        step: 5,
        class: 'flex-1',
        'aria-label': '阈值',
      }),
      h('span', { role: 'status' }, value.value[0] + '%'),
    ),
  progress: (value) => [
    sample(Progress, { modelValue: value.value, 'aria-label': '演示任务进度' }),
    sample(
      Button,
      {
        variant: 'outline',
        class: 'w-fit',
        onClick: () => {
          value.value =
            value.value >= 100 ? 0 : Math.min(100, value.value + 20);
        },
      },
      '推进进度',
    ),
  ],
  avatar: () =>
    row(
      sample(Avatar, {}, sample(AvatarFallback, {}, 'WK')),
      sample(Avatar, { class: 'size-12' }, sample(AvatarFallback, {}, 'API')),
    ),
  accordion: () =>
    sample(
      Accordion,
      { type: 'single', collapsible: true },
      choices.map(({ label, value }) =>
        sample(AccordionItem, { value }, [
          sample(AccordionTrigger, {}, label),
          sample(AccordionContent, {}, '打开后显示' + label + '的详情。'),
        ]),
      ),
    ),
  divider: () => [
    h('span', '基本信息'),
    sample(Separator),
    h('span', '运行记录'),
  ],
  alert: () =>
    sample(Alert, {}, [
      sample(AlertTitle, {}, '同步已完成'),
      sample(AlertDescription, {}, '已更新 12 条记录。'),
    ]),
  skeleton: () =>
    row(
      sample(Skeleton, { class: 'size-12 rounded-full' }),
      sample(Skeleton, { class: 'h-4 w-44' }),
    ),
  spinner: () =>
    row(sample(Spinner), h('span', { role: 'status' }, '正在读取记录')),
  empty: () =>
    sample(
      Empty,
      {},
      sample(EmptyHeader, {}, [
        sample(EmptyTitle, {}, '暂无运行记录'),
        sample(EmptyDescription, {}, '运行任务后会显示记录。'),
      ]),
    ),
  pagination: (value) => [
    sample(
      Pagination,
      {
        page: value.value,
        'onUpdate:page': (page) => {
          value.value = page;
        },
        itemsPerPage: 10,
        total: 50,
      },
      sample(PaginationContent, {}, [
        sample(PaginationPrevious),
        sample(PaginationNext),
      ]),
    ),
    h('span', { role: 'status' }, '第 ' + value.value + ' 页'),
  ],
  tooltip: () =>
    sample(
      TooltipProvider,
      { delayDuration: 150 },
      sample(Tooltip, {}, [
        sample(
          TooltipTrigger,
          { asChild: true },
          sample(Button, { variant: 'outline' }, '查看提示'),
        ),
        sample(TooltipContent, {}, '该任务每 30 分钟运行一次。'),
      ]),
    ),
  collapsible: () =>
    sample(Collapsible, {}, [
      sample(
        CollapsibleTrigger,
        { asChild: true },
        sample(Button, { variant: 'outline' }, '展开任务详情'),
      ),
      sample(
        CollapsibleContent,
        { class: 'mt-3' },
        '该任务每 30 分钟运行一次。',
      ),
    ]),
  kbd: () =>
    sample(KbdGroup, {}, [
      sample(Kbd, {}, 'Ctrl'),
      h('span', '+'),
      sample(Kbd, {}, 'K'),
    ]),
  badge: () =>
    row(
      sample(Badge, {}, '成功'),
      sample(Badge, { variant: 'outline' }, '待确认'),
    ),
  card: () =>
    sample(Card, {}, [
      sample(CardHeader, {}, sample(CardTitle, {}, '任务摘要')),
      sample(CardContent, {}, '今天成功执行 12 次。'),
    ]),
};

export const available = Object.keys(demos);
export function mount(target, kind, OfficialSample) {
  const initial = {
    button: 0,
    checkbox: false,
    switch: false,
    tabs: 'sync',
    radio: 'sync',
    slider: [40],
    progress: 35,
    pagination: 1,
    calendar: undefined,
    toggle: false,
    toggleGroup: 'sync',
    nativeSelect: 'sync',
  };
  const value = ref(kind in initial ? initial[kind] : '');
  const app = createApp({
    render: () =>
      h('div', { class: 'gallery-sample' }, [
        OfficialSample ? h(OfficialSample) : demos[kind](value),
      ]),
  });
  app.mount(target);
  return () => app.unmount();
}
