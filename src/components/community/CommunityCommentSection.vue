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
const emit = defineEmits(['changed', 'replyTargetChange']);
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
// 重新获取已展开的范围，继续使用服务端游标；不把长讨论收回第一页。
async function loadedPage(fetchPage, count) {
  const items = [];
  let page;
  do {
    page = await fetchPage({
      size: Math.min(100, count - items.length),
      cursor: page?.nextCursor,
    });
    items.push(...page.items);
  } while (page.hasMore && items.length < count);
  return { ...page, items };
}
async function replies(root, more = false, version = epoch, preserve = false) {
  const prior = threads.value[root.id];
  const postId = props.postId;
  const fetchPage = (params) => fetchCommentReplies(postId, root.id, params);
  const page =
    preserve && prior
      ? await loadedPage(
          fetchPage,
          Math.max(3, prior.items.length + (prior.hasMore ? 0 : 1)),
        )
      : await fetchPage({
          size: more ? 20 : 3,
          cursor: more ? prior?.nextCursor : undefined,
        });
  if (version !== epoch) return;
  threads.value[root.id] = {
    ...page,
    items: more ? [...(prior?.items || []), ...page.items] : page.items,
  };
}
async function load(more = false, preserve = false, newRoot = false) {
  if (loading.value) return;
  const version = epoch;
  loading.value = true;
  error.value = '';
  try {
    const postId = props.postId;
    const page = preserve
      ? await loadedPage(
          (params) => fetchRootComments(postId, params),
          Math.max(20, roots.value.length + (newRoot ? 1 : 0)),
        )
      : await fetchRootComments(postId, {
          cursor: more ? cursor.value : undefined,
        });
    if (version !== epoch) return;
    roots.value = more ? [...roots.value, ...page.items] : page.items;
    cursor.value = page.nextCursor;
    hasMore.value = page.hasMore;
    await Promise.all(
      page.items
        .filter((r) => r.status === 'approved')
        .map((r) => replies(r, false, version, preserve)),
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
    submitting.value = false;
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
  emit('replyTargetChange', { item, root });
  await nextTick();
  input.value?.focus();
}
async function send() {
  if (submitting.value || loading.value || !draft.value.trim()) return;
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
  const version = epoch;
  if (payloadKey && payloadKey !== key) requestId = crypto.randomUUID();
  payloadKey = key;
  submitting.value = true;
  error.value = '';
  try {
    await createPostComment(props.postId, {
      ...body,
      clientRequestId: requestId,
    });
    if (version !== epoch) return;
    draft.value = '';
    target.value = null;
    requestId = crypto.randomUUID();
    payloadKey = '';
    ElMessage.success('已提交审核，通过前仅自己可见');
    await load(false, true, !body.rootCommentId);
    if (version === epoch) emit('changed');
  } catch (e) {
    if (version === epoch) error.value = e.message || '提交失败，请重试';
  } finally {
    if (version === epoch) submitting.value = false;
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
    await load(false, true);
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

defineExpose({
  load,
  selectReply,
  setTarget: (val) => {
    target.value = val;
  },
  focusInput: () => {
    input.value?.focus();
  },
  roots,
  threads,
});
</script>
<template>
  <section class="community-comments" aria-label="评论与回复">
    <header>
      <h2>同学们的回应</h2>
      <button type="button" :disabled="loading || submitting" @click="load()">
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
        :disabled="loading || submitting"
        @click="moreReplies(root)"
      >
        展开更多回复
      </button>
    </div>
    <button
      v-if="hasMore"
      type="button"
      :disabled="loading || submitting"
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
          :disabled="submitting || loading || !draft.trim()"
        >
          {{ submitting ? '提交中…' : '提交评论' }}
        </button>
      </div>
    </form>
  </section>
</template>
<style scoped lang="scss">
.community-comments {
  padding-top: 16px;
}
header,
.composer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
h2 {
  font-size: 16px;
  font-weight: 700;
  color: var(--ft-color-text, #333);
  margin: 0;
}
button {
  min-height: 36px;
  border: 0;
  background: transparent;
  color: var(--ft-color-primary, #e60026);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  transition: opacity 150ms ease;
}
button:disabled {
  opacity: 0.55;
  cursor: default;
}
.compact-replies {
  margin-left: 42px;
  padding: 4px 14px;
  border-radius: 10px;
  background: var(--ft-color-bg, #f7f6f5);
  margin-bottom: 8px;
}
.comment-thread {
  border-bottom: 1px solid rgb(0 0 0 / 5%);
  padding-bottom: 6px;
}
.more-replies {
  margin-left: 42px;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 0;
}
.comment-composer {
  margin-top: 18px;
  display: grid;
  gap: 8px;
  background: #fff;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgb(0 0 0 / 6%);
}
textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  padding: 10px 12px;
  border: 1px solid var(--ft-color-border, #e5e5e5);
  border-radius: 8px;
  background: #faf9f7;
  color: inherit;
  font: inherit;
  font-size: 14px;
  transition: border-color 160ms ease;

  &:focus {
    outline: none;
    border-color: var(--ft-color-primary, #e60026);
    background: #fff;
  }
}
.composer-footer {
  font-size: 12px;
  color: var(--ft-color-text-secondary, #8c827a);
}
.community-comments__send-btn {
  background: var(--ft-color-primary, #e60026);
  color: white;
  border-radius: 999px;
  font-weight: 600;
  padding: 6px 16px;
  box-shadow: 0 2px 8px rgb(230 0 38 / 20%);
  transition:
    transform 140ms ease,
    background 140ms ease;

  &:hover:not(:disabled) {
    transform: scale(1.02);
  }
}
.reply-selection {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  background: rgb(230 0 38 / 8%);
  color: var(--ft-color-primary, #e60026);
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;

  button {
    min-height: auto;
    padding: 0;
    color: #888;
    font-size: 12px;
    &:hover {
      color: #333;
    }
  }
}
[role='alert'] {
  color: var(--ft-color-primary, #e60026);
}
</style>
