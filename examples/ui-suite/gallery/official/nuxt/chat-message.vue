<script setup>
const example = {
  "parts": [
    {
      "type": "text",
      "id": "1",
      "text": "Hello! Tell me more about building AI chatbots with Nuxt UI."
    }
  ],
  "side": "right",
  "variant": "soft",
  "role": "user",
  "id": "1",
  "avatar": {
    "src": "/nuxt/favicon.svg",
    "loading": "lazy"
  }
};
</script>

<template>
  <UChatMessage v-bind="example" />
</template>
