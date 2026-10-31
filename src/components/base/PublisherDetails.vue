<script setup>
import { formatTime } from '@/utils/recordLabels.js';
defineProps({
  row: { type: Object, required: true },
  publishedAt: { type: String, default: undefined },
  showTime: { type: Boolean, default: true },
});
</script>
<template>
  <div class="publisher-details">
    <p>发布者名称：{{ row.userDisplayName || '未命名用户' }}</p>
    <p>发布者邮箱：{{ row.userEmail || '未记录' }}</p>
    <p>发布者 ID：{{ row.userId || '未记录' }}</p>
    <p v-if="showTime">
      发布时间：{{
        formatTime(publishedAt === undefined ? row.createdAt : publishedAt)
      }}
    </p>
  </div>
</template>
<style scoped>
.publisher-details {
  overflow-wrap: anywhere;
  color: var(--ft-color-text-muted);
}
.publisher-details p {
  margin: 8px 0;
}
</style>
