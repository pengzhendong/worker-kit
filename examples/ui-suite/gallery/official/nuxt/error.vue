<script setup>
const example = {
  "error": {
    "statusCode": 404,
    "statusMessage": "Page not found",
    "message": "The page you are looking for does not exist."
  },
  "class": "!min-h-96"
};
</script>

<template>
  <UError v-bind="example" />
</template>
