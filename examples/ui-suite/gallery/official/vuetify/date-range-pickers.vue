<script setup>
import { ref } from 'vue';
import { VDateRangePicker } from 'vuetify/labs/components';
const dates = ref([]);
</script>
<template><VDateRangePicker v-model="dates" /></template>
