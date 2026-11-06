<script setup lang="ts">
import NuxtWorkspace from '../../../ui-demo/NuxtWorkspace.vue';
import { base } from '../api';
</script>
<template>
  <div class="page">
    <NuxtWorkspace
      :api-root="base + '/api'"
      :login-url="base + '/'"
      :show-management="false"
      :show-cms="false"
    />
  </div>
</template>
