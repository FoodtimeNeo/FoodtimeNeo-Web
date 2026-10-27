<script setup>
import { formatTime } from '@/utils/recordLabels.js';
import CommentLikeButton from './CommentLikeButton.vue';
import ReviewReplySection from './ReviewReplySection.vue';
/**
 * 菜品评论列表。字段对齐后端评论序列化：
 * { id, userId, userDisplayName, rating, content, createdAt }
 * 展示作者昵称，缺失时回退显示用户 ID。
 */
defineProps({
  reviews: { type: Array, required: true },
  actions: { type: Object, required: true },
});
</script>

<template>
  <ul class="dish-reviews">
    <li v-for="review in reviews" :key="review.id" class="dish-reviews__item">
      <div class="dish-reviews__head">
        <span class="dish-reviews__reviewer">{{
          review.userDisplayName || review.userId
        }}</span>
        <span class="zine-rating-stamp">
          {{ (review.rating ?? 0).toFixed(1) }}
        </span>
      </div>
      <p class="dish-reviews__comment">{{ review.content }}</p>
      <ReviewReplySection :review="review" :actions="actions">
        <template #actions>
          <time
            v-if="review.createdAt"
            :datetime="review.createdAt"
            class="dish-reviews__time"
          >
            {{ formatTime(review.createdAt) }}
          </time>
          <CommentLikeButton
            :target="review"
            :save="(liked) => actions.setReviewLike(review.id, liked)"
          />
        </template>
      </ReviewReplySection>
    </li>
  </ul>
</template>

<style scoped lang="scss">
.dish-reviews {
  margin: var(--ft-space-3) 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--ft-space-2);

  &__item {
    overflow-wrap: anywhere;
    padding: var(--ft-space-2);
    border: 2px solid var(--ft-color-text);
    background: var(--zine-paper-card);
    box-shadow: 3px 3px 0 var(--ft-color-text);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ft-space-2);
  }

  &__reviewer {
    min-width: 0;
    font-weight: 700;
  }

  .zine-rating-stamp {
    flex-shrink: 0;
    white-space: nowrap;
  }

  &__comment {
    margin: var(--ft-space-1) 0 0;
    white-space: pre-wrap;
  }

  &__time {
    margin-right: auto;
    color: var(--ft-color-text-muted);
    font-size: var(--ft-font-size-sm);
  }
}
@media (max-width: 600px) {
  .dish-reviews__time {
    flex-basis: 100%;
    margin-right: 0;
  }
}
</style>
