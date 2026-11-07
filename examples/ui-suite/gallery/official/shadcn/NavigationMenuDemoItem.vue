<script setup lang="ts">
import { NavigationMenuLink } from './registry/navigation-menu'

defineProps<{
  title: string
}>()

const emit = defineEmits<{ select: [title: string] }>()
</script>

<template>
  <li>
    <NavigationMenuLink as-child>
      <a href="#navigation-menu" @click.prevent="emit('select', title)">
        <div class="text-sm leading-none font-medium">
          {{ title }}
        </div>
        <p class="text-muted-foreground line-clamp-2 text-sm leading-snug">
          <slot />
        </p>
      </a>
    </NavigationMenuLink>
  </li>
</template>
