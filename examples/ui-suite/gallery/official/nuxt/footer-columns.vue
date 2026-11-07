<script setup lang="ts">
import type { FooterColumn } from '@nuxt/ui'

const columns: FooterColumn[] = [{
  label: 'Community',
  children: [{
    label: 'Nuxters',
    to: '#preview',
    target: '_blank'
  }, {
    label: 'Video Courses',
    to: '#preview',
    target: '_blank'
  }, {
    label: 'Nuxt on GitHub',
    to: '#preview',
    target: '_blank'
  }]
}, {
  label: 'Solutions',
  children: [{
    label: 'Nuxt Content',
    to: '#preview',
    target: '_blank'
  }, {
    label: 'Nuxt DevTools',
    to: '#preview',
    target: '_blank'
  }, {
    label: 'Nuxt Image',
    to: '#preview',
    target: '_blank'
  }, {
    label: 'Nuxt UI',
    to: '#preview',
    target: '_blank'
  }]
}]
</script>

<template>
  <UFooterColumns :columns="columns">
    <template #right>
      <UFormField name="email" label="Subscribe to our newsletter" size="lg">
        <UInput type="email" class="w-full">
          <template #trailing>
            <UButton type="submit" size="xs" color="neutral" label="Subscribe" />
          </template>
        </UInput>
      </UFormField>
    </template>
  </UFooterColumns>
</template>
