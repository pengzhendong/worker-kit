<script setup lang="ts">
import { shallowRef } from 'vue'
import type { DateRange } from 'reka-ui'
import { getLocalTimeZone, today } from '@internationalized/date'
import { RangeCalendar } from './registry/range-calendar'

const start = today(getLocalTimeZone())
const end = start.add({ days: 7 })

const dateRange = shallowRef<DateRange>({
  start,
  end,
})
</script>

<template>
  <RangeCalendar
    v-model="dateRange"
    class="rounded-md border shadow-sm"
    :number-of-months="1"
    disable-days-outside-current-view
  />
</template>
