<script setup>
import { formatTime } from '@/utils/recordLabels.js';
defineProps({
  row: { type: Object, required: true },
  publishedAt: { type: String, default: undefined },
  showTime: { type: Boolean, default: true },
  compact: Boolean,
});
</script>
<template>
  <div
    class="publisher-details"
    :class="{ 'publisher-details--compact': compact }"
  >
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
.publisher-details--compact {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 16px;
  font-size: var(--ft-font-size-sm);
}
.publisher-details--compact p {
  margin: 0;
}
@media (max-width: 560px) {
  .publisher-details--compact {
    grid-template-columns: 1fr;
  }
}
</style>
