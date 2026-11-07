<script setup>
import { ref } from 'vue';
import {
  FlexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table';
import { Button } from '../../vue-components/src/components/ui/button';
import { Input } from '../../vue-components/src/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../vue-components/src/components/ui/table';

const data = [
  { name: '苹果', quantity: 12 },
  { name: '橙子', quantity: 8 },
  { name: '香蕉', quantity: 5 },
  { name: '梨', quantity: 16 },
  { name: '葡萄', quantity: 9 },
  { name: '西瓜', quantity: 3 },
];
const columns = [
  { accessorKey: 'name', header: '名称' },
  { accessorKey: 'quantity', header: '数量' },
];
const table = useVueTable({
  data,
  columns,
  initialState: { pagination: { pageSize: 3 } },
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
});
const filter = ref('');
function search(value) {
  filter.value = value;
  table.getColumn('name').setFilterValue(value);
}
</script>

<template>
  <div class="grid gap-3">
    <Input
      :model-value="filter"
      aria-label="筛选名称"
      placeholder="筛选名称"
      @update:model-value="search"
    />
    <Table>
      <TableHeader>
        <TableRow v-for="group in table.getHeaderGroups()" :key="group.id">
          <TableHead
            v-for="header in group.headers"
            :key="header.id"
            :aria-sort="
              header.column.getIsSorted() === 'asc'
                ? 'ascending'
                : header.column.getIsSorted() === 'desc'
                  ? 'descending'
                  : 'none'
            "
          >
            <Button
              variant="ghost"
              size="sm"
              @click="header.column.getToggleSortingHandler()?.($event)"
            >
              {{ header.column.columnDef.header }}
              <span aria-hidden="true">{{
                header.column.getIsSorted() === 'asc'
                  ? '↑'
                  : header.column.getIsSorted() === 'desc'
                    ? '↓'
                    : '↕'
              }}</span>
            </Button>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
          <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
            <FlexRender
              :render="cell.column.columnDef.cell"
              :props="cell.getContext()"
            />
          </TableCell>
        </TableRow>
        <TableRow v-if="!table.getRowModel().rows.length">
          <TableCell :colspan="columns.length">没有符合条件的数据</TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <div class="gallery-row">
      <Button
        size="sm"
        variant="outline"
        :disabled="!table.getCanPreviousPage()"
        @click="table.previousPage()"
        >上一页</Button
      >
      <Button
        size="sm"
        variant="outline"
        :disabled="!table.getCanNextPage()"
        @click="table.nextPage()"
        >下一页</Button
      >
    </div>
  </div>
</template>
