<template>
  <v-layout style="height: 50px">
    <v-system-bar window>
      <v-icon class="me-2" :icon="mdiMessage"></v-icon>

      <span>10 unread messages</span>

      <v-spacer></v-spacer>

      <v-btn :icon="mdiMinus" variant="text"></v-btn>

      <v-btn class="ms-2" :icon="mdiCheckboxBlankOutline" variant="text"></v-btn>

      <v-btn class="ms-2" :icon="mdiClose" variant="text"></v-btn>
    </v-system-bar>
  </v-layout>
</template>

<script setup>
import { mdiCheckboxBlankOutline, mdiClose, mdiMessage, mdiMinus } from '@mdi/js'
</script>
