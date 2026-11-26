import {
  computed,
  getCurrentScope,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
} from 'vue';

const asyncDataCache = new Map();
const keyGenerations = new Map();
let globalGeneration = 0;

export function clearAsyncDataCache(key) {
  if (key) {
    asyncDataCache.delete(key);
    keyGenerations.set(key, (keyGenerations.get(key) || 0) + 1);
  } else {
    globalGeneration += 1;
    asyncDataCache.clear();
    keyGenerations.clear();
  }
}

export function useAsyncData(
  loader,
  { immediate = true, initial = null, cacheKey = null, ttl = 180000 } = {},
) {
  const cached = cacheKey ? asyncDataCache.get(toValue(cacheKey)) : null;
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
    const globalVersion = globalGeneration;
    const requestCacheKey = cacheKey ? toValue(cacheKey) : null;
    const keyVersion = requestCacheKey
      ? keyGenerations.get(requestCacheKey) || 0
      : 0;
    const isFreshGeneration = () =>
      globalVersion === globalGeneration &&
      (!requestCacheKey ||
        keyVersion === (keyGenerations.get(requestCacheKey) || 0));
    controller?.abort();
    controller = new AbortController();

    loading.value = true;
    error.value = null;

    try {
      const result = await loader({ signal: controller.signal });
      if (active && current === generation && isFreshGeneration()) {
        data.value = result;
        hasLoaded.value = true;
        if (requestCacheKey) {
          asyncDataCache.set(requestCacheKey, {
            data: result,
            timestamp: Date.now(),
          });
        }
      }
    } catch (failure) {
      if (
        active &&
        current === generation &&
        isFreshGeneration() &&
        failure.code !== 'CANCELLED' &&
        failure.name !== 'AbortError'
      ) {
        error.value = failure;
        if ([401, 403, 404].includes(failure.status)) {
          data.value = initial;
          hasLoaded.value = false;
          if (requestCacheKey) asyncDataCache.delete(requestCacheKey);
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
