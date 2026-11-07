<script setup>
const example = {
  "links": [
    {
      "label": "Edit this page",
      "icon": "i-lucide-file-pen",
      "to": "#preview"
    },
    {
      "label": "Star on GitHub",
      "icon": "i-lucide-star",
      "to": "#preview"
    },
    {
      "label": "Releases",
      "icon": "i-lucide-rocket",
      "to": "#preview"
    }
  ]
};
</script>

<template>
  <UPageLinks v-bind="example" />
</template>
