<template>
  <div class="d-flex justify-center">
    <v-card elevation="2" rounded="xl" width="400">
      <v-card-item class="py-4">
        <v-skeleton-loader type="list-item-avatar-two-line"></v-skeleton-loader>
      </v-card-item>
      <v-card-text class="pb-4 px-6">
        <v-video
          :volume="50"
          actions="elapsed progress remaining volume"
          aspect-ratio="4 / 3"
          bg-color="transparent"
          color="orange"
          controls-transition="slide-y-transition"
          elevation="0"
          :image="'/nuxt/media/coast.svg'"
          progress-variant="wavy"
          rounded="xl"
          :src="'/nuxt/media/clip.mp4'"
          width="100%"
          detached
          eager
          floating
          no-fullscreen
        ></v-video>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { VVideo } from 'vuetify/labs/components'
</script>
