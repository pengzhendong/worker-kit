<script setup>
const example = {
  "title": "Introducing Nuxt Icon v1",
  "description": "Discover Nuxt Icon v1 - a modern, versatile, and customizable icon solution for your Nuxt projects.",
  "image": "/nuxt/favicon.svg",
  "date": "2024-11-25",
  "authors": [
    {
      "name": "Anthony Fu",
      "description": "antfu7",
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
  "class": "w-96"
};
</script>

<template>
  <UBlogPost v-bind="example" />
</template>
