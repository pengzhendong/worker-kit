<script setup>
const example = {
  "title": "Solo",
  "description": "For bootstrappers and indie hackers.",
  "price": "$249",
  "discount": "$199",
  "billing-cycle": "/month",
  "badge": "Most popular",
  "features": [
    "One developer",
    "Unlimited projects",
    "Access to GitHub repository",
    "Unlimited patch & minor updates",
    "Lifetime access"
  ],
  "button": {
    "label": "Buy now"
  },
  "class": "w-96"
};
</script>

<template>
  <UPricingPlan v-bind="example" />
</template>
