<script setup>
import { ref } from 'vue';
const value = ref('<p>选择文字，再用工具栏设置样式。</p>');
const items = [[{ kind: 'mark', mark: 'bold', icon: 'i-lucide-bold' }, { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic' }], [{ kind: 'undo', icon: 'i-lucide-undo' }, { kind: 'redo', icon: 'i-lucide-redo' }]];
</script>
<template>
  <UEditor v-slot="{ editor }" v-model="value" content-type="html" class="min-h-32 rounded-lg border border-default">
    <UEditorToolbar :editor="editor" :items="items" />
  </UEditor>
</template>
