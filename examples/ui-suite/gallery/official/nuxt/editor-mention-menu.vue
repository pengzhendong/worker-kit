<script setup lang="ts">
import { ref } from "vue";
import type { EditorMentionMenuItem } from '@nuxt/ui'

const value = ref(`# Mention Menu

Type @ to mention someone and select from the list of available users.`)

const items: EditorMentionMenuItem[] = [{
  label: 'benjamincanac',
  avatar: {
    src: '/nuxt/media/coast.svg',
    loading: 'lazy' as const
  }
}, {
  label: 'atinux',
  avatar: {
    src: '/nuxt/media/coast.svg',
    loading: 'lazy' as const
  }
}, {
  label: 'danielroe',
  avatar: {
    src: '/nuxt/media/coast.svg',
    loading: 'lazy' as const
  }
}, {
  label: 'pi0',
  avatar: {
    src: '/nuxt/media/coast.svg',
    loading: 'lazy' as const
  }
}]

// SSR-safe function to append menus to body (avoids z-index issues in docs)
const appendToBody = () => document.body
</script>

<template>
  <UEditor
    v-slot="{ editor }"
    v-model="value"
    content-type="markdown"
    placeholder="Type @ to mention someone..."
    class="w-full min-h-21"
  >
    <UEditorMentionMenu :editor="editor" :items="items" :append-to="appendToBody" />
  </UEditor>
</template>
