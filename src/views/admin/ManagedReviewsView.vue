<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { ElDialog } from 'element-plus';
import { useRoute } from 'vue-router';
import {
  fetchManagedReviews,
  deleteManagedReview,
} from '@/api/admin-manage.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import ManagedReviewContent from '@/components/admin/ManagedReviewContent.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
const route = useRoute();
const draft = ref(typeof route.query.q === 'string' ? route.query.q : '');
const query = ref(draft.value.trim());
const { items, page, total, size, loading, error, load, cancel } = usePagedData(
  (page, options) => fetchManagedReviews(page, query.value, options),
);
const selected = ref(null),
  deleting = ref(false),
  reason = ref('');
const failure = ref(''),
  invalidReason = ref(false),
  writing = ref(false),
  notice = ref('');
const reasonInput = ref(null),
  failureSummary = ref(null),
  resultsHeading = ref(null);
const dialogTitle = computed(
  () =>
    `${deleting.value ? '删除确认' : '完整点评'} · ${selected.value?.dishName || '点评记录'}`,
);
let active = true,
  scrollAfterLoad = false;
function closeSelection() {
  if (writing.value) return;
  selected.value = null;
  deleting.value = false;
  reason.value = '';
  failure.value = '';
  invalidReason.value = false;
}
function choose(row, remove = false) {
  if (writing.value) return;
  closeSelection();
  selected.value = row;
  deleting.value = remove;
}
function startRemoval() {
  if (writing.value) return;
  deleting.value = true;
  nextTick(() => {
    if (selected.value && deleting.value) reasonInput.value?.focus();
  });
}
function search(clear = false) {
  if (writing.value || loading.value) return;
  cancel();
  if (clear) draft.value = '';
  query.value = draft.value.trim();
  closeSelection();
  notice.value = '';
  scrollAfterLoad = true;
  if (page.value !== 1) page.value = 1;
  else load();
}
function changePage(value) {
  if (writing.value || loading.value || value === page.value) return;
  cancel();
  closeSelection();
  notice.value = '';
  scrollAfterLoad = true;
  page.value = value;
}
watch([loading, error, total], () => {
  if (
    !loading.value &&
    !error.value &&
    page.value > Math.max(1, Math.ceil(total.value / size.value))
  ) {
    page.value = Math.max(1, Math.ceil(total.value / size.value));
    return;
  }
  if (!loading.value && !error.value && scrollAfterLoad) {
    scrollAfterLoad = false;
    nextTick(() => {
      if (active && !loading.value)
        resultsHeading.value?.scrollIntoView?.({ block: 'start' });
    });
  }
});
async function remove() {
  if (writing.value || !selected.value || !deleting.value) return;
  failure.value = '';
  invalidReason.value = !reason.value.trim();
  if (invalidReason.value) {
    failure.value = '删除须填写处理原因';
    await nextTick();
    reasonInput.value?.focus();
    return;
  }
  const id = selected.value.id;
  writing.value = true;
  try {
    await deleteManagedReview(id, reason.value.trim());
    if (!active) return;
    selected.value = null;
    deleting.value = false;
    reason.value = '';
    notice.value = '评论已删除';
    if (items.value.length === 1 && page.value > 1) page.value--;
    else await load();
  } catch (e) {
    if (active) {
      failure.value = e.message || '删除失败，请确认结果后再试';
      await nextTick();
      failureSummary.value?.focus();
    }
  } finally {
    if (active) writing.value = false;
  }
}
onBeforeUnmount(() => {
  active = false;
});
</script>
<template>
  <section class="reviews">
    <header class="reviews__heading">
      <div>
        <h2 class="section-title">评论管理</h2>
        <p>已公开的菜品点评</p>
      </div>
      <RouterLink :to="{ name: 'adminAudit' }">查看投稿审核记录 →</RouterLink>
    </header>
    <form class="search" @submit.prevent="search()">
      <label
        >按用户查询<input
          v-model="draft"
          type="search"
          maxlength="254"
          placeholder="用户 ID、邮箱或昵称"
          :disabled="writing || loading" /></label
      ><button type="submit" :disabled="writing || loading">查询</button
      ><button
        v-if="query || draft"
        type="button"
        :disabled="writing || loading"
        @click="search(true)"
      >
        清除筛选
      </button>
    </form>
    <p v-if="notice" class="reviews__notice" role="status">
      {{ notice }}{{ error ? '，但列表更新失败，请重试加载核对。' : '' }}
    </p>
    <p ref="resultsHeading" class="reviews__summary" aria-live="polite">
      <template v-if="!loading && !error"
        >共 {{ total }} 条评论<span v-if="query">
          · 用户：{{ query }}</span
        ></template
      >
    </p>
    <LoadingState v-if="loading" /><ErrorState
      v-else-if="error"
      :description="error.message"
      @retry="load"
    /><EmptyState
      v-else-if="!items.length"
      :title="query ? '没有找到该用户的评论' : '暂无正式评论'"
      ><button v-if="query" type="button" @click="search(true)">
        查看全部评论
      </button></EmptyState
    >
    <article
      v-for="row in !loading && !error ? items : []"
      :key="row.id"
      class="review-card"
    >
      <ManagedReviewContent :row="row" />
      <footer class="reviews__actions">
        <button type="button" :disabled="writing" @click="choose(row)">
          查看完整内容</button
        ><button
          type="button"
          class="reviews__danger"
          :disabled="writing"
          @click="choose(row, true)"
        >
          删除违规评论
        </button>
      </footer>
    </article>
    <PaginationControls
      :page="page"
      :total="total"
      :size="size"
      :disabled="loading || writing"
      @change="changePage"
    />
  </section>
  <ElDialog
    :model-value="Boolean(selected)"
    :title="dialogTitle"
    class="managed-review-dialog"
    width="min(880px, calc(100vw - 24px))"
    top="16px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="!writing"
    :show-close="!writing"
    @update:model-value="
      (value) => {
        if (!value) closeSelection();
      }
    "
  >
    <div v-if="selected" class="managed-review-dialog__body">
      <ManagedReviewContent :row="selected" full />
      <form
        v-if="deleting"
        id="managed-review-decision"
        class="managed-review-dialog__form"
        @submit.prevent="remove"
      >
        <h3>删除违规评论</h3>
        <label for="managed-review-reason"
          >处理原因（必填）<textarea
            id="managed-review-reason"
            ref="reasonInput"
            v-model="reason"
            rows="3"
            :disabled="writing"
            aria-required="true"
            :aria-invalid="invalidReason"
            :aria-describedby="failure ? 'managed-review-failure' : undefined"
          />
        </label>
        <p>确认后，该点评将停止公开展示。</p>
        <p
          v-if="failure"
          id="managed-review-failure"
          ref="failureSummary"
          role="alert"
          tabindex="-1"
        >
          {{ failure }}
        </p>
      </form>
    </div>
    <template #footer
      ><div v-if="selected" class="managed-review-dialog__footer">
        <span>{{
          writing
            ? '正在提交，请稍候…'
            : deleting
              ? '核对内容后再确认'
              : '已公开点评'
        }}</span>
        <div class="reviews__actions">
          <button type="button" :disabled="writing" @click="closeSelection">
            {{ deleting ? '取消' : '关闭' }}</button
          ><button
            v-if="deleting"
            type="submit"
            form="managed-review-decision"
            class="reviews__danger-solid"
            :disabled="writing"
          >
            {{ writing ? '删除中…' : '确认删除' }}</button
          ><button
            v-else
            type="button"
            class="reviews__danger"
            @click="startRemoval"
          >
            删除违规评论
          </button>
        </div>
      </div></template
    >
  </ElDialog>
