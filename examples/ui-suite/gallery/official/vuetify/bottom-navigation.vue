<template>
  <v-layout style="height: 56px;">
    <v-bottom-navigation
      v-model="value"
      color="primary"
      active
    >
      <v-btn>
        <v-icon :icon="mdiHistory" />

        Recents
      </v-btn>

      <v-btn>
        <v-icon :icon="mdiHeart" />

        Favorites
      </v-btn>

      <v-btn>
        <v-icon :icon="mdiMapMarker" />

        <span>Nearby</span>
      </v-btn>
    </v-bottom-navigation>
  </v-layout>
</template>

<script setup>
import { mdiHeart, mdiHistory, mdiMapMarker } from '@mdi/js'
  import { ref } from 'vue'

  const value = ref(0)
</script>
