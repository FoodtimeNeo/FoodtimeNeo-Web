<script setup>
import PublisherDetails from '@/components/base/PublisherDetails.vue';
import AiVerdict from '@/components/base/AiVerdict.vue';
import { formatTime } from '@/utils/recordLabels.js';
defineProps({ row: { type: Object, required: true }, full: Boolean });
</script>
<template>
  <div class="managed-review-content">
    <header class="managed-review-content__heading">
      <div>
        <h3 v-if="!full">{{ row.dishName || '点评记录' }}</h3>
        <p class="managed-review-content__context">
          {{ [row.diningHallName, row.stallName].filter(Boolean).join(' / ') }}
        </p>
      </div>
      <span
        class="managed-review-content__score"
        role="img"
        :aria-label="`评分 ${row.rating} 分，满分 5 分`"
      >
        <span class="managed-review-content__stars" aria-hidden="true"
          ><svg
            v-for="star in 5"
            :key="star"
            viewBox="0 0 24 24"
            focusable="false"
            :class="{ 'is-filled': star <= row.rating }"
          >
            <path
              d="m12 2.5 2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96Z"
              :fill="star <= row.rating ? 'currentColor' : 'none'"
              stroke="currentColor"
              stroke-width="1.6"
            /></svg
        ></span>
        <span>{{ row.rating }} / 5</span>
      </span>
    </header>
    <PublisherDetails
      :row="row"
      :published-at="row.submittedAt || row.createdAt"
      compact
    />
    <p
      class="managed-review-content__text"
      :class="{ 'managed-review-content__preview': !full }"
    >
      {{ row.content || '暂无文字内容' }}
    </p>
    <p class="managed-review-content__id">点评 ID：{{ row.id }}</p>
    <p
      v-if="full && row.updatedAt && row.updatedAt !== row.createdAt"
      class="managed-review-content__id"
    >
      更新时间：{{ formatTime(row.updatedAt) }}
    </p>
    <AiVerdict
      :risk-level="row.aiRiskLevel"
      :confidence="row.aiConfidence"
      :labels="row.aiLabels"
      :reason="row.aiReason"
      :checked-at="row.aiCheckedAt"
      :compact="!full"
    />
  </div>
</template>
<style scoped>
.managed-review-content {
  overflow-wrap: anywhere;
}
.managed-review-content__heading {
  display: flex;
  justify-content: space-between;
  align-items: start;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-bottom: 6px;
}
h3 {
  margin: 0;
  font: 700 18px/1.4 var(--ft-font-family-title);
}
.managed-review-content__context {
  margin: 2px 0 0;
  font-size: var(--ft-font-size-sm);
  color: var(--ft-color-text-muted);
}
.managed-review-content__score {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  white-space: nowrap;
}
.managed-review-content__stars {
  display: inline-flex;
  gap: 1px;
  color: var(--ft-color-text-muted);
}
.managed-review-content__stars svg {
  width: 15px;
  height: 15px;
}
.managed-review-content__stars .is-filled {
  color: var(--ft-color-primary);
}
.managed-review-content__text {
  margin: 8px 0;
  font-size: var(--ft-font-size-md);
  white-space: pre-wrap;
  line-height: 1.75;
}
.managed-review-content__preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.managed-review-content__id {
  margin: 4px 0;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}
</style>
