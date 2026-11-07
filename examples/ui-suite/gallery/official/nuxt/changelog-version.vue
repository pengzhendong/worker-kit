<script setup>
const example = {
  "title": "Introducing Nuxt UI v3",
  "description": "Nuxt UI v3 is out! After 1500+ commits, this major redesign brings improved accessibility, Tailwind CSS support, and full Vue compatibility.",
  "image": "/nuxt/favicon.svg",
  "date": "2025-03-12",
  "authors": [
    {
      "name": "Benjamin Canac",
      "description": "@benjamincanac",
      "avatar": {
        "src": "/nuxt/favicon.svg",
        "loading": "lazy"
      },
      "to": "#preview",
      "target": "_blank"
    },
    {
      "name": "Sebastien Chopin",
      "description": "@atinux",
      "avatar": {
        "src": "/nuxt/favicon.svg",
        "loading": "lazy"
      },
      "to": "#preview",
      "target": "_blank"
    },
    {
      "name": "Hugo Richard",
      "description": "@hugorcd",
      "avatar": {
        "src": "/nuxt/favicon.svg",
        "loading": "lazy"
      },
      "to": "#preview",
      "target": "_blank"
    }
  ],
  "to": "#preview",
  "target": "_blank",
  "class": "w-full",
  "ui.container": "max-w-lg"
};
</script>

<template>
  <UChangelogVersion v-bind="example" />
</template>
