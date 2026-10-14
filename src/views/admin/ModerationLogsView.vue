<script setup>
import { fetchModerationLogs } from '@/api/admin-audit.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { formatTime } from '@/utils/recordLabels.js';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
const { items, page, total, size, loading, error, load } =
  usePagedData(fetchModerationLogs);
const types = { review: '点评', dish: '菜品', stall: '档口', photo: '图片' };
</script>
<template>
  <section class="logs">
    <h2 class="section-title">审核日志</h2>
    <LoadingState v-if="loading" /><ErrorState
      v-else-if="error"
      :description="error.message"
      @retry="load"
    /><EmptyState v-else-if="!items.length" title="暂无审核日志" />
    <article v-for="row in !loading && !error ? items : []" :key="row.id">
      <h3>
        {{ types[row.type] }} · {{ row.action === 'approve' ? '通过' : '驳回' }}
      </h3>
      <p>日志 ID：{{ row.id }}</p>
      <p>投稿 ID：{{ row.submissionId }}</p>
      <p>审核人 ID：{{ row.moderatorId }}</p>
      <p>{{ formatTime(row.createdAt) }}</p>
      <p v-if="row.reason" class="reason">{{ row.reason }}</p>
    </article>
    <PaginationControls
      :page="page"
      :total="total"
      :size="size"
      :disabled="loading"
      @change="page = $event"
    />
  </section>
</template>
<style scoped>
.logs {
  max-width: 1000px;
  margin: auto;
  overflow-wrap: anywhere;
}
article {
  border: 1px solid var(--ft-color-text);
  padding: 20px;
  margin: 20px 0;
  background: var(--zine-paper-card);
}
.reason {
  white-space: pre-wrap;
}
</style>
