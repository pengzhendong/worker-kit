<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items: NavigationMenuItem[] = [{
  label: 'Figma Kit',
  to: '#preview',
  target: '_blank'
}, {
  label: 'Playground',
  to: '#preview',
  target: '_blank'
}, {
  label: 'Releases',
  to: '#preview',
  target: '_blank'
}]
</script>

<template>
  <UFooter>
    <template #left>
      <p class="text-muted text-sm">
        Copyright © {{ new Date().getFullYear() }}
      </p>
    </template>

    <UNavigationMenu :items="items" variant="link" />

    <template #right>
      <UButton
        icon="i-lucide-link"
        color="neutral"
        variant="ghost"
        to='#preview'
        target="_blank"
        aria-label="Discord"
      />
      <UButton
        icon="i-lucide-link"
        color="neutral"
        variant="ghost"
        to='#preview'
        target="_blank"
        aria-label="X"
      />
      <UButton
        icon="i-lucide-link"
        color="neutral"
        variant="ghost"
        to='#preview'
        target="_blank"
        aria-label="GitHub"
      />
    </template>
  </UFooter>
</template>
