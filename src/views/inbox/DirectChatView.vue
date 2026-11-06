<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  fetchConversation,
  fetchConversationMessages,
  hideConversation,
  markConversationRead,
  sendDirectMessage,
} from '@/api/directMessage.api.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import { formatTime } from '@/utils/recordLabels.js';
import MediaImage from '@/components/base/MediaImage.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const conversationId = String(route.params.conversationId || '');
const conversation = ref(null);
const messages = ref([]);
const loading = ref(true);
const error = ref('');
const sending = ref(false);
const actionError = ref('');
const draft = ref('');
const olderCursor = ref(null);
const loadingOlder = ref(false);
const listRef = ref(null);
let pollTimer;

const other = computed(() => conversation.value?.other || null);
const canSend = computed(() => draft.value.trim().length > 0 && !sending.value);

function isMine(message) {
  return message.senderId === auth.user?.id;
}

async function load({ quiet = false } = {}) {
  if (!quiet) {
    loading.value = true;
    error.value = '';
  }
  try {
    const [detail, page] = await Promise.all([
      fetchConversation(conversationId),
      fetchConversationMessages(conversationId),
    ]);
    conversation.value = detail;
    messages.value = page.items;
    olderCursor.value = page.nextCursor;
    await markRead();
    await nextTick();
    scrollToBottom();
  } catch (failure) {
    if (!quiet) error.value = failure.message || '私信加载失败';
  } finally {
    if (!quiet) loading.value = false;
  }
}

async function markRead() {
  try {
    await markConversationRead(conversationId);
  } catch {
    /* 已读失败不影响阅读，下次进入会重试。 */
  }
}

function scrollToBottom() {
  const element = listRef.value;
  if (element) element.scrollTop = element.scrollHeight;
}

async function loadOlder() {
  if (!olderCursor.value || loadingOlder.value) return;
  loadingOlder.value = true;
  try {
    const page = await fetchConversationMessages(conversationId, {
      cursor: olderCursor.value,
    });
    messages.value = [...page.items, ...messages.value];
    olderCursor.value = page.nextCursor;
  } catch (failure) {
    actionError.value = failure.message || '更早的消息加载失败';
  } finally {
    loadingOlder.value = false;
  }
}

async function send() {
  const content = draft.value.trim();
  if (!content || sending.value) return;
  if (content.length > 1000) {
    actionError.value = '消息不能超过1000字';
    return;
  }
  sending.value = true;
  actionError.value = '';
  try {
    const created = await sendDirectMessage(conversationId, {
      content,
      clientRequestId: crypto.randomUUID(),
    });
    draft.value = '';
    if (!messages.value.some((item) => item.id === created.id)) {
      messages.value = [...messages.value, created];
    }
    await nextTick();
    scrollToBottom();
  } catch (failure) {
    actionError.value = failure.message || '发送失败，请重试';
  } finally {
    sending.value = false;
  }
}

async function poll() {
  if (document.hidden) return;
  try {
    const page = await fetchConversationMessages(conversationId);
    const known = new Set(messages.value.map((item) => item.id));
    const incoming = page.items.filter((item) => !known.has(item.id));
    if (incoming.length) {
      messages.value = [...messages.value, ...incoming];
      await markRead();
      await nextTick();
      scrollToBottom();
    }
  } catch {
    /* 轮询失败静默，保留当前消息。 */
  }
}

async function removeConversation() {
  if (sending.value) return;
  try {
    await hideConversation(conversationId);
    await router.replace({ name: 'inboxView' });
  } catch (failure) {
    ElMessage.error(failure.message || '删除会话失败');
  }
}

onMounted(async () => {
  await load();
  pollTimer = window.setInterval(poll, 4000);
});
onUnmounted(() => window.clearInterval(pollTimer));
</script>

