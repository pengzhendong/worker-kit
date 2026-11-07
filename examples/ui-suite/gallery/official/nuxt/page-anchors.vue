<script setup>
const example = {
  "links": [
    {
      "label": "Documentation",
      "icon": "i-lucide-book-open",
      "to": "#preview"
    },
    {
      "label": "Components",
      "icon": "i-lucide-box",
      "to": "#preview"
    },
    {
      "label": "Figma Kit",
      "icon": "i-lucide-circle-dot",
      "to": "#preview",
      "target": "_blank"
    },
    {
      "label": "Releases",
      "icon": "i-lucide-circle-dot",
      "to": "#preview",
      "target": "_blank"
    }
  ]
};
</script>

<template>
  <UPageAnchors v-bind="example" />
</template>
