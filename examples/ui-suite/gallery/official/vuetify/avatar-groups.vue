<template>
  <div class="d-flex flex-column ga-4 align-center py-3">
    <v-avatar-group
      v-for="{ size, gap } in sizeGroups"
      :key="size"
      :gap="gap"
      :items="items"
      :size="size"
    ></v-avatar-group>
  </div>
</template>

<script setup>
  const items = Array.from({ length: 5 })
    .map((_, i) => ({ image: '/nuxt/media/coast.svg' }))

  const sizeGroups = [
    { size: 'x-small', gap: -6 },
    { size: 'small', gap: -8 },
    { size: 'default', gap: -12 },
    { size: 'large', gap: -16 },
    { size: 'x-large', gap: -20 },
  ]
</script>
