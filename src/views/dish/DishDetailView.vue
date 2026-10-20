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
import * as reviewActions from '@/api/review.api.js';
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
      <article class="dish-detail__main torn-edge">
        <div
          class="dish-detail__hero"
          :class="{ 'dish-detail__hero--empty': !data.images.length }"
        >
          <RouterLink
            class="dish-detail__upload-link"
            :to="{ name: 'photoSubmission', params }"
            aria-label="上传菜品图片"
            >＋</RouterLink
          >
          <MediaImage
            frame="polygon"
            :src="data.images[0]?.imageUrl || ''"
            :alt="data.dish.name"
            empty="暂未上传菜品图片"
          />
          <RouterLink
            class="dish-detail__gallery-link sticker sticker--r2"
            :to="{ name: 'dishGallery', params }"
            >翻看图册</RouterLink
          >
        </div>
        <div class="dish-detail__content">
          <span class="stamp">今日主角</span>
          <h1 class="section-title">{{ data.dish.name }}</h1>
          <p class="dish-detail__meta">
            {{ data.dish.diningHallName }} · {{ data.dish.stallName }}
          </p>
          <p class="dish-detail__price">{{ formatPrice(data.dish.price) }}</p>
          <p v-if="data.dish.description" class="dropcap">
            {{ data.dish.description }}
          </p>
          <div class="dish-detail__rating">
            <span class="zine-rating-stamp">
              {{
                data.rating.averageScore === null
                  ? '—'
                  : Number(data.rating.averageScore).toFixed(1)
              }}
            </span>
            <p>
              <strong>综合评分</strong>
              <span v-if="data.rating.averageScore === null">暂无评分</span>
              <span v-else
                >{{ Number(data.rating.averageScore).toFixed(2) }} / 5</span
              >
              {{ data.rating.reviewCount }} 条评价 · 实时统计
            </p>
          </div>
          <RouterLink
            class="dish-detail__review-link button-ink is-primary"
            :to="{
              name: 'dishReviewCreate',
              params,
            }"
            >写点评</RouterLink
          >
        </div>
      </article>
      <section class="dish-detail__reviews" aria-labelledby="reviews-title">
        <div class="section-rule">
          <span class="section-rule__index">05</span>
          <span class="section-rule__line"></span>
        </div>
        <h2 id="reviews-title" class="section-title">
          同学们的<span class="zine-highlight">评论</span>
        </h2>
        <p class="section-subtitle">星级和文字都来自审核通过的真实点评。</p>
        <LoadingState v-if="reviewLoading" />
        <ErrorState
          v-else-if="reviewError"
          :description="reviewError.message"
          @retry="loadReviews"
        />
        <EmptyState v-else-if="!reviews.length" title="还没有同学点评" />
        <DishReviewList v-else :reviews="reviews" :actions="reviewActions" />
        <PaginationControls
          :page="page"
          :total="total"
          :size="size"
          :disabled="reviewLoading"
          @change="page = $event"
        />
      </section>
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
    overflow: hidden;
    .dish-detail__gallery-link {
      position: absolute;
      right: 8px;
      bottom: 8px;
      padding: 12px;
      background: var(--zine-paper-card);
      border: 1px solid var(--ft-color-text);
    }
  }

  &__main {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    overflow: hidden;
    border: 1px solid var(--ft-color-secondary);
    background: var(--ft-color-surface);
  }

  &__content {
    padding: var(--ft-space-3);

    h1 {
      margin-top: 12px;
      font-size: clamp(44px, 6vw, 74px);
      line-height: 0.9;
    }
  }

  &__meta {
    color: var(--ft-color-text-muted);
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

  &__rating {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: var(--ft-space-3) 0;

    p {
      display: grid;
      gap: 4px;
      margin: 0;
      color: var(--ft-color-text-muted);
    }
  }

  &__reviews {
    margin-top: var(--ft-space-5);
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

  &__gallery-link {
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

    &__main {
      grid-template-columns: 1fr;
    }

    &__hero {
      aspect-ratio: 16 / 10;
    }

    &__hero--empty {
      aspect-ratio: auto;
      height: 120px;

      :deep(.media-image span) {
        max-width: calc(100% - 100px);
        margin-right: auto;
      }
    }

    &__content {
      padding: var(--app-mobile-card-padding);

      h1 {
        font-size: clamp(34px, 10vw, 44px);
        line-height: 1.05;
      }
    }
  }
}
</style>
