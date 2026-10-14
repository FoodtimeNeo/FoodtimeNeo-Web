<script setup>
import { ref } from 'vue';
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
const { items, page, total, size, loading, error, load } =
  usePagedData(fetchManagedReviews);
const selected = ref(null);
const reason = ref('');
const failure = ref('');
const writing = ref(false);
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
    <h2 class="section-title">正式评论管理</h2>
    <LoadingState v-if="loading" /><ErrorState
      v-else-if="error"
      :description="error.message"
      @retry="load"
    /><EmptyState v-else-if="!items.length" title="暂无正式评论" />
    <SubmissionRecord
      v-for="row in !loading && !error ? items : []"
      :key="row.id"
      :row="row"
      kind="review"
    >
      <p>作者 ID：{{ row.userId }}</p>
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
label {
  display: grid;
  gap: 8px;
}
button,
textarea {
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
}
button {
  margin: 12px 12px 0 0;
  cursor: pointer;
}
[role='alert'] {
  color: var(--ft-color-danger);
}
</style>
