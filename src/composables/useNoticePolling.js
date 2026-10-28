import { computed, onUnmounted, ref, watch } from 'vue';
import { fetchNoticeFeed } from '@/api/notice.api.js';
import { useAuthStore } from '@/store/useAuthStore.js';

const POLL_INTERVAL_MS = 60000;

// 公告轮询：60s 间隔，切后台时跳过，仅登录态请求，卸载时清理定时器。
// 后端 feed 条目不暴露 seq（仅保证正序），游标保持 0 全量拉取，小红点以 unreadCount 为准。
export function useNoticePolling({ intervalMs = POLL_INTERVAL_MS } = {}) {
  const auth = useAuthStore();
  const sinceSeq = ref(0);
  const data = ref({ items: [], unreadCount: 0 });
  let controller, pending;
  let generation = 0,
    active = true;
  async function load() {
    if (!active || !auth.isAuthenticated || document.hidden) return;
    if (pending) return pending;
    const ticket = generation;
    controller = new AbortController();
    const task = fetchNoticeFeed(sinceSeq.value, 20, {
      signal: controller.signal,
    })
      .then((result) => {
        if (active && ticket === generation) data.value = result;
      })
      .catch(() => {})
      .finally(() => {
        if (pending === task) pending = null;
      });
    pending = task;
    return task;
  }

  const timer = setInterval(tick, intervalMs);
  onUnmounted(() => {
    active = false;
    generation++;
    controller?.abort();
    clearInterval(timer);
  });

  function tick() {
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!auth.isAuthenticated) return;
    load();
  }

  watch(
    () => `${auth.user?.id || ''}:${auth.user?.role || ''}`,
    () => {
      generation++;
      controller?.abort();
      pending = null;
      data.value = { items: [], unreadCount: 0 };
      if (auth.isAuthenticated) load();
    },
    { immediate: true },
  );

  return {
    noticesUnread: computed(() => data.value.unreadCount ?? 0),
    items: computed(() => data.value.items ?? []),
    refresh: load,
  };
}
