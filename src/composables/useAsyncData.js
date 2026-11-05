import {
  computed,
  getCurrentScope,
  onScopeDispose,
  ref,
  shallowRef,
} from 'vue';

const asyncDataCache = new Map();
let cacheGeneration = 0;

export function clearAsyncDataCache(key) {
  cacheGeneration += 1;
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
  const hasLoaded = ref(Boolean(cached));
  const initialLoading = computed(() => loading.value && !hasLoaded.value);
  let generation = 0;
  let active = true;
  let controller;

  async function load() {
    if (!active) return;
    const current = ++generation;
    const cacheVersion = cacheGeneration;
    controller?.abort();
    controller = new AbortController();

    loading.value = true;
    error.value = null;

    try {
      const result = await loader({ signal: controller.signal });
      if (
        active &&
        current === generation &&
        cacheVersion === cacheGeneration
      ) {
        data.value = result;
        hasLoaded.value = true;
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
        cacheVersion === cacheGeneration &&
        failure.code !== 'CANCELLED' &&
        failure.name !== 'AbortError'
      ) {
        error.value = failure;
        if ([401, 403, 404].includes(failure.status)) {
          data.value = initial;
          hasLoaded.value = false;
          if (cacheKey) asyncDataCache.delete(cacheKey);
        }
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
  return { data, error, loading, initialLoading, hasLoaded, load, cancel };
}
