<template>
  <v-sheet class="overflow-y-auto pa-3" max-height="220" border>
    <div style="height: 250px">向下滚动加载卡片</div>
    <v-lazy :options="{ threshold: 0.5 }" min-height="90">
      <v-card text="卡片已进入可视范围" />
    </v-lazy>
  </v-sheet>
</template>
