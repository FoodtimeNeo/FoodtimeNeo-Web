import { onUnmounted, ref, watch } from 'vue';
import { useAuthStore } from '@/store/useAuthStore.js';
import { fetchCurrentNotice } from '@/api/notice.api.js';

// One check per authenticated identity in this page lifetime. No polling or route watchers.
export function useLoginNotice() {
  const auth = useAuthStore();
  const notice = ref(null);
  const error = ref('');
  const loading = ref(false);
  let generation = 0;
  let controller;
  let active = true;
  async function check() {
    if (!active || !auth.isAuthenticated) return;
    const ticket = ++generation;
    controller?.abort();
    controller = new AbortController();
    loading.value = true;
    error.value = '';
    try {
      const result = await fetchCurrentNotice({ signal: controller.signal });
      if (!active || ticket !== generation) return;
      if (
        result &&
        (typeof result.id !== 'string' || typeof result.content !== 'string')
      )
        throw new Error('公告响应格式异常');
      notice.value = result && !result.dontShowAgain ? result : null;
    } catch (failure) {
      if (active && ticket === generation)
        error.value = failure.message || '公告暂时无法加载';
    } finally {
      if (active && ticket === generation) loading.value = false;
    }
  }
  watch(
    () => auth.user?.id || '',
    () => {
      generation++;
      controller?.abort();
      notice.value = null;
      error.value = '';
      loading.value = false;
      if (auth.isAuthenticated) check();
    },
    { immediate: true, flush: 'sync' },
  );
  onUnmounted(() => {
    active = false;
    generation++;
    controller?.abort();
  });
  return {
    notice,
    error,
    loading,
    retry: check,
    close: () => {
      notice.value = null;
    },
  };
}
