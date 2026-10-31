<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import {
  fetchManagedReviews,
  deleteManagedReview,
} from '@/api/admin-manage.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import SubmissionRecord from '@/components/base/SubmissionRecord.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import AiVerdict from '@/components/base/AiVerdict.vue';
import PublisherDetails from '@/components/base/PublisherDetails.vue';
const route = useRoute();
const draft = ref(typeof route.query.q === 'string' ? route.query.q : '');
const query = ref(draft.value.trim());
const { items, page, total, size, loading, error, load } = usePagedData(
  (page, options) => fetchManagedReviews(page, query.value, options),
);
const selected = ref(null);
const reason = ref('');
const failure = ref('');
const writing = ref(false);
function search(clear = false) {
  if (writing.value) return;
  if (clear) draft.value = '';
  query.value = draft.value.trim();
  selected.value = null;
  reason.value = '';
  failure.value = '';
  if (page.value !== 1) page.value = 1;
  else load();
}
async function remove() {
  if (writing.value || !selected.value) return;
  failure.value = '';
  if (!reason.value.trim()) {
    failure.value = '删除须填写处理原因';
    return;
  }
  writing.value = true;
  try {
    await deleteManagedReview(selected.value, reason.value.trim());
    selected.value = null;
    if (items.value.length === 1 && page.value > 1) page.value--;
    else await load();
  } catch (error) {
    failure.value = error.message || '删除失败';
  } finally {
    writing.value = false;
  }
}
</script>
<template>
  <section class="reviews">
    <h2 class="section-title">评论管理</h2>
    <RouterLink :to="{ name: 'adminAudit' }">查看投稿审核记录 →</RouterLink>
    <form class="search" @submit.prevent="search()">
      <label
        >按用户查询<input
          v-model="draft"
          type="search"
          maxlength="254"
          placeholder="用户 ID、邮箱或昵称"
          :disabled="writing || loading"
      /></label>
      <button type="submit" :disabled="writing || loading">查询</button>
      <button
        v-if="query || draft"
        type="button"
        :disabled="writing || loading"
        @click="search(true)"
      >
        清除筛选
      </button>
    </form>
    <p v-if="!loading && !error" role="status">共 {{ total }} 条评论</p>
    <LoadingState v-if="loading" /><ErrorState
      v-else-if="error"
      :description="error.message"
      @retry="load"
    /><EmptyState
      v-else-if="!items.length"
      :title="query ? '没有找到该用户的评论' : '暂无正式评论'"
    >
      <button v-if="query" type="button" @click="search(true)">
        查看全部评论
      </button>
    </EmptyState>
    <SubmissionRecord
      v-for="row in !loading && !error ? items : []"
      :key="row.id"
      :row="row"
      kind="review"
    >
      <PublisherDetails :row="row" :show-time="false" />
      <AiVerdict
        :risk-level="row.aiRiskLevel"
        :confidence="row.aiConfidence"
        :labels="row.aiLabels"
        :reason="row.aiReason"
        :checked-at="row.aiCheckedAt"
      />
      <form v-if="selected === row.id" @submit.prevent="remove">
        <label
          >处理原因（必填）<textarea v-model="reason" :disabled="writing" />
        </label>
        <p v-if="failure" role="alert">{{ failure }}</p>
        <button type="button" :disabled="writing" @click="selected = null">
          取消</button
        ><button :disabled="writing" type="submit">
          {{ writing ? '删除中…' : '确认删除' }}
        </button>
      </form>
      <button
        v-else
        :disabled="writing"
        @click="
          selected = row.id;
          reason = '';
          failure = '';
        "
      >
        删除违规评论
      </button>
    </SubmissionRecord>
    <PaginationControls
      :page="page"
      :total="total"
      :size="size"
      :disabled="loading || writing"
      @change="
        selected = null;
        page = $event;
      "
    />
  </section>
</template>
<style scoped>
.reviews {
  max-width: 1000px;
  margin: auto;
}
.reviews > .section-title {
  margin-bottom: 14px;
}
.search {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 12px;
  margin: 16px 0;
}
.search label {
  flex: 1 1 240px;
}
.search input {
  width: 100%;
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
}
.reviews > p {
  margin: 12px 0;
}
.reviews :deep(.submission-record) {
  position: relative;
  border-color: var(--ft-color-secondary);
  box-shadow: 4px 5px 0 rgb(58 36 24 / 14%);
  clip-path: none;
}
.reviews :deep(.submission-record:nth-of-type(even)) {
  transform: none;
}
.reviews :deep(.submission-record:nth-of-type(odd)) {
  transform: none;
}
.reviews :deep(.submission-record h2) {
  color: var(--ft-color-secondary);
  font-size: clamp(24px, 3vw, 34px);
}
.reviews :deep(.submission-record strong) {
  color: var(--zine-stamp-red);
  font-family: var(--zine-handwriting-font);
}
label {
  display: grid;
  gap: 8px;
  color: var(--ft-color-text-muted);
}
button,
textarea {
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--ft-color-secondary);
  background: #fffaf0;
}
button {
  margin: 12px 12px 0 0;
  box-shadow: 2px 2px 0 var(--ft-color-secondary);
  color: var(--ft-color-secondary);
  font-weight: 700;
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: var(--ft-color-secondary);
  color: #fffaf0;
  transform: translate(-1px, -1px);
}
form {
  margin-top: 14px;
  padding: 14px;
  border: 1px dashed var(--ft-color-secondary);
  background: var(--zine-paper-card-alt);
}
[role='alert'] {
  color: var(--ft-color-danger);
  font-weight: 700;
}
@media (max-width: 560px) {
  .reviews :deep(.submission-record:nth-of-type(even)),
  .reviews :deep(.submission-record:nth-of-type(odd)) {
    transform: none;
    box-shadow: var(--app-mobile-shadow);
  }
}
</style>
