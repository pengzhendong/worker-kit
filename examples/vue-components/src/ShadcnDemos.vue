<script setup lang="ts">
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Input } from './components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
import { Switch } from './components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './components/ui/dialog';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from './components/ui/table';
import { taskColumns, taskValue } from '../../ui-demo/component-fixtures';
import LibraryDemos from './LibraryDemos.vue';
defineProps<{ kind: string; title: string }>();
defineEmits<{ toggleTheme: [] }>();
</script>
<template>
  <LibraryDemos
    :kind="kind"
    :title="title"
    :button="Button"
    :card="Card"
    :input="Input"
    class="shadcn-demo"
    @toggle-theme="$emit('toggleTheme')"
  >
    <template #description="{ settings }">
      <textarea
        v-model="settings.description"
        rows="2"
        aria-label="说明"
        class="border-input rounded-md border bg-transparent px-3 py-2"
      />
    </template>
    <template #timezone="{ settings, timezones }">
      <Select v-model="settings.timezone">
        <SelectTrigger aria-label="显示时区"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="zone in timezones" :key="zone" :value="zone">{{
            zone
          }}</SelectItem>
        </SelectContent>
      </Select>
    </template>
    <template #retention="{ settings }">
      <Input
        :model-value="settings.retention ?? ''"
        type="number"
        min="1"
        max="90"
        aria-label="日志保留天数"
        @update:model-value="
          settings.retention = $event === '' ? null : Number($event)
        "
      />
    </template>
    <template #toggle="{ settings, field, label }">
      <Switch v-model="settings[field]" :aria-label="label" />
    </template>
    <template #filter="{ value, options, update }">
      <Select
        :model-value="value"
        @update:model-value="(item) => update(String(item))"
      >
        <SelectTrigger aria-label="任务状态筛选"><SelectValue /></SelectTrigger>
        <SelectContent
          ><SelectItem v-for="item in options" :key="item" :value="item">{{
            item
          }}</SelectItem></SelectContent
        >
      </Select>
    </template>
    <template #table="{ rows, run }">
      <Table class="min-w-[760px]">
        <TableHeader
          ><TableRow>
            <TableHead v-for="column in taskColumns" :key="column.key">{{
              column.title
            }}</TableHead>
            <TableHead>启用</TableHead><TableHead>操作</TableHead>
          </TableRow></TableHeader
        >
        <TableBody
          ><TableRow v-for="row in rows" :key="row.id">
            <TableCell v-for="column in taskColumns" :key="column.key">{{
              taskValue(row, column.key)
            }}</TableCell>
            <TableCell
              ><Switch v-model="row.enabled" :aria-label="'启用' + row.name"
            /></TableCell>
            <TableCell
              ><Button
                variant="ghost"
                :aria-label="'运行' + row.name"
                @click="run(row.id)"
                >运行</Button
              ></TableCell
            >
          </TableRow></TableBody
        >
      </Table>
    </template>
    <template #theme>
      <div class="workspace-actions demo-theme-row">
        <Button>主要按钮</Button><Button variant="outline">次要按钮</Button
        ><Button disabled>禁用按钮</Button>
      </div>
      <div class="workspace-actions demo-theme-row">
        <Badge class="bg-emerald-600 text-white">成功</Badge
        ><Badge class="bg-amber-300 text-black">警告</Badge
        ><Badge variant="destructive">错误</Badge>
      </div>
    </template>
    <template #dialog="{ open, confirming, close, confirm }">
      <Dialog :open="open" @update:open="(value) => !value && close()">
        <DialogContent
          ><DialogTitle>示例弹窗</DialogTitle
          ><DialogDescription>确认后显示演示结果。</DialogDescription
          ><DialogFooter
            ><Button variant="outline" @click="close">取消</Button
            ><Button @click="confirm">{{
              confirming ? '确认操作' : '完成操作'
            }}</Button></DialogFooter
          ></DialogContent
        >
      </Dialog>
    </template>
  </LibraryDemos>
</template>
<style scoped>
.shadcn-demo :deep([data-slot='card']),
.shadcn-demo[data-slot='card'] {
  padding: 16px;
}
</style>
