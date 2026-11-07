<template>
  <div class="d-flex justify-space-around">
    <v-icon :icon="`svg:${mdiAccount}`"></v-icon>
    <v-icon :icon="`svg:${mdiPencil}`"></v-icon>
    <v-icon :icon="`svg:${mdiShareVariant}`"></v-icon>
    <v-icon :icon="`svg:${mdiDelete}`"></v-icon>
  </div>
</template>

<script setup>
  import { mdiAccount, mdiDelete, mdiPencil, mdiShareVariant } from '@mdi/js'
</script>
