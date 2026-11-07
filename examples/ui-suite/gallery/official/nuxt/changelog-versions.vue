<script setup>
const example = {
  "versions": [
    {
      "title": "Nuxt 3.17",
      "description": "Nuxt 3.17 is out - bringing a major reworking of the async data layer, a new built-in component, better warnings, and performance improvements!",
      "image": "/nuxt/favicon.svg",
      "date": "2025-04-27",
      "to": "#preview",
      "target": "_blank",
      "ui.container": "max-w-lg"
    },
    {
      "title": "Nuxt 3.16",
      "description": "Nuxt 3.16 is out - packed with features and performance improvements!",
      "image": "/nuxt/favicon.svg",
      "date": "2025-03-07",
      "to": "#preview",
      "target": "_blank",
      "ui.container": "max-w-lg"
    },
    {
      "title": "Nuxt 3.15",
      "description": "Nuxt 3.15 is out - with Vite 6, better HMR and faster performance!",
      "image": "/nuxt/favicon.svg",
      "date": "2024-12-24",
      "to": "#preview",
      "target": "_blank",
      "ui.container": "max-w-lg"
    }
  ],
  "class": "w-full"
};
</script>

<template>
  <UChangelogVersions v-bind="example" />
</template>
