<script setup>
import {
  formatTime,
  recordContext,
  statusLabels,
} from '@/utils/recordLabels.js';
import { formatPrice } from '@/utils/mediaUrl.js';
import MediaImage from './MediaImage.vue';
defineProps({
  row: { type: Object, required: true },
  kind: { type: String, required: true },
});
</script>
<template>
  <article class="submission-record">
    <h2>{{ row.dishName || row.name || '点评记录' }}</h2>
    <p>{{ recordContext(row) }}</p>
    <p v-if="row.status">
      <strong>{{ statusLabels[row.status] || row.status }}</strong>
    </p>
    <p class="submission-record__id">记录 ID：{{ row.id }}</p>
    <p>提交时间：{{ formatTime(row.submittedAt || row.createdAt) }}</p>
    <p v-if="row.rating">评分：{{ row.rating }} / 5</p>
    <p v-if="row.content" class="submission-record__content">
      {{ row.content }}
    </p>
    <p v-if="row.description" class="submission-record__content">
      {{ row.description }}
    </p>
    <p v-if="kind === 'dish'">{{ formatPrice(row.price) }}</p>
    <div
      v-if="row.imageUrl || row.coverImageUrl"
      class="submission-record__photo"
    >
      <MediaImage :src="row.imageUrl || row.coverImageUrl" alt="投稿图片" />
    </div>
    <p v-if="row.reviewedAt">审核时间：{{ formatTime(row.reviewedAt) }}</p>
    <p v-if="row.reviewReason" class="submission-record__content">
      审核说明：{{ row.reviewReason }}
    </p>
    <slot />
  </article>
</template>
<style scoped>
.submission-record {
  margin: 20px 0;
  padding: 20px;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  box-shadow: 3px 3px 0 var(--ft-color-text);
  overflow-wrap: anywhere;
}
h2 {
  margin: 0 0 8px;
  font-family: var(--ft-font-family-title);
  font-size: 24px;
}
p {
  margin: 8px 0;
}
.submission-record__id {
  font-size: 14px;
  color: var(--ft-color-text-muted);
}
.submission-record__content {
  white-space: pre-wrap;
}
.submission-record__photo {
  width: min(100%, 480px);
  aspect-ratio: 16/9;
  margin: 16px 0;
}
</style>
