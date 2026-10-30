<script setup>
import { inject, ref } from 'vue';
import { usePagedData } from '@/composables/usePagedData.js';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchOwnNotices } from '@/api/notice.api.js';
import {
  fetchOwnMessages,
  fetchUnreadMessageCount,
  markAllMessagesRead,
  markMessageRead,
} from '@/api/message.api.js';
import { formatTime } from '@/utils/recordLabels.js';
import NoticeDialog from '@/components/NoticeDialog.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';

const refreshInbox = inject('refreshInbox', () => {});

const tab = ref('notices');

const notices = usePagedData(fetchOwnNotices);
const messages = usePagedData(fetchOwnMessages);
const messageUnread = useAsyncData(async () => fetchUnreadMessageCount(), {
  initial: { unreadCount: 0 },
});

const activeNotice = ref(null);
const noticeOpen = ref(false);
const actionError = ref('');
const actingId = ref(null);

function openNotice(row) {
  activeNotice.value = row;
  noticeOpen.value = true;
}

async function onNoticeRead() {
  await notices.load();
  refreshInbox();
}

async function readMessage(row) {
  if (actingId.value || row.isRead) return;
  actingId.value = row.id;
  actionError.value = '';
  try {
    await markMessageRead(row.id);
    await Promise.all([messages.load(), messageUnread.load()]);
    refreshInbox();
  } catch (error) {
    actionError.value = error.message || '标记已读失败';
  } finally {
    actingId.value = null;
  }
}

async function readAllMessages() {
  if (actingId.value) return;
  actingId.value = 'all';
  actionError.value = '';
  try {
    await markAllMessagesRead();
    await Promise.all([messages.load(), messageUnread.load()]);
    refreshInbox();
  } catch (error) {
    actionError.value = error.message || '全部标为已读失败';
  } finally {
    actingId.value = null;
  }
}
</script>

<template>
  <div class="inbox-page">
    <RouterLink :to="{ name: 'profile' }">返回我的</RouterLink>
    <div class="section-rule">
      <span class="section-rule__index">08</span
      ><span class="section-rule__line"></span>
    </div>
    <h1 class="section-title">消息<span class="zine-highlight">信箱</span></h1>

    <div class="inbox-page__tabs" role="tablist" aria-label="信箱分类">
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'notices'"
        :class="{ 'is-active': tab === 'notices' }"
        @click="tab = 'notices'"
      >
        公告
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'messages'"
        :class="{ 'is-active': tab === 'messages' }"
        @click="tab = 'messages'"
      >
        系统消息
        <span v-if="(messageUnread.data.value?.unreadCount ?? 0) > 0">
          （{{ messageUnread.data.value.unreadCount }} 未读）
        </span>
      </button>
    </div>

    <p v-if="actionError" role="alert">{{ actionError }}</p>

    <section v-if="tab === 'notices'" aria-label="公告列表">
      <LoadingState v-if="notices.loading.value" />
      <ErrorState
        v-else-if="notices.error.value"
        :description="notices.error.value.message"
        @retry="notices.load"
      />
      <EmptyState
        v-else-if="!notices.items.value.length"
        title="暂无公告"
        description="有新的全员公告时会显示在这里。"
      />
      <template v-else>
        <article
          v-for="row in notices.items.value"
          :key="row.id"
          class="inbox-page__item"
        >
          <h2>系统公告</h2>
          <p class="inbox-page__meta">{{ formatTime(row.publishedAt) }}</p>
          <p class="inbox-page__preview">{{ row.content }}</p>
          <button type="button" @click="openNotice(row)">查看详情</button>
        </article>
      </template>
      <PaginationControls
        v-if="notices.total.value > notices.size.value"
        :page="notices.page.value"
        :total="notices.total.value"
        :size="notices.size.value"
        :disabled="notices.loading.value"
        @change="notices.page.value = $event"
      />
    </section>

    <section v-else aria-label="系统消息列表">
      <button
        v-if="messages.items.value.some((row) => !row.isRead)"
        type="button"
        :disabled="actingId !== null"
        @click="readAllMessages"
      >
        {{ actingId === 'all' ? '标记中' : '全部标为已读' }}
      </button>
      <LoadingState v-if="messages.loading.value" />
      <ErrorState
        v-else-if="messages.error.value"
        :description="messages.error.value.message"
        @retry="messages.load"
      />
      <EmptyState
        v-else-if="!messages.items.value.length"
        title="暂无系统消息"
        description="审核结果、回复提醒等消息会显示在这里。"
      />
      <template v-else>
        <article
          v-for="row in messages.items.value"
          :key="row.id"
          class="inbox-page__item"
          :class="{ 'is-unread': !row.isRead }"
        >
          <h2>
            <span v-if="!row.isRead" class="inbox-page__dot" aria-label="未读"
              >●</span
            >{{ row.title }}
          </h2>
          <p class="inbox-page__meta">{{ formatTime(row.createdAt) }}</p>
          <p class="inbox-page__preview">{{ row.body }}</p>
          <button
            v-if="!row.isRead"
            type="button"
            :disabled="actingId !== null"
            @click="readMessage(row)"
          >
            {{ actingId === row.id ? '标记中' : '标为已读' }}
          </button>
        </article>
      </template>
      <PaginationControls
        v-if="messages.total.value > messages.size.value"
        :page="messages.page.value"
        :total="messages.total.value"
        :size="messages.size.value"
        :disabled="messages.loading.value || actingId !== null"
        @change="messages.page.value = $event"
      />
    </section>

    <NoticeDialog
      v-model="noticeOpen"
      :notice="activeNotice"
      @confirmed="onNoticeRead"
    />
  </div>
</template>

<style scoped>
.inbox-page {
  padding: var(--ft-space-3);
  max-width: 900px;
  margin: auto;
}
.inbox-page__tabs {
  display: flex;
  gap: 12px;
  margin: 16px 0 24px;
}
.inbox-page__tabs button {
  min-height: 44px;
  padding: 8px 20px;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  font-weight: 700;
  cursor: pointer;
}
.inbox-page__tabs button.is-active {
  color: var(--zine-stamp-red);
  border-color: var(--zine-stamp-red);
  box-shadow: 3px 3px 0 rgb(58 36 24 / 40%);
}
.inbox-page__item {
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
}
.inbox-page__item.is-unread {
  border-color: var(--zine-stamp-red);
}
.inbox-page__item h2 {
  margin: 0 0 4px;
  font-size: 18px;
}
.inbox-page__dot {
  color: var(--zine-stamp-red);
  margin-right: 6px;
}
.inbox-page__meta {
  margin: 0 0 8px;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}
.inbox-page__preview {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.inbox-page__item button {
  min-height: 44px;
  margin-top: 8px;
  padding: 8px 16px;
  border: 1px solid var(--ft-color-text);
  background: rgb(255 250 240 / 72%);
  cursor: pointer;
}
.inbox-page__item button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
