<script setup>
import serverMarkup from '#gallery-ssr-fixture';
</script>

<template>
  <div class="ssr-comparison">
    <div>
      <strong>服务器渲染结果</strong>
      <code>{{ serverMarkup }}</code>
    </div>
    <div>
      <strong>浏览器中</strong>
      <QNoSsr placeholder="服务器占位"><span>客户端已挂载</span></QNoSsr>
    </div>
  </div>
</template>

<style scoped>
.ssr-comparison {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
  gap: 0.75rem;
}
.ssr-comparison > div {
  display: grid;
  align-content: start;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid currentColor;
  border-radius: 0.5rem;
  overflow-wrap: anywhere;
}
</style>
