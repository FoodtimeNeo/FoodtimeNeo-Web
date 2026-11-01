import { onScopeDispose, ref, toValue, watch } from 'vue';
import { acquireMedia, mediaRevision, peekMedia } from '@/utils/mediaLoader.js';

export function useMediaSource(input, enabled = true) {
  const source = ref('');
  const failed = ref(false);
  const loading = ref(false);
  const attempt = ref(0);
  let release = () => {};
  let ticket = 0;
  const stop = watch(
    [() => toValue(input), () => toValue(enabled), mediaRevision, attempt],
    async ([url, active]) => {
      const current = ++ticket;
      release();
      // 会话内已加载过的图片同步展示，避免切换页面时先白屏再出现。
      source.value = peekMedia(url);
      failed.value = false;
      loading.value = Boolean(url && active);
      if (!url || !active || document.hidden) {
        loading.value = false;
        return;
      }
      const request = acquireMedia(url);
      release = request.release;
      try {
        const resolved = await request.promise;
        if (current === ticket) source.value = resolved;
      } catch {
        if (current === ticket) failed.value = true;
      } finally {
        if (current === ticket) loading.value = false;
      }
    },
    { immediate: true, flush: 'sync' },
  );
  onScopeDispose(() => {
    ticket++;
    stop();
    release();
  });
  return { source, failed, loading, retry: () => attempt.value++ };
}
