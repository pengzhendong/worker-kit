<script lang="ts" setup>
import { Wallet as CashIcon } from '@lucide/vue'
</script>

<template>
  <div style="height: 200px; transform: translate(0)">
    <n-float-button :right="0" :bottom="0" shape="square">
      <n-icon>
        <CashIcon />
      </n-icon>
    </n-float-button>
    <n-float-button :left="0" :bottom="0" shape="square">
      <n-icon>
        <CashIcon />
      </n-icon>
    </n-float-button>
    <n-float-button :right="0" :top="0">
      <n-icon>
        <CashIcon />
      </n-icon>
    </n-float-button>
    <n-float-button :left="0" :top="0">
      <n-icon>
        <CashIcon />
      </n-icon>
    </n-float-button>
  </div>
</template>
