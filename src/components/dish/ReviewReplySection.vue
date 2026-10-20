<script setup>
import { onScopeDispose, ref, watch } from 'vue';
import { formatTime } from '@/utils/recordLabels.js';
import CommentLikeButton from './CommentLikeButton.vue';

const props = defineProps({
  review: { type: Object, required: true },
  actions: { type: Object, required: true },
});
const expanded = ref(false);
const rows = ref([]);
const total = ref(props.review.replyCount ?? 0);
watch(
  () => props.review.replyCount,
  (count) => {
    total.value = count ?? 0;
  },
);
const loading = ref(false);
const loaded = ref(false);
const nextCursor = ref(null);
const hasMore = ref(false);
const loadError = ref('');
const input = ref(null);
const text = ref('');
const target = ref(null);
const posting = ref(false);
const formError = ref('');
const notice = ref('');
const removing = ref(false);
const selectedDelete = ref(null);
let operation = null;
let alive = true;
let queuedReset = false;
onScopeDispose(() => (alive = false));
async function load(reset = false) {
  if (loading.value) {
    queuedReset ||= reset;
    return;
  }
  loading.value = true;
  loadError.value = '';
  try {
    const result = await props.actions.fetchReviewReplies(
      props.review.id,
      reset ? '' : nextCursor.value || '',
    );
    if (!alive) return;
    const combined = reset ? result.items : [...rows.value, ...result.items];
    rows.value = Array.from(
      new Map(combined.map((row) => [row.id, row])).values(),
    );
    total.value = result.total;
    nextCursor.value = result.nextCursor;
    hasMore.value = result.hasMore;
    loaded.value = true;
  } catch (error) {
    if (alive) loadError.value = error.message || '回复加载失败';
  } finally {
    if (alive) {
      loading.value = false;
      if (queuedReset) {
        queuedReset = false;
        await load(true);
      }
    }
  }
}
function toggle() {
  expanded.value = !expanded.value;
  if (expanded.value && !loaded.value) load(true);
}
function choose(row) {
  target.value = row;
  input.value?.focus();
}
async function submit() {
  if (posting.value) return;
  const content = text.value.trim();
  formError.value = '';
  if (!content || content.length > 500) {
    formError.value = '请输入1～500字的回复';
    input.value?.focus();
    return;
  }
  const signature = JSON.stringify([content, target.value?.id || null]);
  if (!operation || operation.signature !== signature)
    operation = { signature, id: crypto.randomUUID() };
  posting.value = true;
  try {
    await props.actions.createReviewReply(props.review.id, {
      content,
      replyToId: target.value?.id || null,
      clientRequestId: operation.id,
    });
    if (!alive) return;
    text.value = '';
    target.value = null;
    operation = null;
    notice.value = '回复已提交，审核通过后公开。';
    await load(true);
  } catch (error) {
    if (alive)
      formError.value = error.message || '提交失败，请先核对我的回复后重试';
  } finally {
    if (alive) posting.value = false;
  }
}
async function remove() {
  if (removing.value || !selectedDelete.value) return;
  removing.value = true;
  loadError.value = '';
  try {
    await props.actions.deleteReviewReply(selectedDelete.value);
    if (!alive) return;
    selectedDelete.value = null;
    notice.value = '回复已删除';
    await load(true);
  } catch (error) {
    if (alive) loadError.value = error.message || '删除失败';
  } finally {
    if (alive) removing.value = false;
  }
}
</script>

<template>
  <section class="review-replies" aria-label="评论回复">
    <button
      type="button"
      class="button-ink"
      :aria-expanded="expanded"
      @click="toggle"
    >
      {{ expanded ? '收起回复' : '回复' }} · {{ total }}
    </button>
    <div v-if="expanded" class="review-replies__panel">
      <p v-if="notice" role="status">
        {{ notice }}
        <RouterLink :to="{ name: 'myReviewReplies' }">我的回复</RouterLink>
      </p>
      <p v-if="loadError" role="alert">{{ loadError }}</p>
      <button type="button" :disabled="loading" @click="load(true)">
        刷新回复
      </button>
      <p v-if="loading" role="status">正在加载回复…</p>
      <p v-if="loaded && !rows.length && !loading">还没有已公开的回复</p>
      <ul>
        <li v-for="row in rows" :key="row.id">
          <strong>{{ row.userDisplayName || row.userId }}</strong>
          <span v-if="row.replyToId">
            回复
            {{
              row.replyToDeleted
                ? '已删除的回复'
                : row.replyToUserDisplayName || '同学'
            }}
          </span>
          <p class="review-replies__content">{{ row.content }}</p>
          <time :datetime="row.createdAt">{{ formatTime(row.createdAt) }}</time>
          <div class="review-replies__actions">
            <CommentLikeButton
              :target="row"
              :save="(liked) => actions.setReplyLike(row.id, liked)"
            />
            <button type="button" :disabled="posting" @click="choose(row)">
              回复这条
            </button>
            <button
              v-if="row.ownedByMe"
              type="button"
              :disabled="removing"
              @click="selectedDelete = row.id"
            >
              删除回复
            </button>
          </div>
          <div v-if="selectedDelete === row.id">
            <p>删除后不再公开正文，后续回复保留。</p>
            <button type="button" :disabled="removing" @click="remove">
              确认删除
            </button>
            <button
              type="button"
              :disabled="removing"
              @click="selectedDelete = null"
            >
              取消删除
            </button>
          </div>
        </li>
      </ul>
      <button
        v-if="hasMore"
        type="button"
        :disabled="loading"
        @click="load(false)"
      >
        加载更多回复
      </button>
      <form @submit.prevent="submit">
        <label :for="`reply-${review.id}`">
          {{
            target ? `回复 ${target.userDisplayName || '同学'}` : '回复这条点评'
          }}
        </label>
        <button
          v-if="target"
          type="button"
          :disabled="posting"
          @click="target = null"
        >
          取消回复对象
        </button>
        <textarea
          :id="`reply-${review.id}`"
          ref="input"
          v-model="text"
          maxlength="500"
          rows="3"
          :disabled="posting"
        />
        <p>最多500字，审核通过后公开。</p>
        <p v-if="formError" role="alert">{{ formError }}</p>
        <button type="submit" class="button-ink" :disabled="posting">
          {{ posting ? '提交中…' : '提交回复' }}
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped lang="scss">
.review-replies {
  margin-top: var(--ft-space-1);
  overflow-wrap: anywhere;
  button {
    min-height: 44px;
  }
  &__panel {
    margin-top: var(--ft-space-2);
  }
  ul {
    list-style: none;
    padding: 0;
  }
  li {
    padding: var(--ft-space-2) 0;
    border-top: 1px dashed var(--ft-color-border);
  }
  &__content {
    white-space: pre-wrap;
  }
  time {
    font-size: var(--ft-font-size-sm);
    color: var(--ft-color-text-muted);
  }
  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ft-space-1);
  }
  form {
    margin-top: var(--ft-space-2);
  }
  label {
    display: block;
  }
  textarea {
    display: block;
    width: 100%;
    resize: vertical;
    margin-top: var(--ft-space-1);
  }
  [role='alert'] {
    color: var(--ft-color-danger);
  }
}
</style>
