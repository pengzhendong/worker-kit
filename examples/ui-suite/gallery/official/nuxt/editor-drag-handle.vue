<script setup lang="ts">
import { ref } from "vue";
const value = ref(`# Drag Handle

把鼠标移到区块左侧，拖动手柄调整顺序。

第一个区块

第二个区块`)
</script>

<template>
  <UEditor
    v-slot="{ editor }"
    v-model="value"
    content-type="markdown"
    class="w-full min-h-21"
  >
    <UEditorDragHandle :editor="editor" />
  </UEditor>
</template>
