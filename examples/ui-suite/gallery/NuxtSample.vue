<script setup>
import { ref } from 'vue';
import { choices, tableColumns, tableRows } from './examples.js';

const props = defineProps({ kind: String, official: Object });
const initial = {
  button: 0,
  color: '#315bd6',
  selectMenu: [],
  checkboxGroup: [],
  inputOtp: [],
  inputTags: ['Vue'],
  stepper: 0,
  checkbox: false,
  switch: false,
  slider: 40,
  progress: 35,
  rating: 3,
  number: 3,
  pagination: 1,
  radio: 'sync',
  tabs: 'sync',
};
const value = ref(initial[props.kind] ?? undefined);
const columns = tableColumns.map(({ key, label }) => ({
  accessorKey: key,
  header: label,
}));
const trail = ['工作空间', '任务', '详情'].map((label) => ({ label }));
const events = ['开始同步', '处理记录', '同步完成'].map((title, i) => ({
  title,
  date: '09:0' + i,
}));
const branches = [{ label: '运维任务', children: choices }];
const sections = choices.map(({ label, value }) => ({
  label,
  value,
  content: '查看' + label + '的记录。',
}));
</script>

<template>
  <UApp>
    <div class="gallery-sample">
      <component :is="official" v-if="official" />
      <div v-else-if="kind === 'button'" class="gallery-row">
        <UButton @click="value++">执行</UButton>
        <UButton disabled>禁用</UButton>
        <span role="status">已点击 {{ value }} 次</span>
      </div>
      <UTable
        v-else-if="kind === 'table'"
        :data="tableRows"
        :columns="columns"
      />
      <UFileUpload
        v-else-if="kind === 'fileUpload'"
        v-model="value"
        label="选择或拖入文件"
        layout="list"
      />
      <UInput
        v-else-if="kind === 'input'"
        v-model="value"
        placeholder="输入任务名称"
      />
      <UInputTags
        v-else-if="kind === 'inputTags'"
        v-model="value"
        placeholder="输入标签后按回车"
      />
      <UTextarea
        v-else-if="kind === 'textarea'"
        v-model="value"
        placeholder="输入备注"
      />
      <UInputNumber
        v-else-if="kind === 'number'"
        v-model="value"
        :min="0"
        :max="100"
        aria-label="重试次数"
      />
      <UCheckbox
        v-else-if="kind === 'checkbox'"
        v-model="value"
        label="包含失败记录"
      />
      <URadioGroup
        v-else-if="kind === 'radio'"
        v-model="value"
        :items="choices"
        orientation="horizontal"
      />
      <USwitch v-else-if="kind === 'switch'" v-model="value" label="自动刷新" />
      <USlider
        v-else-if="kind === 'slider'"
        v-model="value"
        :step="5"
        aria-label="阈值"
      />
      <UInputRating v-else-if="kind === 'rating'" v-model="value" />
      <USelect
        v-else-if="kind === 'select'"
        v-model="value"
        :items="choices"
        placeholder="选择任务"
      />
      <UCarousel
        v-else-if="kind === 'carousel'"
        v-slot="{ item }"
        :items="choices"
        arrows
        dots
      >
        <div class="gallery-slide">{{ item.label }}</div>
      </UCarousel>
      <UInputMenu
        v-else-if="kind === 'inputMenu'"
        v-model="value"
        :items="choices"
        value-key="value"
        placeholder="输入任务名称"
      />
      <USelectMenu
        v-else-if="kind === 'selectMenu'"
        v-model="value"
        :items="choices"
        value-key="value"
        multiple
        placeholder="选择多个任务"
      />
      <UCheckboxGroup
        v-else-if="kind === 'checkboxGroup'"
        v-model="value"
        :items="choices"
      />
      <UPinInput
        v-else-if="kind === 'inputOtp'"
        v-model="value"
        type="number"
        :length="4"
        aria-label="演示验证码"
      />
      <UColorPicker v-else-if="kind === 'color'" v-model="value" />
      <UStepper
        v-else-if="kind === 'stepper'"
        v-model="value"
        :items="choices.map(({ label }) => ({ title: label }))"
      />
      <UAvatarGroup v-else-if="kind === 'avatarGroup'" :max="2">
        <UAvatar
          v-for="avatar in ['WK', 'API', 'UI']"
          :key="avatar"
          :text="avatar"
        />
      </UAvatarGroup>
      <div v-else-if="kind === 'kbd'" class="gallery-row">
        <UKbd>Ctrl</UKbd><span>+</span><UKbd>K</UKbd>
      </div>
      <UCalendar v-else-if="kind === 'calendar'" v-model="value" />
      <UTabs v-else-if="kind === 'tabs'" v-model="value" :items="sections" />
      <UAccordion v-else-if="kind === 'accordion'" :items="sections" />
      <template v-else-if="kind === 'progress'">
        <UProgress :model-value="value" aria-label="演示任务进度" />
        <UButton
          class="w-fit"
          variant="outline"
          @click="value = value >= 100 ? 0 : Math.min(100, value + 20)"
          >推进进度</UButton
        >
      </template>
      <template v-else-if="kind === 'pagination'">
        <UPagination v-model:page="value" :total="50" />
        <span role="status">第 {{ value }} 页</span>
      </template>
      <div v-else-if="kind === 'avatar'" class="gallery-row">
        <UAvatar text="WK" /><UAvatar text="API" size="lg" />
      </div>
      <div v-else-if="kind === 'badge'" class="gallery-row">
        <UBadge color="success">成功</UBadge
        ><UBadge color="warning" variant="outline">待确认</UBadge>
      </div>
      <UCard v-else-if="kind === 'card'"
        ><template #header>任务摘要</template>今天成功执行 12 次。</UCard
      >
      <template v-else-if="kind === 'divider'"
        ><span>基本信息</span><USeparator label="下一节" /><span
          >运行记录</span
        ></template
      >
      <UAlert
        v-else-if="kind === 'alert'"
        color="success"
        title="同步已完成"
        description="已更新 12 条记录。"
      />
      <div v-else-if="kind === 'skeleton'" class="gallery-row">
        <USkeleton class="size-12 rounded-full" /><USkeleton class="h-4 w-44" />
      </div>
      <UTooltip v-else-if="kind === 'tooltip'" text="该任务每 30 分钟运行一次。"
        ><UButton variant="outline" class="w-fit">查看提示</UButton></UTooltip
      >
      <UBreadcrumb v-else-if="kind === 'breadcrumb'" :items="trail" />
      <UTree v-else-if="kind === 'tree'" :items="branches" />
      <UTimeline v-else-if="kind === 'timeline'" :items="events" />
      <UModal v-else-if="kind === 'modal'" title="任务详情">
        <UButton variant="outline" class="w-fit">打开弹窗</UButton>
        <template #body>该任务每 30 分钟运行一次。</template>
      </UModal>
      <UDrawer v-else-if="kind === 'drawer'" title="任务详情">
        <UButton variant="outline" class="w-fit">打开抽屉</UButton>
        <template #body>该任务每 30 分钟运行一次。</template>
      </UDrawer>
      <UCollapsible v-else-if="kind === 'collapsible'">
        <UButton variant="outline" class="w-fit">展开详情</UButton>
        <template #content
          ><div class="pt-2">该任务每 30 分钟运行一次。</div></template
        >
      </UCollapsible>
      <USlideover v-else-if="kind === 'slideover'" title="任务详情">
        <UButton variant="outline" class="w-fit">打开抽屉</UButton>
        <template #body>该任务每 30 分钟运行一次。</template>
      </USlideover>
      <UPopover v-else-if="kind === 'popover'">
        <UButton variant="outline" class="w-fit">打开面板</UButton>
        <template #content
          ><div class="p-4">该任务每 30 分钟运行一次。</div></template
        >
      </UPopover>
      <UEmpty v-else-if="kind === 'empty'" title="暂无运行记录" />
    </div>
  </UApp>
</template>
