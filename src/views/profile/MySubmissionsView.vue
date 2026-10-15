<script setup>
import { ref, watch } from 'vue';
import { usePagedData } from '@/composables/usePagedData.js';
import { fetchOwnSubmissions } from '@/api/profile.api.js';
import SubmissionRecord from '@/components/base/SubmissionRecord.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
const kind = ref('review');
const kinds = { review: '点评', dish: '菜品', stall: '档口', photo: '图片' };
const { items, page, total, size, error, loading, load } = usePagedData(
  (page, options) => fetchOwnSubmissions(kind.value, page, options),
);
watch(kind, () => {
  if (page.value !== 1) page.value = 1;
  else load();
});
</script>
<template>
  <div class="records-page">
    <RouterLink :to="{ name: 'profile' }">← 返回我的</RouterLink>
    <div class="section-rule">
      <span class="section-rule__index">08</span
      ><span class="section-rule__line"></span>
    </div>
    <h1 class="section-title">我的<span class="zine-highlight">提交</span></h1>
    <label
      ><span>投稿类型</span
      ><select v-model="kind">
        <option v-for="(label, key) in kinds" :key="key" :value="key">
          {{ label }}
        </option>
      </select></label
    >
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <EmptyState v-else-if="!items.length" title="暂无投稿记录" />
    <SubmissionRecord
      v-for="row in !loading && !error ? items : []"
      :key="kind + row.id"
      :row="row"
      :kind="kind"
    />
    <PaginationControls
      :page="page"
      :total="total"
      :size="size"
      :disabled="loading"
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
select {
  min-height: 44px;
  margin-left: 12px;
  padding: 8px 16px;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
}
label {
  display: inline-grid;
  gap: 6px;
  margin: var(--ft-space-2) 0;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}
</style>
