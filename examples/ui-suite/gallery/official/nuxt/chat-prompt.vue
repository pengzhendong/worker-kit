<script setup lang="ts">

import { ref } from 'vue'
import type { SelectItem } from '@nuxt/ui'

const input = ref('')
const model = ref('claude-opus-5.5')

const models = [
  { label: 'Claude Opus 5.5', value: 'claude-opus-5.5', icon: 'i-lucide-circle-dot' },
  { label: 'Gemini 3 Pro', value: 'gemini-3-pro', icon: 'i-lucide-circle-dot' },
  { label: 'GPT-5', value: 'gpt-5', icon: 'i-lucide-circle-dot' }
] satisfies SelectItem[]

function onSubmit() {
  input.value = ''
}
</script>

<template>
  <UChatPrompt v-model="input" class="w-full" @submit="onSubmit">
    <template #footer>
      <UButton icon="i-lucide-plus" color="neutral" variant="ghost" size="sm" />

      <div class="flex items-center gap-1.5">
        <USelect
          v-model="model"
          :items="models"
          :icon="models.find(item => item.value === model)?.icon"
          placeholder="Select a model"
          variant="ghost"
          size="sm"
          square
        />

        <UChatPromptSubmit size="sm" />
      </div>
    </template>
  </UChatPrompt>
</template>
