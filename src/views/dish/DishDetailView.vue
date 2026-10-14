<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { usePagedData } from '@/composables/usePagedData.js';
import {
  fetchDish,
  fetchDishReviews,
  fetchDishImages,
  fetchDishRating,
} from '@/api/dish.api.js';
import { ApiError } from '@/api/http.js';
import { formatPrice } from '@/utils/mediaUrl.js';
import MediaImage from '@/components/base/MediaImage.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import DishReviewList from '@/components/dish/DishReviewList.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
const route = useRoute();
const dishId = computed(() => String(route.params.dishId));
const { data, error, loading, load } = useAsyncData(async (options) => {
  const dish = await fetchDish(dishId.value, options);
  if (
    dish.diningHallId !== route.params.canteenId ||
    dish.stallId !== route.params.stallId
  )
    throw new ApiError('菜品与当前食堂或档口不匹配', {
      status: 404,
      code: 'NOT_FOUND',
    });
  const [images, rating] = await Promise.all([
    fetchDishImages(dish.id, 1, options),
    fetchDishRating(dish.id, options),
  ]);
  return { dish, images: images.items, rating };
});
const {
  items: reviews,
  page,
  total,
  size,
  error: reviewError,
  loading: reviewLoading,
  load: loadReviews,
} = usePagedData((page, options) =>
  fetchDishReviews(dishId.value, page, options),
);
const params = computed(() => ({
  canteenId: route.params.canteenId,
  stallId: route.params.stallId,
  dishId: dishId.value,
}));
</script>
<template>
  <div class="dish-detail">
    <nav class="dish-detail__back">
      <RouterLink :to="{ name: 'stallDetail', params }">← 返回档口</RouterLink>
    </nav>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <template v-else-if="data">
      <div class="dish-detail__hero">
        <RouterLink
          class="dish-detail__upload-link"
          :to="{ name: 'photoSubmission', params }"
          aria-label="上传菜品图片"
          >＋</RouterLink
        >
        <MediaImage
          :src="data.images[0]?.imageUrl || ''"
          :alt="data.dish.name"
          empty="暂未上传菜品图片"
        />
        <RouterLink
          class="dish-detail__gallery-link"
          :to="{ name: 'dishGallery', params }"
          >图册</RouterLink
        >
      </div>
      <h1 class="section-title">{{ data.dish.name }}</h1>
      <p>{{ data.dish.diningHallName }} · {{ data.dish.stallName }}</p>
      <p class="dish-detail__price">{{ formatPrice(data.dish.price) }}</p>
      <p v-if="data.dish.description">{{ data.dish.description }}</p>
      <h2>评分</h2>
      <p>
        {{
          data.rating.averageScore === null
            ? '暂无评分'
            : Number(data.rating.averageScore).toFixed(2) + ' / 5'
        }}
      </p>
      <p>{{ data.rating.reviewCount }} 条评价 · 每日更新</p>
      <RouterLink
        class="dish-detail__review-link"
        :to="{
          name: 'reviewCreate',
          query: {
            canteenId: params.canteenId,
            stallId: params.stallId,
            dishId,
          },
        }"
        >写点评</RouterLink
      >
      <h2 id="reviews-title">评论</h2>
      <LoadingState v-if="reviewLoading" />
      <ErrorState
        v-else-if="reviewError"
        :description="reviewError.message"
        @retry="loadReviews"
      />
      <EmptyState v-else-if="!reviews.length" title="暂无评论" />
      <DishReviewList v-else :reviews="reviews" />
      <PaginationControls
        :page="page"
        :total="total"
        :size="size"
        :disabled="reviewLoading"
        @change="page = $event"
      />
    </template>
  </div>
</template>

<style scoped lang="scss">
.dish-detail {
  width: min(calc(100% - var(--zine-page-padding) * 2), var(--page-max-width));
  margin: var(--ft-space-5) auto;

  &__back {
    margin-bottom: var(--ft-space-3);

    a {
      color: var(--ft-color-primary);
      font-weight: 700;
      text-decoration: none;
    }
  }

  &__hero {
    position: relative;
    .dish-detail__upload-link {
      position: absolute;
      right: 8px;
      top: 8px;
      z-index: 1;
      min-width: 44px;
      min-height: 44px;
      display: grid;
      place-items: center;
      background: var(--zine-paper-card);
      border: 1px solid var(--ft-color-text);
      font-size: 24px;
    }
    aspect-ratio: 16 / 9;
    overflow: hidden;
    .dish-detail__gallery-link {
      position: absolute;
      right: 8px;
      bottom: 8px;
      padding: 12px;
      background: var(--zine-paper-card);
      border: 1px solid var(--ft-color-text);
    }
    border: 2px solid var(--ft-color-text);
    box-shadow: 6px 6px 0 var(--ft-color-text);
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ft-space-2);
    margin-top: var(--ft-space-3);
  }

  &__price {
    margin: var(--ft-space-1) 0 0;
    font-family: var(--ft-font-family-title);
    font-size: var(--ft-font-size-xl);
    color: var(--ft-color-primary);
  }

  &__desc {
    margin: var(--ft-space-2) 0 0;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ft-space-2);
    margin: var(--ft-space-3) 0;
  }

  &__gallery-link,
  &__review-link {
    color: var(--ft-color-primary);
    font-weight: 700;
    text-decoration: none;
  }

  &__subtitle {
    margin: var(--ft-space-4) 0 0;
    font-family: var(--ft-font-family-title);
    font-size: var(--ft-font-size-xl);
  }
}

@media (max-width: 768px) {
  .dish-detail {
    width: calc(100% - var(--zine-page-padding-mobile) * 2);
  }
}
</style>
