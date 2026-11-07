import {
  computed,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  shallowRef,
  watch,
} from 'vue';
import {
  createOperationsClient,
  formatTime,
  runLabel,
} from '../../ui-demo/operations';
export const workspaceIdentity = shallowRef<{
  id: string;
  name: string;
  permissions: string[];
} | null>(null);

// Business state is shared; each library renders its own native components.
export function useWorkspace() {
  const client = createOperationsClient();
  const state = shallowRef(client.snapshot());
  const unsubscribe = client.subscribe(() => {
    state.value = client.snapshot();
    workspaceIdentity.value = state.value.data?.user || null;
  });
  onMounted(() => client.refresh());
  onUnmounted(() => {
    unsubscribe();
    client.dispose();
    workspaceIdentity.value = null;
  });
  const management = computed(() => state.value.data?.management);
  const draft = reactive({
    task: 'check-bindings',
    minutes: 60,
    inputs: {} as Record<string, string>,
  });
  const definition = computed(() =>
    state.value.data?.definitions.find((item) => item.id === draft.task),
  );
  const manageTasks = computed(() =>
    state.value.data?.user.permissions.includes('tasks:manage'),
  );
  const values = reactive<Record<string, string | boolean | number>>({});
  watch(
    () => management.value?.settings,
    (saved) => {
      for (const key of Object.keys(values)) delete values[key];
      if (saved) Object.assign(values, saved.values);
    },
    { immediate: true },
  );
  const name = ref(''),
    days = ref(30),
    selected = ref(''),
    confirm = ref(false);
  const labels: Record<string, string> = {
    siteTitle: '站点名称',
    refreshSeconds: '刷新间隔（秒）',
    maintenance: '维护模式',
  };
  async function revoke() {
    await client.revokeKey(selected.value);
    if (!state.value.error) confirm.value = false;
  }
  return {
    client,
    state,
    management,
    draft,
    definition,
    manageTasks,
    values,
    name,
    days,
    selected,
    confirm,
    revoke,
    labels,
    formatTime,
    runLabel,
  };
}
