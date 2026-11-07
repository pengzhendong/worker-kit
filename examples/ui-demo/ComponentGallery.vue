<script setup lang="ts">
import './component-gallery.css';

const src = import.meta.env.BASE_URL + 'gallery/?embed=1';
</script>

<template>
  <iframe class="component-gallery" :src="src" title="组件目录" />
</template>
