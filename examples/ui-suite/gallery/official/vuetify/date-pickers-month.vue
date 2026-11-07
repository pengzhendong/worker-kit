<template>
  <v-row class="justify-center">
    <v-date-picker
      v-model="date"
      :allowed-dates="allowedMonths"
      class="mt-4"
      max="2019-10"
      min="2017-06"
      view-mode="months"
    ></v-date-picker>
  </v-row>
</template>

<script setup>
  import { ref } from 'vue'

  const date = ref('2017-12')
  const allowedMonths = (value) => {
    const month = value instanceof Date ? value.getMonth() + 1 : Number(String(value).split('-')[1]);
    return month % 2 === 0;
  }
</script>
