<script setup>
const example = {
  "title": "Beautiful Vue UI components",
  "description": "Nuxt UI provides a comprehensive suite of components and utilities to help you build beautiful and accessible web applications with Vue and Nuxt.",
  "headline": "Features",
  "features": [
    {
      "title": "Icons",
      "description": "Nuxt UI integrates with Nuxt Icon to access over 200,000+ icons from Iconify.",
      "icon": "i-lucide-smile",
      "to": "#preview"
    },
    {
      "title": "Fonts",
      "description": "Nuxt UI integrates with Nuxt Fonts to provide plug-and-play font optimization.",
      "icon": "i-lucide-a-large-small",
      "to": "#preview"
    },
    {
      "title": "Color Mode",
      "description": "Nuxt UI integrates with Nuxt Color Mode to switch between light and dark.",
      "icon": "i-lucide-sun-moon",
      "to": "#preview"
    }
  ]
};
</script>

<template>
  <UPageSection v-bind="example" />
</template>
