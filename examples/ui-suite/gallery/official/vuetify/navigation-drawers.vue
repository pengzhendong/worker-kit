<template>
  <v-card>
    <v-layout>
      <v-navigation-drawer
        v-model="drawer"
        :rail="rail"
        :rail-width="wider ? 80 : undefined"
        color="indigo"
        permanent
        @click="rail = false"
      >
        <v-list>
          <v-list-item
            prepend-avatar='/nuxt/media/coast.svg'
            title="John Leider"
          >
            <template v-slot:prepend>
              <v-avatar
                :class="{ 'mx-1': wider }"
                :size="(wider && rail) ? 40 : undefined"
              ></v-avatar>
            </template>
            <template v-slot:append>
              <v-btn
                :inert="rail"
                :icon="mdiChevronLeft"
                variant="text"
                @click.stop="rail = !rail"
              ></v-btn>
            </template>
          </v-list-item>
        </v-list>

        <v-divider></v-divider>

        <v-list density="compact" nav>
          <v-list-item
            v-for="item in items"
            :key="item.value"
            :class="{ 'pl-5': wider }"
            :prepend-icon="item.icon"
            :title="item.title"
            :value="item.value"
          ></v-list-item>
        </v-list>
      </v-navigation-drawer>

      <v-main style="height: 250px">
        <div class="ml-16">
          <v-switch
            v-model="wider"
            color="success"
            label="Wider (80px)"
          ></v-switch>
        </div>
      </v-main>
    </v-layout>
  </v-card>
</template>

<script setup>
import { mdiAccount, mdiAccountGroupOutline, mdiChevronLeft, mdiHomeCity } from '@mdi/js'
  import { ref } from 'vue'

  const drawer = ref(true)
  const rail = ref(true)
  const wider = ref(false)
  const items = [
    { icon: mdiHomeCity, title: 'Home', value: 'home' },
    { icon: mdiAccount, title: 'My Account', value: 'account' },
    { icon: mdiAccountGroupOutline, title: 'Users', value: 'users' },
  ]
</script>
