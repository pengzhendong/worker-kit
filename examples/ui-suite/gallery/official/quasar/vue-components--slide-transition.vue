<template>
  <div class="q-pa-md" style="max-width: 500px">
    <q-toggle v-model="visible" label="Visible image" class="q-mb-md" />

    <q-slide-transition>
      <div v-show="visible">
        <img
          alt="Quasar"
          class="responsive"
          :src="'/quasar/favicon.svg'"
        />
      </div>
    </q-slide-transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const visible = ref(true)
</script>
