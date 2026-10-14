import { getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue';
export function useAsyncData(
  loader,
  { immediate = true, initial = null } = {},
) {
  const data = shallowRef(initial);
  const error = ref(null);
  const loading = ref(false);
  let generation = 0;
  let active = true;
  let controller;
  async function load() {
    const current = ++generation;
    controller?.abort();
    controller = new AbortController();
    loading.value = true;
    error.value = null;
    try {
      const result = await loader({ signal: controller.signal });
      if (active && current === generation) data.value = result;
    } catch (failure) {
      if (
        active &&
        current === generation &&
        failure.code !== 'CANCELLED' &&
        failure.name !== 'AbortError'
      )
        error.value = failure;
    } finally {
      if (active && current === generation) loading.value = false;
    }
  }
  if (getCurrentScope())
    onScopeDispose(() => {
      active = false;
      generation += 1;
      controller?.abort();
    });
  if (immediate) load();
  return { data, error, loading, load };
}
