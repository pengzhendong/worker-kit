<script setup>
const example = {
  "plans": [
    {
      "title": "Solo",
      "description": "Tailored for indie hackers.",
      "price": "$249",
      "features": [
        "One developer",
        "Lifetime access"
      ],
      "button": {
        "label": "Buy now"
      }
    },
    {
      "title": "Startup",
      "description": "Best suited for small teams.",
      "price": "$499",
      "features": [
        "Up to 5 developers",
        "Everything in Solo"
      ],
      "button": {
        "label": "Buy now"
      }
    },
    {
      "title": "Organization",
      "description": "Ideal for larger teams and organizations.",
      "price": "$999",
      "features": [
        "Up to 20 developers",
        "Everything in Startup"
      ],
      "button": {
        "label": "Buy now"
      }
    }
  ]
};
</script>

<template>
  <UPricingPlans v-bind="example" />
</template>
