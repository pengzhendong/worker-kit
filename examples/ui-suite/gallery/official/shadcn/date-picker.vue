<script setup lang="ts">
import { ref } from 'vue'
import type { DateValue } from '@internationalized/date'
import { DateFormatter, getLocalTimeZone, today } from '@internationalized/date'

import { CalendarIcon } from '@lucide/vue'
import { cn } from 'cn'
import { Button } from './registry/button'
import { Calendar } from './registry/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './registry/popover'

const defaultPlaceholder = today(getLocalTimeZone())
const date = ref() as Ref<DateValue>

const df = new DateFormatter('en-US', {
  dateStyle: 'long',
})
</script>

<template>
  <Popover v-slot="{ close }">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="cn('w-[240px] justify-start text-left font-normal', !date && 'text-muted-foreground')"
      >
        <CalendarIcon />
        {{ date ? df.format(date.toDate(getLocalTimeZone())) : "Pick a date" }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        v-model="date"
        :default-placeholder="defaultPlaceholder"
        layout="month-and-year"
        initial-focus
        @update:model-value="close"
      />
    </PopoverContent>
  </Popover>
</template>
