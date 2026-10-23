<script setup>
import { ref, watch, nextTick } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import {
  fetchRootComments,
  fetchCommentReplies,
  createPostComment,
  deletePostComment,
} from '@/api/community.api.js';
import CommunityCommentItem from './CommunityCommentItem.vue';
const props = defineProps({ postId: { type: String, required: true } });
const emit = defineEmits(['changed']);
const roots = ref([]),
  threads = ref({}),
  hasMore = ref(false),
  cursor = ref(null);
const loading = ref(false),
  submitting = ref(false),
  error = ref(''),
  draft = ref(''),
  target = ref(null),
  input = ref(null);
let epoch = 0,
  requestId = crypto.randomUUID(),
  payloadKey = '';
async function replies(root, more = false, version = epoch) {
  const prior = threads.value[root.id];
  const page = await fetchCommentReplies(props.postId, root.id, {
    size: more ? 20 : 3,
    cursor: more ? prior?.nextCursor : undefined,
  });
  if (version !== epoch) return;
  threads.value[root.id] = {
    ...page,
    items: more ? [...(prior?.items || []), ...page.items] : page.items,
  };
}
async function load(more = false) {
  if (loading.value) return;
  const version = epoch;
  loading.value = true;
  error.value = '';
  try {
    const page = await fetchRootComments(props.postId, {
      cursor: more ? cursor.value : undefined,
    });
    if (version !== epoch) return;
    roots.value = more ? [...roots.value, ...page.items] : page.items;
    cursor.value = page.nextCursor;
    hasMore.value = page.hasMore;
    await Promise.all(
      page.items
        .filter((r) => r.status === 'approved')
        .map((r) => replies(r, false, version)),
    );
  } catch (e) {
    if (version === epoch) error.value = e.message || '评论加载失败';
  } finally {
    if (version === epoch) loading.value = false;
  }
}
watch(
  () => props.postId,
  () => {
    epoch++;
    loading.value = false;
    roots.value = [];
    threads.value = {};
    draft.value = '';
    target.value = null;
    requestId = crypto.randomUUID();
    payloadKey = '';
    load();
  },
  { immediate: true },
);
async function selectReply(item, root) {
  target.value = { item, root };
  await nextTick();
  input.value?.focus();
}
async function send() {
  if (submitting.value || !draft.value.trim()) return;
  if (draft.value.trim().length > 500) {
    error.value = '评论最多500字';
    return;
  }
  const body = { content: draft.value.trim() };
  if (target.value) {
    body.rootCommentId = target.value.root.id;
    body.replyToCommentId = target.value.item.id;
  }
  const key = JSON.stringify(body);
  if (payloadKey && payloadKey !== key) requestId = crypto.randomUUID();
  payloadKey = key;
  submitting.value = true;
  error.value = '';
  try {
    await createPostComment(props.postId, {
      ...body,
      clientRequestId: requestId,
    });
    draft.value = '';
    target.value = null;
    requestId = crypto.randomUUID();
    payloadKey = '';
    ElMessage.success('已提交审核，通过前仅自己可见');
    await load();
    emit('changed');
  } catch (e) {
    error.value = e.message || '提交失败，请重试';
  } finally {
    submitting.value = false;
  }
}
async function remove(item) {
  try {
    await ElMessageBox.confirm(
      '删除后无法恢复，已通过的楼内回复会保留。',
      '删除评论',
      { type: 'warning' },
    );
  } catch {
    return;
  }
  try {
    await deletePostComment(item.id);
    await load();
    emit('changed');
  } catch (e) {
    error.value = e.message || '删除失败';
  }
}
async function moreReplies(root) {
  try {
    await replies(root, true);
  } catch (e) {
    error.value = e.message || '回复加载失败';
  }
}
</script>
<template>
  <section class="community-comments" aria-label="评论与回复">
    <header>
      <h2>同学们的回应</h2>
      <button type="button" :disabled="loading" @click="load()">
        刷新评论
      </button>
    </header>
    <p v-if="error" role="alert">
      {{ error }} <button type="button" @click="load()">重试加载</button>
    </p>
    <p v-if="loading && !roots.length" role="status">评论加载中…</p>
    <p v-else-if="!roots.length">还没有评论，聊聊你的美食体验吧。</p>
    <div v-for="root in roots" :key="root.id" class="comment-thread">
      <CommunityCommentItem
        :item="root"
        @reply="selectReply($event, root)"
        @delete="remove"
        @updated="Object.assign(root, $event)"
      />
      <div v-if="threads[root.id]?.items.length" class="compact-replies">
        <CommunityCommentItem
          v-for="reply in threads[root.id].items"
          :key="reply.id"
          :item="reply"
          :allow-replies="!root.deleted"
          @reply="selectReply($event, root)"
          @delete="remove"
          @updated="Object.assign(reply, $event)"
        />
      </div>
      <button
        v-if="threads[root.id]?.hasMore"
        type="button"
        class="more-replies"
        @click="moreReplies(root)"
      >
        展开更多回复
      </button>
    </div>
    <button
      v-if="hasMore"
      type="button"
      :disabled="loading"
      @click="load(true)"
    >
      加载更多评论
    </button>
    <form class="comment-composer" @submit.prevent="send">
      <div v-if="target" class="reply-selection">
        回复 {{ target.item.author?.name || '同学' }}
        <button type="button" :disabled="submitting" @click="target = null">
          取消回复
        </button>
      </div>
      <label :for="`comment-${postId}`">{{
        target ? '楼内回复' : '发表评论'
      }}</label>
      <textarea
        :id="`comment-${postId}`"
        ref="input"
        v-model="draft"
        class="community-comments__textarea"
        maxlength="500"
        rows="3"
        :disabled="submitting"
        placeholder="分享真实、有用的美食体验"
      />
      <div class="composer-footer">
        <span>{{ draft.length }}/500 · 审核后公开</span
        ><button
          type="submit"
          class="community-comments__send-btn"
          :disabled="submitting || !draft.trim()"
        >
          {{ submitting ? '提交中…' : '提交评论' }}
        </button>
      </div>
    </form>
  </section>
</template>
<style scoped>
.community-comments {
  padding-top: 20px;
}
header,
.composer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
h2 {
  font-size: 19px;
  margin: 0;
}
button {
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--ft-color-primary, #c9341e);
  cursor: pointer;
  padding: 6px 10px;
}
button:disabled {
  opacity: 0.55;
  cursor: default;
}
.compact-replies {
  margin-left: 42px;
  padding: 0 12px;
  border-radius: 8px;
  background: var(--ft-color-bg, #f1ece2);
}
.comment-thread {
  border-bottom: 1px solid var(--ft-color-border);
}
.more-replies {
  margin-left: 42px;
}
.comment-composer {
  margin-top: 20px;
  display: grid;
  gap: 8px;
}
textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  padding: 12px;
  border: 1px solid var(--ft-color-border);
  border-radius: 8px;
  background: var(--zine-paper-card, #fffaf0);
  color: inherit;
  font: inherit;
}
.composer-footer {
  font-size: 12px;
  color: var(--ft-color-text-secondary, #706458);
}
.community-comments__send-btn {
  background: var(--ft-color-primary, #c9341e);
  color: white;
  border-radius: 6px;
  padding: 8px 16px;
}
.reply-selection {
  padding: 4px 10px;
  background: var(--ft-color-bg, #f1ece2);
  border-radius: 6px;
}
[role='alert'] {
  color: var(--ft-color-primary, #c9341e);
}
</style>
