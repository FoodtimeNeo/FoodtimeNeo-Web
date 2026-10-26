import { getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue';

const asyncDataCache = new Map();

export function clearAsyncDataCache(key) {
  if (key) {
    asyncDataCache.delete(key);
  } else {
    asyncDataCache.clear();
  }
}

export function useAsyncData(
  loader,
  { immediate = true, initial = null, cacheKey = null, ttl = 180000 } = {},
) {
  const cached = cacheKey ? asyncDataCache.get(cacheKey) : null;
  const isCacheValid = cached && ttl > 0 && Date.now() - cached.timestamp < ttl;

  const data = shallowRef(cached ? cached.data : initial);
  const error = ref(null);
  const loading = ref(false);
  let generation = 0;
  let active = true;
  let controller;

  async function load() {
    const current = ++generation;
    controller?.abort();
    controller = new AbortController();

    if (!cached) {
      loading.value = true;
    }
    error.value = null;

    try {
      const result = await loader({ signal: controller.signal });
      if (active && current === generation) {
        data.value = result;
        if (cacheKey) {
          asyncDataCache.set(cacheKey, {
            data: result,
            timestamp: Date.now(),
          });
        }
      }
    } catch (failure) {
      if (
        active &&
        current === generation &&
        failure.code !== 'CANCELLED' &&
        failure.name !== 'AbortError'
      ) {
        error.value = failure;
      }
    } finally {
      if (active && current === generation) {
        loading.value = false;
      }
    }
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      active = false;
      generation += 1;
      controller?.abort();
    });
  }

  if (immediate) {
    if (!isCacheValid) {
      load();
    }
  }

  function cancel() {
    generation++;
    controller?.abort();
    loading.value = false;
  }
  return { data, error, loading, load, cancel };
}
