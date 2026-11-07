<script setup lang="ts">
import AspectRatio from './AspectRatio.vue'
</script>

<template>
  <AspectRatio :ratio="16 / 9" class="bg-muted rounded-lg">
    <img
      :src="'/shadcn/favicon.svg'"
      alt="Photo by Drew Beamer"
      fill
      class="h-full w-full rounded-lg object-contain dark:brightness-[0.2] dark:grayscale"
    >
  </AspectRatio>
</template>
