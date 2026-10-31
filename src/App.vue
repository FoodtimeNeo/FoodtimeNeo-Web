<script setup>
import { computed, provide, watch, onUnmounted } from 'vue';
import { RouterView } from 'vue-router';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import BlankLayout from '@/layouts/BlankLayout.vue';
import AdminLayout from '@/layouts/AdminLayout.vue';
import NoticeDialog from '@/components/NoticeDialog.vue';
import { useAuthStore } from '@/store/useAuthStore.js';
import { useInboxStore } from '@/store/useInboxStore.js';
import { useLoginNotice } from '@/composables/useLoginNotice.js';
import { fetchUnreadNoticeCount } from '@/api/notice.api.js';
import { fetchUnreadMessageCount } from '@/api/message.api.js';

const auth = useAuthStore();
const inbox = useInboxStore();
const loginNotice = useLoginNotice();
onUnmounted(() => {
  generation++;
});
const layouts = {
  blank: BlankLayout,
  admin: AdminLayout,
  default: DefaultLayout,
};
let generation = 0;
async function refreshInbox() {
  if (!auth.isAuthenticated) return;
  const ticket = ++generation;
  try {
    const [notices, messages] = await Promise.all([
      fetchUnreadNoticeCount(),
      fetchUnreadMessageCount(),
    ]);
    if (ticket === generation && auth.isAuthenticated)
      inbox.setUnreadCount(
        (notices?.unreadCount || 0) + (messages?.unreadCount || 0),
      );
  } catch {
    /* The inbox itself exposes retryable errors; login must remain usable. */
  }
}
provide('refreshInbox', refreshInbox);
watch(
  () => auth.user?.id || '',
  (id) => {
    generation++;
    if (id) {
      inbox.bind(id);
      refreshInbox();
    } else inbox.clear();
  },
  { immediate: true, flush: 'sync' },
);
const popupOpen = computed(() => Boolean(loginNotice.notice.value));
function closePopup(visible) {
  if (!visible) loginNotice.close();
}
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <component :is="layouts[route.meta.layout] ?? DefaultLayout">
      <component
        :is="Component"
        :key="route.fullPath + ':' + (auth.user?.id || 'guest')"
      />
    </component>
  </RouterView>
  <aside
    v-if="auth.isAuthenticated && loginNotice.error.value"
    class="notice-retry"
    role="status"
  >
    公告暂时无法加载
    <button
      type="button"
      :disabled="loginNotice.loading.value"
      @click="loginNotice.retry"
    >
      {{ loginNotice.loading.value ? '加载中…' : '重试' }}
    </button>
  </aside>
  <NoticeDialog
    :model-value="popupOpen"
    :notice="loginNotice.notice.value"
    @update:model-value="closePopup"
    @confirmed="refreshInbox"
  />
</template>

<style scoped>
.notice-retry {
  position: fixed;
  bottom: 80px;
  left: 16px;
  z-index: 2100;
  padding: 8px 12px;
  background: var(--zine-paper-card);
  border: 1px solid var(--ft-color-text);
}
.notice-retry button {
  min-height: 44px;
  margin-left: 12px;
}
</style>
