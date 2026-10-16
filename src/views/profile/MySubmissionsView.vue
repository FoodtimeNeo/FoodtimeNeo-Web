<script setup>
import { useRoute, useRouter } from 'vue-router';
import { usePagedData } from '@/composables/usePagedData.js';
import { fetchOwnSubmissions } from '@/api/profile.api.js';
import SubmissionRecord from '@/components/base/SubmissionRecord.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
const kinds = { review: '点评', dish: '菜品', stall: '档口', photo: '图片' };
const route = useRoute();
const router = useRouter();
// App 按 fullPath 重建页面，切换类型和刷新均从第一页加载对应记录。
const kind =
  typeof route.query.kind === 'string' && Object.hasOwn(kinds, route.query.kind)
    ? route.query.kind
    : 'review';
const { items, page, total, size, error, loading, load } = usePagedData(
  (page, options) => fetchOwnSubmissions(kind, page, options),
);
function changeKind(event) {
  router.replace({ query: { ...route.query, kind: event.target.value } });
}
</script>
<template>
  <div class="records-page">
    <RouterLink :to="{ name: 'profile' }">← 返回我的</RouterLink>
    <div class="section-rule">
      <span class="section-rule__index">08</span
      ><span class="section-rule__line"></span>
    </div>
    <h1 class="section-title">我的<span class="zine-highlight">提交</span></h1>
    <p class="records-page__hint">
      查看投稿的审核状态；通过审核的点评会出现在“我的评论”。
    </p>
    <label
      ><span>投稿类型</span
      ><select :value="kind" @change="changeKind">
        <option v-for="(label, key) in kinds" :key="key" :value="key">
          {{ label }}
        </option>
      </select></label
    >
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <EmptyState
      v-else-if="!items.length"
      :title="`暂无${kinds[kind]}投稿记录`"
      description="从食堂找到档口和菜品，即可在对应页面参与投稿。"
    >
      <RouterLink class="button-ink" :to="{ name: 'canteenList' }"
        >去逛食堂</RouterLink
      >
    </EmptyState>
    <SubmissionRecord
      v-for="row in !loading && !error ? items : []"
      :key="kind + row.id"
      :row="row"
      :kind="kind"
    />
    <PaginationControls
      v-if="total > size"
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
.records-page__hint {
  color: var(--ft-color-text-muted);
}
</style>
