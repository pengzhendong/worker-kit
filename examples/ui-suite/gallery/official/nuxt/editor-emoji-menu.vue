<script setup lang="ts">
import { ref } from 'vue';
import type { EditorEmojiMenuItem } from '@nuxt/ui';
import { Emoji } from '@tiptap/extension-emoji';

const value = ref(`# Emoji Menu

Type : to insert emojis and select from the list of available emojis.`);

const items: EditorEmojiMenuItem[] = [
  {
    name: 'smile',
    emoji: '😄',
    shortcodes: ['smile'],
    tags: ['happy'],
    group: 'faces',
  },
  {
    name: 'rocket',
    emoji: '🚀',
    shortcodes: ['rocket'],
    tags: ['launch'],
    group: 'travel',
  },
  {
    name: 'tada',
    emoji: '🎉',
    shortcodes: ['tada'],
    tags: ['party'],
    group: 'activities',
  },
  {
    name: 'thumbsup',
    emoji: '👍',
    shortcodes: ['thumbsup'],
    tags: ['like'],
    group: 'people',
  },
];
const emoji = Emoji.configure({ emojis: items });

// SSR-safe function to append menus to body (avoids z-index issues in docs)
const appendToBody = () => document.body;
</script>

<template>
  <UEditor
    v-slot="{ editor }"
    v-model="value"
    :extensions="[emoji]"
    content-type="markdown"
    placeholder="Type : to add emojis..."
    class="w-full min-h-21"
  >
    <UEditorEmojiMenu
      :editor="editor"
      :items="items"
      :append-to="appendToBody"
    />
  </UEditor>
</template>
