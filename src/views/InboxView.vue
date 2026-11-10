<script setup>
import { inject, ref } from 'vue';
import { useRouter } from 'vue-router';
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
import BackLink from '@/components/base/BackLink.vue';
import NoticeMarkdown from '@/components/NoticeMarkdown.vue';
import { noticeHeading } from '@/utils/noticeMarkdown.js';
import PaginationControls from '@/components/base/PaginationControls.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import {
  communityMessageTarget,
  isCommunityMessage,
} from '@/utils/messageLinks.js';
import {
  fetchConversations,
  fetchConversationUnread,
} from '@/api/directMessage.api.js';
import MediaImage from '@/components/base/MediaImage.vue';

const refreshInbox = inject('refreshInbox', () => {});
const router = useRouter();

const tab = ref('notices');

const notices = usePagedData(fetchOwnNotices);
const messages = usePagedData(fetchOwnMessages, { immediate: false });
const messageUnread = useAsyncData(async () => fetchUnreadMessageCount(), {
  initial: { unreadCount: 0 },
});
const conversations = usePagedData(fetchConversations, { immediate: false });
const conversationUnread = useAsyncData(async () => fetchConversationUnread(), {
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
    messages.data.value = {
      ...messages.data.value,
      items: messages.items.value.map((item) =>
        item.id === row.id ? { ...item, isRead: true } : item,
      ),
    };
    if (messageUnread.hasLoaded.value) {
      messageUnread.cancel();
      messageUnread.data.value = {
        unreadCount: Math.max(0, messageUnread.data.value.unreadCount - 1),
      };
    } else await messageUnread.load();
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
    messages.data.value = {
      ...messages.data.value,
      items: messages.items.value.map((item) => ({ ...item, isRead: true })),
    };
    messageUnread.cancel();
    messageUnread.data.value = { unreadCount: 0 };
    refreshInbox();
  } catch (error) {
    actionError.value = error.message || '全部标为已读失败';
  } finally {
    actingId.value = null;
  }
}

function messageCategoryLabel(row) {
  switch (row?.category) {
    case 'LIKE_POST':
      return '食记点赞';
    case 'LIKE_COMMENT':
      return '评论点赞';
    case 'COMMENT_POST':
      return '食记评论';
    case 'REPLY_COMMENT':
      return '评论回复';
    default:
      return row?.category || '系统消息';
  }
}

function messageIcon(row) {
  switch (row?.category) {
    case 'LIKE_POST':
    case 'LIKE_COMMENT':
      return '♥';
    case 'COMMENT_POST':
      return '💬';
    case 'REPLY_COMMENT':
      return '↩';
    default:
      return '🔔';
  }
}

function messageIconClass(row) {
  switch (row?.category) {
    case 'LIKE_POST':
    case 'LIKE_COMMENT':
      return 'is-like';
    case 'COMMENT_POST':
      return 'is-comment';
    case 'REPLY_COMMENT':
      return 'is-reply';
    default:
      return 'is-system';
  }
}

function selectTab(next) {
  tab.value = next;
  const state = { notices, messages, chats: conversations }[next];
  if (state && !state.hasLoaded.value && !state.loading.value) state.load();
}

function openConversation(row) {
  router.push({ name: 'directChat', params: { conversationId: row.id } });
}

function conversationInitial(row) {
  return Array.from(row?.other?.displayName?.trim() || '饭')[0];
}

async function openMessage(row) {
  if (actingId.value) return;
  if (!row.isRead) await readMessage(row);
  const target = communityMessageTarget(row);
  if (!target || !router) return;
  await router.push(target);
}
</script>

