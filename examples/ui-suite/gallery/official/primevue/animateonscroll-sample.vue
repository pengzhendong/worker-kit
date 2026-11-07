<script setup>
import vAnimateOnScroll from 'primevue/animateonscroll';
</script>

<template>
  <div class="scroll-preview" tabindex="0" aria-label="滚动动画预览">
    <p class="intro">向下滚动，卡片进入视野时会出现。</p>
    <article
      v-for="(title, index) in ['个人', '团队', '企业']"
      :key="title"
      v-animate-on-scroll="{ enterClass: index === 1 ? 'enter-right' : 'enter-left', leaveClass: 'leave-card' }"
    >
      <strong>{{ title }}</strong>
    </article>
  </div>
</template>

<style scoped>
.scroll-preview {
  height: 14rem;
  overflow: auto;
  padding: 0.75rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.75rem;
}

.intro {
  min-height: 13rem;
}

article {
  margin-block-end: 1rem;
  padding: 2rem 1rem;
  border: 1px solid var(--p-content-border-color);
  border-radius: 0.75rem;
  background: var(--p-content-background);
  text-align: center;
}

.enter-left { animation: enter-left 380ms ease-out; }
.enter-right { animation: enter-right 380ms ease-out; }
.leave-card { animation: leave-card 220ms ease-in; }

@keyframes enter-left { from { opacity: 0; transform: translateX(-1rem); } }
@keyframes enter-right { from { opacity: 0; transform: translateX(1rem); } }
@keyframes leave-card { to { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .enter-left, .enter-right, .leave-card { animation-duration: 1ms; }
}
</style>
