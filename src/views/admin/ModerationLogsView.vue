<script setup>
import { fetchModerationLogs } from '@/api/admin-audit.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { formatTime } from '@/utils/recordLabels.js';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import PublisherDetails from '@/components/base/PublisherDetails.vue';
import MediaImage from '@/components/base/MediaImage.vue';
const { items, page, total, size, loading, error, load } =
  usePagedData(fetchModerationLogs);
const types = {
  review: '点评',
  dish: '菜品',
  stall: '档口',
  photo: '图片',
  'dish-review-reply': '点评回复',
  'community-post': '社区食记',
  'community-comment': '社区评论／回复',
};
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
      <PublisherDetails :row="row" :published-at="row.submittedAt ?? null" />
      <p v-if="row.name">发布标题／名称：{{ row.name }}</p>
      <p v-if="row.content" class="published-content">
        发布内容：{{ row.content }}
      </p>
      <MediaImage
        v-if="row.imageUrl"
        :src="row.imageUrl"
        alt="发布内容配图"
        class="published-image"
      />
      <p v-if="!row.content && !row.imageUrl">发布内容：无文字或图片记录</p>
      <p v-if="row.actor === 'ai'">
        🤖 AI 审核{{ row.aiModel ? `（${row.aiModel}）` : '' }}
      </p>
      <p v-else>审核人 ID：{{ row.moderatorId }}</p>
      <p>审核时间：{{ formatTime(row.createdAt) }}</p>
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
.logs > .section-title {
  margin-bottom: 14px;
}
article {
  position: relative;
  border: 1px solid var(--ft-color-secondary);
  padding: 20px;
  margin: 20px 0;
  background: var(--zine-paper-card);
  box-shadow: 4px 5px 0 rgb(58 36 24 / 14%);
  clip-path: none;
}
article:nth-of-type(even) {
  transform: none;
}
article:nth-of-type(odd) {
  transform: none;
}
h3 {
  margin-top: 0;
  color: var(--ft-color-secondary);
  font-family: var(--ft-font-family-title);
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.08;
}
article p {
  color: var(--ft-color-text-muted);
}
article p:first-of-type {
  display: inline-block;
  padding: 4px 10px;
  border: 2px solid var(--zine-stamp-red);
  color: var(--zine-stamp-red);
  font-family: var(--zine-handwriting-font);
  transform: rotate(-3deg);
}
.reason {
  white-space: pre-wrap;
  padding-top: 10px;
  border-top: 1px dashed var(--ft-color-secondary);
  color: var(--zine-stamp-red);
}
.published-content {
  white-space: pre-wrap;
}
.published-image {
  width: min(100%, 480px);
}
@media (max-width: 560px) {
  article,
  article:nth-of-type(even),
  article:nth-of-type(odd) {
    padding: 16px;
    box-shadow: var(--app-mobile-shadow);
    transform: none;
  }
}
</style>
