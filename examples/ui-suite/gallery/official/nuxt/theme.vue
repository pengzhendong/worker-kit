<template>
  <div class="grid gap-3">
    <UButton label="默认按钮" />
    <UTheme
      :props="{
        button: { color: 'neutral', variant: 'outline' },
        input: { size: 'lg' },
      }"
      :ui="{
        button: { base: 'rounded-full' },
        input: { base: 'rounded-full' },
      }"
    >
      <div class="flex flex-wrap items-center gap-2">
        <UButton label="主题范围内的按钮" />
        <UInput placeholder="主题范围内的输入框" />
      </div>
    </UTheme>
  </div>
</template>