<template>
  <section class="chat-page">
    <button
      type="button"
      class="chat-page__back"
      @click="router.push({ name: 'inboxView' })"
    >
      ← 返回信箱
    </button>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error" @retry="load" />
    <template v-else>
      <header class="chat-page__head">
        <span class="chat-page__avatar">
          <MediaImage
            compact
            :src="other?.avatarUrl || ''"
            :alt="other?.displayName || '对方'"
            :empty="Array.from(other?.displayName?.trim() || '饭')[0]"
          />
        </span>
        <div>
          <h1>{{ other?.displayName || '私信' }}</h1>
          <p>私信 · 仅你们两人可见</p>
        </div>
        <button
          type="button"
          class="chat-page__remove"
          @click="removeConversation"
        >
          删除会话
        </button>
      </header>

      <div ref="listRef" class="chat-page__list" aria-live="polite">
        <button
          v-if="olderCursor"
          type="button"
          class="chat-page__older"
          :disabled="loadingOlder"
          @click="loadOlder"
        >
          {{ loadingOlder ? '加载中…' : '加载更早的消息' }}
        </button>
        <p v-if="!messages.length" class="chat-page__empty">
          还没有消息，发一句问候开始聊天吧。
        </p>
        <article
          v-for="message in messages"
          :key="message.id"
          class="chat-page__message"
          :class="{ 'is-mine': isMine(message) }"
        >
          <p>{{ message.content }}</p>
          <time>{{ formatTime(message.createdAt) }}</time>
        </article>
      </div>

      <p v-if="actionError" role="alert" class="chat-page__error">
        {{ actionError }}
      </p>
      <form class="chat-page__composer" @submit.prevent="send">
        <textarea
          v-model="draft"
          maxlength="1000"
          rows="2"
          placeholder="说点什么…"
          aria-label="私信内容"
        ></textarea>
        <button type="submit" :disabled="!canSend">
          {{ sending ? '发送中' : '发送' }}
        </button>
      </form>
    </template>
  </section>
</template>

<style scoped>
.chat-page {
  display: flex;
  max-width: 760px;
  min-height: 70vh;
  margin: auto;
  flex-direction: column;
  gap: 12px;
  padding: var(--ft-space-3);
}
.chat-page__back {
  align-self: flex-start;
  border: none;
  background: none;
  color: var(--ft-color-text-muted);
  cursor: pointer;
}
.chat-page__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--ft-color-border);
}
.chat-page__avatar {
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border: 1px solid var(--ft-color-border);
  border-radius: 50%;
}
.chat-page__avatar :deep(.media-image) {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.chat-page__head h1 {
  margin: 0;
  font-size: 22px;
}
.chat-page__head p {
  margin: 2px 0 0;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}
.chat-page__remove {
  margin-left: auto;
  border: 1px solid var(--ft-color-border);
  background: var(--zine-paper-card);
  color: var(--ft-color-text-muted);
  cursor: pointer;
}
.chat-page__list {
  display: flex;
  min-height: 320px;
  max-height: 58vh;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: 12px;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
}
.chat-page__older {
  align-self: center;
  border: none;
  background: none;
  color: var(--zine-stamp-red);
  cursor: pointer;
}
.chat-page__empty {
  margin: auto;
  color: var(--ft-color-text-muted);
}
.chat-page__message {
  max-width: 78%;
  align-self: flex-start;
  padding: 9px 12px;
  border: 1px solid var(--ft-color-secondary);
  border-radius: 4px 14px 14px 14px;
  background: #fff;
}
.chat-page__message.is-mine {
  align-self: flex-end;
  border-color: rgb(201 52 30 / 35%);
  border-radius: 14px 4px 14px 14px;
  background: rgb(255 244 238 / 92%);
}
.chat-page__message p {
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.chat-page__message time {
  display: block;
  margin-top: 4px;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-xs);
  text-align: right;
}
.chat-page__composer {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}
.chat-page__composer textarea {
  min-height: 56px;
  flex: 1;
  resize: vertical;
  padding: 10px;
  border: 1px solid var(--ft-color-border);
  background: var(--zine-paper-card);
  font: inherit;
}
.chat-page__composer button {
  min-height: 44px;
  padding: 0 22px;
  border: 1px solid var(--zine-stamp-red);
  background: var(--zine-stamp-red);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
.chat-page__composer button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.chat-page__error {
  margin: 0;
  color: var(--zine-stamp-red);
}
</style>
