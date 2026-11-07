<script setup>
const example = {
  "posts": [
    {
      "title": "Nuxt Icon v1",
      "description": "Discover Nuxt Icon v1!",
      "image": "/nuxt/favicon.svg",
      "date": "2024-11-25"
    },
    {
      "title": "Nuxt 3.14",
      "description": "Nuxt 3.14 is out!",
      "image": "/nuxt/favicon.svg",
      "date": "2024-11-04"
    },
    {
      "title": "Nuxt 3.13",
      "description": "Nuxt 3.13 is out!",
      "image": "/nuxt/favicon.svg",
      "date": "2024-08-22"
    }
  ]
};
</script>

<template>
  <UBlogPosts v-bind="example" />
</template>
