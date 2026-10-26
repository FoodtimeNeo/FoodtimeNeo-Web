<script setup>
import { computed, provide, ref, watch } from 'vue';
import { RouterView } from 'vue-router';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import BlankLayout from '@/layouts/BlankLayout.vue';
import AdminLayout from '@/layouts/AdminLayout.vue';
import NoticeDialog from '@/components/NoticeDialog.vue';
import { useAuthStore } from '@/store/useAuthStore.js';
import { useInboxStore } from '@/store/useInboxStore.js';
import { useNoticePolling } from '@/composables/useNoticePolling.js';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchUnreadMessageCount } from '@/api/message.api.js';

const auth = useAuthStore();
const inbox = useInboxStore();
const popupQueue = ref([]);

const layouts = {
  blank: BlankLayout,
  admin: AdminLayout,
  default: DefaultLayout,
};

// 公告轮询：仅登录态请求；items 供新公告弹窗队列使用，未读数供红点使用。
const {
  noticesUnread,
  items: feedItems,
  refresh: refreshNotices,
} = useNoticePolling();
const messageUnread = useAsyncData(async () => fetchUnreadMessageCount(), {
  immediate: false,
  initial: { unreadCount: 0 },
});
const messageUnreadCount = computed(() => {
  const data = messageUnread.data.value;
  if (typeof data === 'number') return data;
  return data?.unreadCount ?? 0;
});

function refreshInbox() {
  if (!auth.isAuthenticated) return;
  refreshNotices();
  messageUnread.load();
}
provide('refreshInbox', refreshInbox);

// 按用户绑定水位：切号、退出时隔离，弹窗队列一并清空。
watch(
  () => auth.user?.id,
  (id) => {
    popupQueue.value = [];
    if (id) {
      inbox.bind(id);
      refreshInbox();
    } else {
      inbox.clear();
    }
  },
  { immediate: true },
);

// 未读总数 = 公告未读 + 消息未读，同步进 store 供红点使用。
watch([noticesUnread, messageUnreadCount], ([noticeCount, msgCount]) => {
  inbox.setUnreadCount((Number(noticeCount) || 0) + (Number(msgCount) || 0));
});

// 新公告弹窗队列：feed 按 seq 正序，水位之后的新条目逐条展示；
// 首次建立基线时静默记录水位，避免登录即连环弹窗。
const popupOpen = computed(() => popupQueue.value.length > 0);
const popupNotice = computed(() => popupQueue.value[0] ?? null);

watch(feedItems, (list) => {
  if (!auth.isAuthenticated || !Array.isArray(list) || list.length === 0)
    return;
  if (!inbox.lastSeenNoticeId) {
    inbox.setLastSeenNoticeId(list[list.length - 1].id);
    return;
  }
  const index = list.findIndex((item) => item.id === inbox.lastSeenNoticeId);
  const fresh = index === -1 ? list : list.slice(index + 1);
  const queued = new Set(popupQueue.value.map((item) => item.id));
  for (const item of fresh) {
    if (!queued.has(item.id)) {
      popupQueue.value.push(item);
      queued.add(item.id);
    }
  }
  inbox.setLastSeenNoticeId(list[list.length - 1].id);
});

function onPopupRead() {
  refreshNotices();
}

function onPopupClose(visible) {
  if (!visible) popupQueue.value.shift();
}
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <component :is="layouts[route.meta.layout] ?? DefaultLayout">
      <component
        :is="Component"
        :key="`${route.fullPath}:${auth.user?.id || 'guest'}`"
      />
    </component>
  </RouterView>
  <NoticeDialog
    :model-value="popupOpen"
    :notice="popupNotice"
    @update:model-value="onPopupClose"
    @read="onPopupRead"
  />
</template>
