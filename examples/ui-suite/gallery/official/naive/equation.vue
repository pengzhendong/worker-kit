<script lang="ts" setup>
import katex from 'katex'
import 'katex/dist/katex.min.css'

const equation = '\\displaystyle= \\frac{k(k+1)}{2}+k+1'
</script>

<template>
  <n-config-provider :katex="katex">
    <n-equation :value="equation" />
  </n-config-provider>
</template>
