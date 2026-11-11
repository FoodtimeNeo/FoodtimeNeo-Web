import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useAuthStore } from '@/store/useAuthStore.js';
import { fetchCurrentNotices } from '@/api/notice.api.js';

// 登录公告：登录/恢复会话时检查一次；从后台回到前台或 bfcache 恢复时再检查。
// 同一页面生命周期内同一公告只弹一次，切换当前公告后仍会展示新公告。
export function useLoginNotice() {
  const auth = useAuthStore();
  const notice = ref(null);
  const error = ref('');
  const loading = ref(false);
  let generation = 0;
  let controller;
  let active = true;
  let foregroundTimer = null;
  // 本页面生命周期内已经展示过并被关闭的公告；页面刷新后重新开始。
  const delivered = new Set();
  let remaining = 0;

  async function check() {
    if (!active || !auth.isAuthenticated || loading.value) return;
    const ticket = ++generation;
    controller?.abort();
    controller = new AbortController();
    loading.value = true;
    error.value = '';
    try {
      const result = await fetchCurrentNotices({ signal: controller.signal });
      if (!active || ticket !== generation) return;
      if (
        !Array.isArray(result) ||
        result.length > 2 ||
        result.some(
          (row) =>
            !row ||
            typeof row.id !== 'string' ||
            typeof row.content !== 'string',
        ) ||
        new Set(result.map((row) => row.id)).size !== result.length
      )
        throw new Error('公告响应格式异常');
      const rows = result.filter(
        (row) => !row.dontShowAgain && !delivered.has(row.id),
      );
      remaining = Math.max(0, rows.length - 1);
      notice.value = rows[0] || null;
    } catch (failure) {
      if (active && ticket === generation && failure.code !== 'CANCELLED')
        error.value = failure.message || '公告暂时无法加载';
    } finally {
      if (active && ticket === generation) loading.value = false;
    }
  }

  // 从其他标签页/应用回到本页，或浏览器从 bfcache 恢复页面时，
  // 视为“重新打开”并补查一次当前公告。普通路由切换不会触发。
  function scheduleForegroundCheck() {
    if (!active || !auth.isAuthenticated || notice.value) return;
    if (foregroundTimer) clearTimeout(foregroundTimer);
    foregroundTimer = setTimeout(() => {
      foregroundTimer = null;
      check();
    }, 200);
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') scheduleForegroundCheck();
  }

  // 首次进入时由身份 watcher 检查；这里只处理 bfcache 恢复。
  function onPageShow(event) {
    if (event.persisted) scheduleForegroundCheck();
  }

  watch(
    () => auth.user?.id || '',
    (id) => {
      generation++;
      controller?.abort();
      if (foregroundTimer) clearTimeout(foregroundTimer);
      foregroundTimer = null;
      notice.value = null;
      error.value = '';
      loading.value = false;
      delivered.clear();
      remaining = 0;
      if (id && auth.isAuthenticated) check();
    },
    { immediate: true, flush: 'sync' },
  );

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
  });

  onUnmounted(() => {
    active = false;
    generation++;
    controller?.abort();
    if (foregroundTimer) clearTimeout(foregroundTimer);
    foregroundTimer = null;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pageshow', onPageShow);
  });

  return {
    notice,
    error,
    loading,
    retry: () => check(),
    close: () => {
      if (notice.value?.id) delivered.add(notice.value.id);
      notice.value = null;
      // Revalidate the second category with server time before showing it: it may have expired
      // while the first announcement was being read.
      if (remaining) {
        remaining = 0;
        check();
      }
    },
  };
}
