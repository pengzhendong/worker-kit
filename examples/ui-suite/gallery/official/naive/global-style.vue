<script setup>
import { onUnmounted, ref } from 'vue';
import {
  NConfigProvider,
  NGlobalStyle,
  NSwitch,
  darkTheme,
  lightTheme,
} from 'naive-ui';

const dark = ref(false);
const originalStyle = document.body.getAttribute('style');
onUnmounted(() => {
  if (originalStyle === null) document.body.removeAttribute('style');
  else document.body.setAttribute('style', originalStyle);
});
</script>

<template>
  <NConfigProvider :theme="dark ? darkTheme : lightTheme">
    <NGlobalStyle />
    <div class="global-style-controls">
      <label for="naive-global-dark">切换页面背景色</label>
      <NSwitch id="naive-global-dark" v-model:value="dark" />
    </div>
  </NConfigProvider>
</template>

<style scoped>
.global-style-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
</style>
