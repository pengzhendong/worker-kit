<script setup lang="ts">
import NuxtWorkspace from '../../../ui-demo/NuxtWorkspace.vue';
const { root, session, checking, busy, error, form, scope, login, logout } =
  useHubSession();
const route = useRoute(),
  drawer = ref(false);
const storage = computed(() => route.query.tab === 'storage');
watch(
  () => route.fullPath,
  () => {
    drawer.value = false;
  },
);
</script>
<template>
  <UApp>
    <div
      v-if="checking"
      class="min-h-dvh grid place-items-center"
      role="status"
    >
      正在确认登录状态…
    </div>
    <main v-else-if="!session" class="min-h-dvh grid place-items-center p-5">
      <UCard class="w-full max-w-sm">
        <h1 class="text-xl font-semibold mb-2">NuxtHub 全栈示例</h1>
        <p class="text-muted text-sm mb-6">
          统一管理工作台与 NuxtHub 存储体验。界面使用 Nuxt
          UI，身份与管理功能复用 WorkerKit。
        </p>
        <UAlert v-if="error" color="error" :description="error" class="mb-5" />
        <UForm :state="form" class="space-y-4" @submit="login">
          <UFormField label="用户名"
            ><UInput
              v-model="form.username"
              autocomplete="username"
              required
              class="w-full"
          /></UFormField>
          <UFormField label="密码"
            ><UInput
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              required
              class="w-full"
          /></UFormField>
          <UButton type="submit" block :loading="busy">登录</UButton>
        </UForm>
        <UButton to="/" external variant="link" class="mt-4"
          >返回 WorkerKit</UButton
        >
      </UCard>
    </main>
    <UDashboardGroup v-else>
      <UDashboardSidebar
        v-model:open="drawer"
        :ui="{ header: 'h-16', body: 'px-3' }"
      >
        <template #header
          ><span class="font-semibold">WorkerKit · NuxtHub</span></template
        >
        <UNavigationMenu
          orientation="vertical"
          :items="[
            {
              label: '全栈工作台',
              icon: 'i-lucide-panels-top-left',
              to: '/',
              active: !storage,
            },
            {
              label: '存储示例',
              icon: 'i-lucide-database',
              to: '/?tab=storage',
              active: storage,
            },
          ]"
        />
        <template #footer
          ><UButton to="/" external variant="outline" block
            >返回方案选择</UButton
          ></template
        >
      </UDashboardSidebar>
      <UDashboardPanel>
        <template #header
          ><UDashboardNavbar title="NuxtHub"
            ><template #right
              ><span class="text-sm">{{ session.username }}</span
              ><UColorModeButton /><UButton
                color="neutral"
                variant="outline"
                @click="logout"
                >退出登录</UButton
              ></template
            ></UDashboardNavbar
          ></template
        >
        <template #body
          ><div class="page">
            <h1 class="text-2xl font-semibold mb-3">NuxtHub 全栈工作台</h1>
            <p class="text-muted mb-6">
              {{
                storage
                  ? '实际体验 NuxtHub 对数据库、配置、文件与缓存的访问。'
                  : '与其他工作台对齐：运行状态、配置、密钥、审计、任务与 API 文档。'
              }}
            </p>
            <UAlert
              v-if="error"
              color="error"
              :description="error"
              class="mb-5"
            />
            <StorageWorkbench v-if="storage" :scope="scope" />
            <NuxtWorkspace
              v-else
              :api-root="root + 'api/admin'"
              :login-url="root"
              :show-heading="false"
              :show-cms="false"
              :scope="scope"
            /></div
        ></template>
      </UDashboardPanel>
    </UDashboardGroup>
  </UApp>
</template>