<template>
  <div class="inbox-page">
    <BackLink />
    <div class="section-rule">
      <span class="section-rule__index">08</span
      ><span class="section-rule__line"></span>
    </div>
    <h1 class="section-title">消息<span class="zine-highlight">信箱</span></h1>
    <RouterLink class="button-ink" :to="{ name: 'userSearch' }"
      >搜索用户</RouterLink
    >

    <div class="inbox-page__tabs" role="tablist" aria-label="信箱分类">
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'notices'"
        :class="{ 'is-active': tab === 'notices' }"
        @click="selectTab('notices')"
      >
        公告
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'messages'"
        :class="{ 'is-active': tab === 'messages' }"
        @click="selectTab('messages')"
      >
        系统消息
        <span v-if="(messageUnread.data.value?.unreadCount ?? 0) > 0">
          （{{ messageUnread.data.value.unreadCount }} 未读）
        </span>
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'chats'"
        :class="{ 'is-active': tab === 'chats' }"
        @click="selectTab('chats')"
      >
        私信
        <span v-if="(conversationUnread.data.value?.unreadCount ?? 0) > 0">
          （{{ conversationUnread.data.value.unreadCount }} 未读）
        </span>
      </button>
    </div>

    <p v-if="actionError" role="alert">{{ actionError }}</p>

    <section v-if="tab === 'notices'" aria-label="公告列表">
      <LoadingState v-if="notices.initialLoading.value" />
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
          <h2>{{ noticeHeading(row.content) || '系统公告' }}</h2>
          <p class="inbox-page__meta">{{ formatTime(row.publishedAt) }}</p>
          <div class="inbox-page__markdown">
            <NoticeMarkdown :content="row.content || ''" />
          </div>
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

    <section v-else-if="tab === 'messages'" aria-label="系统消息列表">
      <button
        v-if="messages.items.value.some((row) => !row.isRead)"
        type="button"
        :disabled="actingId !== null"
        @click="readAllMessages"
      >
        {{ actingId === 'all' ? '标记中' : '全部标为已读' }}
      </button>
      <LoadingState v-if="messages.initialLoading.value" />
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
          class="inbox-page__item inbox-page__message"
          :class="{
            'is-unread': !row.isRead,
            'is-community': isCommunityMessage(row),
          }"
          @click="isCommunityMessage(row) && openMessage(row)"
        >
          <div class="inbox-page__message-head">
            <span
              class="inbox-page__icon"
              :class="messageIconClass(row)"
              aria-hidden="true"
              >{{ messageIcon(row) }}</span
            >
            <div class="inbox-page__message-copy">
              <h2>
                <span
                  v-if="!row.isRead"
                  class="inbox-page__dot"
                  aria-label="未读"
                  >●</span
                >{{ row.title }}
              </h2>
              <p class="inbox-page__meta">
                {{ messageCategoryLabel(row) }} ·
                {{ formatTime(row.createdAt) }}
                <span v-if="row.actorCount > 1" class="inbox-page__count"
                  >{{ row.actorCount }}人</span
                >
              </p>
            </div>
          </div>
          <p class="inbox-page__preview">{{ row.body }}</p>
          <button
            v-if="isCommunityMessage(row)"
            type="button"
            :disabled="actingId !== null"
            @click.stop="openMessage(row)"
          >
            查看原帖
          </button>
          <button
            v-if="!row.isRead"
            type="button"
            :disabled="actingId !== null"
            @click.stop="readMessage(row)"
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

    <section v-else-if="tab === 'chats'" aria-label="私信会话列表">
      <LoadingState v-if="conversations.initialLoading.value" />
      <ErrorState
        v-else-if="conversations.error.value"
        :description="conversations.error.value.message"
        @retry="conversations.load"
      />
      <EmptyState
        v-else-if="!conversations.items.value.length"
        title="还没有私信"
        description="在社区食记或关注列表找到同学，点击「私信」开始聊天。"
      />
      <template v-else>
        <button
          v-for="row in conversations.items.value"
          :key="row.id"
          type="button"
          class="inbox-page__chat"
          @click="openConversation(row)"
        >
          <span class="inbox-page__chat-avatar">
            <MediaImage
              compact
              :src="row.other.avatarUrl || ''"
              :alt="row.other.displayName"
              :empty="conversationInitial(row)"
            />
          </span>
          <span class="inbox-page__chat-copy">
            <strong>{{ row.other.displayName }}</strong>
            <span>{{ row.lastMessage || '还没有消息，打个招呼吧' }}</span>
          </span>
          <span class="inbox-page__chat-meta">
            <time>{{ formatTime(row.updatedAt) }}</time>
            <span v-if="row.unreadCount > 0" class="inbox-page__chat-badge">
              {{ row.unreadCount > 99 ? '99+' : row.unreadCount }}
            </span>
          </span>
        </button>
      </template>
      <PaginationControls
        v-if="conversations.total.value > conversations.size.value"
        :page="conversations.page.value"
        :total="conversations.total.value"
        :size="conversations.size.value"
        :disabled="conversations.loading.value"
        @change="conversations.page.value = $event"
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
  background: rgb(255 244 238 / 92%);
}
.inbox-page__item.is-community {
  cursor: pointer;
}
.inbox-page__chat {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  padding: 12px 14px;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  text-align: left;
  cursor: pointer;
}
.inbox-page__chat:hover,
.inbox-page__chat:focus-visible {
  border-color: var(--zine-stamp-red);
}
.inbox-page__chat-avatar {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  overflow: hidden;
  border: 1px solid var(--ft-color-border);
  border-radius: 50%;
}
.inbox-page__chat-avatar :deep(.media-image) {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.inbox-page__chat-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}
.inbox-page__chat-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inbox-page__chat-copy span {
  overflow: hidden;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inbox-page__chat-meta {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-xs);
}
.inbox-page__chat-badge {
  min-width: 18px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--zine-stamp-red);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}
.inbox-page__message-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.inbox-page__message-copy {
  flex: 1;
  min-width: 0;
}
.inbox-page__icon {
  display: grid;
  place-items: center;
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  font-size: 18px;
  line-height: 1;
}
.inbox-page__icon.is-like {
  color: var(--zine-stamp-red);
  background: rgb(201 52 30 / 12%);
}
.inbox-page__icon.is-comment {
  color: #3f7291;
  background: rgb(63 114 145 / 14%);
}
.inbox-page__icon.is-reply {
  color: #5b7a3a;
  background: rgb(91 122 58 / 14%);
}
.inbox-page__icon.is-system {
  color: #b88924;
  background: rgb(184 137 36 / 14%);
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
.inbox-page__count {
  margin-left: 8px;
  color: var(--zine-stamp-red);
  font-weight: 700;
}
.inbox-page__preview {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
  overflow-wrap: anywhere;
}

/* 列表内直接渲染公告 Markdown，超出部分淡出，完整正文在详情弹窗中查看。 */
.inbox-page__markdown {
  max-height: 8rem;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, #000 72%, transparent);
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
