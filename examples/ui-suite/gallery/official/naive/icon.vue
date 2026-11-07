<script lang="ts" setup>
import { Gamepad as GameController, Gamepad2 as GameControllerOutline } from '@lucide/vue'
</script>

<template>
  <n-icon size="40">
    <GameControllerOutline />
  </n-icon>
  <n-icon size="40" color="#0e7a0d">
    <GameController />
  </n-icon>
  <n-icon size="40" :component="GameController" />
</template>