</template>
<style scoped>
.reviews {
  max-width: 1000px;
  margin: auto;
  overflow-wrap: anywhere;
}
.reviews__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 10px;
}
.reviews__heading p {
  margin: 4px 0 0;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}
.reviews__heading a {
  font-size: var(--ft-font-size-sm);
  color: var(--ft-color-primary);
}
.search {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 8px 10px;
  margin: 10px 0;
  padding: 10px 12px;
  border: 1px solid var(--ft-color-border);
  background: var(--zine-paper-card-alt);
}
.search label {
  flex: 1 1 240px;
  font-size: var(--ft-font-size-sm);
}
label {
  display: grid;
  gap: 4px;
  color: var(--ft-color-text-muted);
}
.search input,
textarea {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  color: var(--ft-color-text);
  font: inherit;
}
.reviews__summary {
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
  margin: 8px 0;
  scroll-margin-top: 120px;
}
.review-card {
  margin: 10px 0;
  padding: 12px 14px;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  box-shadow: 2px 2px 0 var(--zine-paper-shadow);
}
.reviews__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.review-card .reviews__actions {
  border-top: 1px solid var(--ft-color-border);
  padding-top: 8px;
  margin-top: 8px;
}
.review-card .reviews__danger {
  margin-left: auto;
}
button {
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--ft-color-secondary);
  color: var(--ft-color-text);
  background: var(--zine-paper-card);
  font: inherit;
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: var(--zine-paper-card-alt);
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--ft-color-primary);
  outline-offset: 3px;
}
.reviews__danger {
  color: var(--ft-color-danger);
  border-color: var(--ft-color-danger);
}
.reviews__danger-solid {
  color: var(--zine-paper-card);
  background: var(--ft-color-danger);
  border-color: var(--ft-color-danger);
}
.reviews__danger-solid:hover:not(:disabled) {
  background: var(--ft-color-primary-strong);
}
.reviews__notice {
  margin: 10px 0;
  padding: 8px 12px;
  border-left: 3px solid var(--ft-color-accent);
  background: var(--zine-paper-card-alt);
}
.managed-review-dialog__body {
  overflow-wrap: anywhere;
}
.managed-review-dialog__form {
  display: grid;
  gap: 12px;
  margin-top: 16px;
  padding: 12px;
  border: 1px dashed var(--ft-color-secondary);
  background: var(--zine-paper-card-alt);
}
.managed-review-dialog__form h3,
.managed-review-dialog__form p {
  margin: 0;
}
.managed-review-dialog__form [aria-invalid='true'] {
  border-color: var(--ft-color-danger);
}
[role='alert'] {
  color: var(--ft-color-danger);
}
.managed-review-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.managed-review-dialog__footer > span {
  color: var(--ft-color-text-muted);
}
:global(.managed-review-dialog) {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 32px);
  margin-bottom: 16px;
  --el-dialog-bg-color: var(--zine-paper-card);
  border: 1px solid var(--ft-color-secondary);
}
:global(.managed-review-dialog .el-dialog__header) {
  flex-shrink: 0;
  padding-right: 32px;
}
:global(.managed-review-dialog .el-dialog__title) {
  font-family: var(--ft-font-family-title);
  color: var(--ft-color-text);
  overflow-wrap: anywhere;
}
:global(.managed-review-dialog .el-dialog__body) {
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
  color: var(--ft-color-text);
}
:global(.managed-review-dialog .el-dialog__footer) {
  flex-shrink: 0;
  border-top: 1px solid var(--ft-color-border);
  padding-top: 10px;
}
@media (min-width: 769px) and (pointer: fine) {
  .reviews button,
  .search input {
    min-height: 36px;
    padding: 5px 12px;
    font-size: var(--ft-font-size-sm);
  }
}
@media (max-width: 560px) {
  .search label {
    flex-basis: 100%;
  }
  .search input,
  textarea {
    font-size: var(--ft-font-size-md);
  }
  .managed-review-dialog__footer > span {
    display: none;
  }
  .managed-review-dialog__footer .reviews__actions {
    margin-left: auto;
  }
}
</style>
