<script setup lang="ts">
defineOptions({ inheritAttrs: false });
defineProps<{ name: string; icon: string }>();
</script>

<template>
  <main class="grid min-h-dvh place-items-center bg-elevated/30 p-5">
    <UCard v-bind="$attrs" class="w-full max-w-sm">
      <div class="mb-6 flex items-center gap-3">
        <img :src="icon" width="38" height="38" alt="" />
        <div>
          <h1 class="text-xl font-semibold">{{ name }}</h1>
          <p class="text-sm text-muted">登录管理界面</p>
        </div>
      </div>
      <slot />
      <div v-if="$slots.footer" class="mt-5">
        <slot name="footer" />
      </div>
    </UCard>
  </main>
</template>
