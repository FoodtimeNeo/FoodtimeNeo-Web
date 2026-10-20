<script setup>
import { nextTick, onScopeDispose, ref, watch } from 'vue';
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
const composerTrigger = ref(null);
const editing = ref(false);
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
async function choose(row = target.value) {
  target.value = row;
  editing.value = true;
  formError.value = '';
  await nextTick();
  input.value?.focus();
}
async function cancel() {
  editing.value = false;
  await nextTick();
  composerTrigger.value?.focus();
}
function selectDelete(row, event) {
  event.currentTarget.closest('details').open = false;
  selectedDelete.value = row.id;
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
    editing.value = false;
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
    if (target.value?.id === selectedDelete.value) target.value = null;
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
    <div class="review-replies__toolbar">
      <slot name="actions" />
      <button
        type="button"
        class="review-action"
        :aria-expanded="expanded"
        :aria-controls="`thread-${review.id}`"
        :disabled="posting"
        @click="toggle"
      >
        {{ expanded ? '收起回复' : '回复' }} · {{ total }}
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          :class="{ 'is-expanded': expanded }"
        >
          <path d="m5 7 5 5 5-5" />
        </svg>
      </button>
    </div>
    <div
      v-show="expanded"
      :id="`thread-${review.id}`"
      class="review-replies__panel"
    >
      <header class="review-replies__heading">
        <strong
          >回复 <span>{{ total }}</span></strong
        >
        <button
          type="button"
          class="review-action"
          :disabled="loading || posting || removing"
          aria-label="刷新回复"
          @click="load(true)"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M16 8a6 6 0 1 0 0 5M16 3v5h-5" />
          </svg>
          <span>刷新</span>
        </button>
      </header>
      <p v-if="notice" class="review-replies__message" role="status">
        {{ notice }}
        <RouterLink :to="{ name: 'myReviewReplies' }">我的回复</RouterLink>
      </p>
      <p v-if="loadError" class="review-replies__message" role="alert">
        {{ loadError }}
      </p>
      <p v-if="loading" class="review-replies__message" role="status">
        正在加载回复…
      </p>
      <p
        v-if="loaded && !rows.length && !loading"
        class="review-replies__message"
      >
        还没有已公开的回复，来聊聊这道菜吧。
      </p>
      <ul class="review-replies__list">
        <li v-for="row in rows" :key="row.id" class="review-replies__item">
          <div class="review-replies__author">
            <strong>{{ row.userDisplayName || row.userId }}</strong>
            <span v-if="row.replyToId">
              回复
              {{
                row.replyToDeleted
                  ? '已删除的回复'
                  : row.replyToUserDisplayName || '同学'
              }}
            </span>
          </div>
          <p class="review-replies__content">{{ row.content }}</p>
          <div class="review-replies__actions">
            <time :datetime="row.createdAt">{{
              formatTime(row.createdAt)
            }}</time>
            <CommentLikeButton
              :target="row"
              :save="(liked) => actions.setReplyLike(row.id, liked)"
            />
            <button
              type="button"
              class="review-action"
              :disabled="posting"
              @click="choose(row)"
            >
              回复这条
            </button>
            <details
              v-if="row.ownedByMe"
              class="review-replies__more"
              @keydown.esc="$event.currentTarget.open = false"
            >
              <summary
                class="review-action"
                :aria-label="`更多操作：${row.userDisplayName || '我的回复'}`"
              >
                更多
              </summary>
              <button
                type="button"
                class="review-action review-replies__delete"
                :disabled="removing"
                @click="selectDelete(row, $event)"
              >
                删除回复
              </button>
            </details>
          </div>
          <div v-if="selectedDelete === row.id" class="review-replies__confirm">
            <p>删除后不再公开正文，后续回复保留。</p>
            <div class="review-replies__actions">
              <button
                type="button"
                class="review-action review-replies__delete"
                :disabled="removing"
                @click="remove"
              >
                {{ removing ? '删除中…' : '确认删除' }}
              </button>
              <button
                type="button"
                class="review-action"
                :disabled="removing"
                @click="selectedDelete = null"
              >
                取消删除
              </button>
            </div>
          </div>
        </li>
      </ul>
      <button
        v-if="hasMore"
        type="button"
        class="review-action review-replies__load-more"
        :disabled="loading"
        @click="load(false)"
      >
        加载更多回复
      </button>
      <button
        v-if="!editing"
        ref="composerTrigger"
        type="button"
        class="review-replies__prompt"
        :disabled="posting"
        @click="choose()"
      >
        {{ text ? '继续编辑回复…' : '写下你的回复…' }}
      </button>
      <form v-else class="review-replies__composer" @submit.prevent="submit">
        <div class="review-replies__composer-heading">
          <label :for="`reply-${review.id}`">{{
            target ? `回复 ${target.userDisplayName || '同学'}` : '回复这条点评'
          }}</label>
          <button
            v-if="target"
            type="button"
            class="review-action"
            :disabled="posting"
            @click="choose(null)"
          >
            取消回复对象
          </button>
        </div>
        <textarea
          :id="`reply-${review.id}`"
          ref="input"
          v-model="text"
          maxlength="500"
          rows="3"
          :aria-describedby="`reply-hint-${review.id} reply-error-${review.id}`"
          :aria-invalid="!!formError"
          :disabled="posting"
        />
        <p
          :id="`reply-error-${review.id}`"
          class="review-replies__message"
          role="alert"
        >
          {{ formError }}
        </p>
        <div class="review-replies__composer-footer">
          <span :id="`reply-hint-${review.id}`"
            >{{ text.length }}/500 · 审核通过后公开</span
          >
          <div class="review-replies__actions">
            <button
              type="button"
              class="review-action"
              :disabled="posting"
              @click="cancel"
            >
              收起编辑
            </button>
            <button
              type="submit"
              class="button-ink is-primary"
              :disabled="posting"
            >
              {{ posting ? '提交中…' : '发布回复' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped lang="scss">
.review-replies {
  overflow-wrap: anywhere;
  &__toolbar,
  &__actions,
  &__heading,
  &__composer-heading,
  &__composer-footer {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0 var(--ft-space-1);
  }
  &__toolbar {
    margin-top: var(--ft-space-1);
  }
  &__panel {
    margin: var(--ft-space-1) 0 0 var(--ft-space-2);
    padding: 0 var(--ft-space-2) var(--ft-space-2);
    border-left: 2px solid var(--ft-color-border);
    background: var(--zine-paper-card-alt);
  }
  &__heading {
    justify-content: space-between;
    font-size: var(--ft-font-size-sm);
  }
  &__heading strong span {
    margin-left: var(--ft-space-1);
    color: var(--ft-color-text-muted);
    font-weight: 400;
  }
  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  &__item {
    padding: 12px 0;
    border-top: 1px solid var(--ft-color-border);
  }
  &__author {
    display: flex;
    flex-wrap: wrap;
    gap: 4px var(--ft-space-1);
    font-size: var(--ft-font-size-sm);
  }
  &__author span,
  time {
    color: var(--ft-color-text-muted);
    font-size: var(--ft-font-size-sm);
  }
  &__content {
    margin: 4px 0;
    white-space: pre-wrap;
  }
  time {
    margin-right: auto;
  }
  &__more {
    position: relative;
  }
  summary {
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  &__more[open] > button {
    position: absolute;
    z-index: 1;
    right: 0;
    top: 100%;
    min-width: 112px;
    border: 1px solid var(--ft-color-border);
    background: var(--zine-paper-card);
  }
  &__delete {
    color: var(--ft-color-danger);
  }
  &__confirm {
    padding: var(--ft-space-1);
    border: 1px solid var(--ft-color-border);
    background: var(--zine-paper-card);
    font-size: var(--ft-font-size-sm);
  }
  &__confirm p {
    margin: 0;
  }
  &__message {
    margin: var(--ft-space-1) 0;
    font-size: var(--ft-font-size-sm);
    color: var(--ft-color-text-muted);
  }
  &__message:empty {
    display: none;
  }
  &__message a {
    color: var(--ft-color-primary);
    text-decoration: underline;
  }
  &__load-more {
    margin-bottom: var(--ft-space-1);
  }
  &__prompt {
    display: block;
    width: 100%;
    min-height: 44px;
    padding: var(--ft-space-1) 12px;
    border: 1px solid var(--ft-color-border);
    background: var(--zine-paper-card);
    color: var(--ft-color-text-muted);
    font-size: var(--ft-font-size-sm);
    text-align: left;
    cursor: pointer;
  }
  &__prompt:hover {
    border-color: var(--ft-color-text-muted);
  }
  &__composer {
    margin-top: var(--ft-space-1);
  }
  &__composer-heading {
    justify-content: space-between;
    margin-bottom: var(--ft-space-1);
    font-size: var(--ft-font-size-sm);
  }
  label {
    font-weight: 700;
  }
  textarea {
    display: block;
    width: 100%;
    min-height: 88px;
    resize: vertical;
    padding: var(--ft-space-1) 12px;
    border: 1px solid var(--ft-color-text-muted);
    background: var(--zine-paper-card);
    color: var(--ft-color-text);
  }
  &__composer-footer {
    justify-content: space-between;
    margin-top: var(--ft-space-1);
    gap: var(--ft-space-1);
  }
  &__composer-footer > span {
    font-size: var(--ft-font-size-xs);
    color: var(--ft-color-text-muted);
  }
  &__composer-footer .button-ink {
    min-height: 44px;
    padding: var(--ft-space-1) 12px;
    box-shadow: none;
    font-size: var(--ft-font-size-sm);
  }
  [role='alert'] {
    color: var(--ft-color-danger);
  }
  .review-action svg.is-expanded {
    transform: rotate(180deg);
  }
}
@media (max-width: 600px) {
  .review-replies__panel {
    margin-left: var(--ft-space-1);
    padding-right: var(--ft-space-1);
    padding-left: var(--ft-space-1);
  }
  .review-replies__actions time {
    flex-basis: 100%;
    margin: 0;
  }
}
</style>
