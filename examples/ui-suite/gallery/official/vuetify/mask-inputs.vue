<template>
  <div>
    <v-mask-input
      v-model="model"
      mask="phone"
      placeholder="(###) ### - ####"
    ></v-mask-input>
  </div>
</template>

<script setup>
import { VMaskInput } from 'vuetify/labs/components'
  import { shallowRef } from 'vue'

  const model = shallowRef(null)
</script>
