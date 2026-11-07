<script setup lang="ts">
import { reactive, useTemplateRef } from 'vue'
import { useToast } from '@nuxt/ui/composables'

const state = reactive({
  email: undefined,
  age: undefined
})

const form = useTemplateRef('form')

const toast = useToast()
function onSubmit() {
  toast.add({ title: 'Success', description: 'The form has been submitted.', color: 'success' })
}
</script>

<template>
  <div class="space-y-4">
    <UForm ref="form" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" required />
      </UFormField>

      <UFormField label="Age" name="age">
        <UInput v-model="state.age" type="number" min="18" max="100" required />
      </UFormField>
    </UForm>

    <UButton @click="form?.submit()">
      Submit
    </UButton>
  </div>
</template>
