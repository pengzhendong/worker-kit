<template>
  <div class="gallery-row">
    <span v-for="color in ['primary', 'success', 'warning', 'danger', 'info']" :key="color" :style="{ background: 'var(--el-color-' + color + ')', color: 'var(--el-color-white)', borderRadius: '4px', padding: '8px 12px' }">{{ color }}</span>
  </div>
</template>
