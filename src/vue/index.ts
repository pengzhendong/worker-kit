import { computed, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { isRequestCancelled, type createApiClient } from '../client';
/** Page-owned Vue state. The shared client owns identity changes and stale-response cancellation. */
export function useApiResource<T>(client: ReturnType<typeof createApiClient>, source: MaybeRefOrGetter<string>) {
  const data = shallowRef<T | null>(null), busy = ref(true), error = ref(''), revision = ref(0);
  const url = computed(() => toValue(source));
  watch([url, revision], async ([target], _, onCleanup) => {
    const controller = new AbortController(); onCleanup(() => controller.abort());
    busy.value = true; error.value = ''; data.value = null;
    try { data.value = await client<T>(target, { signal: controller.signal }); }
    catch (cause) { if (!isRequestCancelled(cause)) error.value = cause instanceof Error ? cause.message : '读取失败，请重试'; }
    finally { if (!controller.signal.aborted) busy.value = false; }
  }, { immediate: true });
  return { data, busy, error, refresh: () => { revision.value++; } };
}
