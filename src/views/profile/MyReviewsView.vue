<script setup>
import { ref } from 'vue';
import { usePagedData } from '@/composables/usePagedData.js';
import { fetchOwnReviews, deleteOwnReview } from '@/api/profile.api.js';
import SubmissionRecord from '@/components/base/SubmissionRecord.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
const { items, page, total, size, error, loading, load } =
  usePagedData(fetchOwnReviews);
const confirming = ref(null);
const deleting = ref(false);
const deleteError = ref('');
async function remove() {
  if (deleting.value || !confirming.value) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    await deleteOwnReview(confirming.value);
    confirming.value = null;
    if (items.value.length === 1 && page.value > 1) page.value -= 1;
    else await load();
  } catch (error) {
    deleteError.value = error.message || '删除失败';
  } finally {
    deleting.value = false;
  }
}
</script>
<template>
  <div class="records-page">
    <RouterLink :to="{ name: 'profile' }">← 返回我的</RouterLink>
    <div class="section-rule">
      <span class="section-rule__index">07</span
      ><span class="section-rule__line"></span>
    </div>
    <h1 class="section-title">我的<span class="zine-highlight">评论</span></h1>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <EmptyState
      v-else-if="!items.length"
      title="暂无已发布评论"
      description="刚提交的点评需要先审核，可在“我的提交”查看进度和驳回原因。"
    >
      <RouterLink
        class="button-ink"
        :to="{ name: 'mySubmissions', query: { kind: 'review' } }"
        >查看点评审核记录</RouterLink
      >
    </EmptyState>
    <template v-else>
      <SubmissionRecord
        v-for="row in items"
        :key="row.id"
        :row="row"
        kind="review"
      >
        <button
          v-if="confirming !== row.id"
          class="button-ink is-danger"
          type="button"
          :disabled="deleting"
          @click="
            confirming = row.id;
            deleteError = '';
          "
        >
          删除
        </button>
        <div v-else role="group" aria-label="确认删除评论">
          <p>确认删除这条评论？</p>
          <p v-if="deleteError" role="alert">{{ deleteError }}</p>
          <button type="button" :disabled="deleting" @click="confirming = null">
            取消
          </button>
          <button type="button" :disabled="deleting" @click="remove">
            {{ deleting ? '删除中…' : '确认删除' }}
          </button>
        </div>
      </SubmissionRecord>
    </template>
    <PaginationControls
      v-if="total > size"
      :page="page"
      :total="total"
      :size="size"
      :disabled="loading || deleting"
      @change="page = $event"
    />
  </div>
</template>
<style scoped>
.records-page {
  padding: var(--ft-space-3);
  max-width: 900px;
  margin: auto;
}
button {
  margin-right: 12px;
}
</style>
