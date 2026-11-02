<script setup>
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchVenueRating } from '@/api/venue-review.api.js';
const props = defineProps({
  type: { type: String, required: true },
  targetId: { type: String, required: true },
});
const { data, error, load } = useAsyncData((options) =>
  fetchVenueRating(props.type, props.targetId, options),
);
</script>
<template>
  <div class="venue-summary">
    <template v-if="data">
      <span v-if="data.averageScore !== null" class="zine-rating-stamp">{{
        Number(data.averageScore).toFixed(1)
      }}</span>
      <span v-else>暂无评分</span>
      <span
        >{{ data.reviewCount }} 条评价<small
          >{{ type === 'hall' ? '餐厅' : '档口' }}整体体验 · 满分 5 分</small
        ></span
      >
    </template>
    <p v-else-if="error" role="alert">
      评分暂时无法加载
      <button class="review-action" type="button" @click="load">重试</button>
    </p>
    <span v-else>正在读取评分…</span>
    <RouterLink
      class="review-action"
      :to="{ name: 'venueReviews', params: { type, targetId } }"
      >查看评论 →</RouterLink
    >
    <RouterLink
      class="button-ink"
      :to="{ name: 'venueReviewCreate', params: { type, targetId } }"
      >写点评</RouterLink
    >
  </div>
</template>
<style scoped>
.venue-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
}
small {
  display: block;
  color: var(--ft-color-text-muted);
  font-size: 14px;
}
</style>
