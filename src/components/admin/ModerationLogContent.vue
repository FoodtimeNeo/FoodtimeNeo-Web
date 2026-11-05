<script setup>
import { formatTime } from '@/utils/recordLabels.js';
import PublisherDetails from '@/components/base/PublisherDetails.vue';
import CommunityImageViewer from '@/components/community/CommunityImageViewer.vue';
import CompactMediaPreview from './CompactMediaPreview.vue';
defineProps({ row: { type: Object, required: true }, full: Boolean });
</script>

<template>
  <div class="log-content" :class="{ 'log-content--compact': !full }">
    <div class="log-content__metadata">
      <p>日志 ID：{{ row.id }}</p>
      <p>投稿 ID：{{ row.submissionId }}</p>
    </div>
    <PublisherDetails
      :row="row"
      :published-at="row.submittedAt ?? null"
      compact
    />
    <p v-if="row.name">发布标题／名称：{{ row.name }}</p>
    <p v-if="row.content" class="published-content">
      发布内容：{{ row.content }}
    </p>
    <template v-if="row.imageUrl">
      <CommunityImageViewer
        v-if="full"
        :images="[{ url: row.imageUrl }]"
        alt="发布内容配图"
      />
      <CompactMediaPreview v-else :src="row.imageUrl" alt="发布内容配图" />
    </template>
    <p v-if="!row.content && !row.imageUrl">发布内容：无文字或图片记录</p>
    <div class="log-content__metadata">
      <p v-if="row.actor === 'ai'">
        AI 审核{{ row.aiModel ? `（${row.aiModel}）` : '' }}
      </p>
      <p v-else>审核人 ID：{{ row.moderatorId }}</p>
      <p>审核时间：{{ formatTime(row.createdAt) }}</p>
    </div>
    <p v-if="row.reason" class="reason">审核说明：{{ row.reason }}</p>
  </div>
</template>

<style scoped>
.log-content {
  overflow-wrap: anywhere;
}
.log-content p {
  margin: 4px 0;
}
.log-content__metadata {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 16px;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}
.published-content,
.reason {
  white-space: pre-wrap;
}
.reason {
  padding-top: 6px;
  border-top: 1px dashed var(--ft-color-border);
  color: var(--zine-stamp-red);
}
.log-content--compact .published-content,
.log-content--compact .reason {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
@media (max-width: 560px) {
  .log-content__metadata {
    grid-template-columns: 1fr;
  }
}
</style>
