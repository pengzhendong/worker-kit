<template>
  <v-app class="gallery-v-app">
    <v-app-bar title="Application" density="compact" />
    <v-main><v-sheet class="pa-4">这是应用布局里的正文区域。</v-sheet></v-main>
  </v-app>
</template>
<style scoped>
.gallery-v-app :deep(.v-application__wrap) { min-height: 160px; }
</style>
