<template>
  <div>
    <p v-for="size in ['extra-large', 'large', 'medium', 'base', 'small', 'extra-small']" :key="size" :style="{ fontSize: 'var(--el-font-size-' + size + ')' }">Element Plus 字号 · {{ size }}</p>
  </div>
</template>
