import { computed, onUnmounted, ref, watch } from 'vue';
import { useAsyncData } from './useAsyncData.js';
import { fetchNoticeFeed } from '@/api/notice.api.js';
import { useAuthStore } from '@/store/useAuthStore.js';

const POLL_INTERVAL_MS = 60000;

// 公告轮询：60s 间隔，切后台时跳过，仅登录态请求，卸载时清理定时器。
// 后端 feed 条目不暴露 seq（仅保证正序），游标保持 0 全量拉取，小红点以 unreadCount 为准。
export function useNoticePolling({ intervalMs = POLL_INTERVAL_MS } = {}) {
  const auth = useAuthStore();
  const sinceSeq = ref(0);
  const state = useAsyncData(
    (options) => fetchNoticeFeed(sinceSeq.value, 20, options),
    { immediate: false, initial: { items: [], unreadCount: 0 } },
  );

  const timer = setInterval(tick, intervalMs);
  onUnmounted(() => clearInterval(timer));

  function tick() {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!auth.isAuthenticated) return;
    state.load();
  }

  if (auth.isAuthenticated) state.load();
  watch(
    () => auth.isAuthenticated,
    (loggedIn) => {
      if (loggedIn) state.load();
    },
  );

  return {
    noticesUnread: computed(() => state.data.value.unreadCount ?? 0),
    items: computed(() => state.data.value.items ?? []),
    refresh: () => state.load(),
  };
}
