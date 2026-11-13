<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useBrowsingHistoryStore } from '@/store/useBrowsingHistoryStore.js';
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
import DishFavoriteButton from '@/components/canteen/DishFavoriteButton.vue';
import CatalogQuickActions from '@/components/admin/CatalogQuickActions.vue';
import CatalogCorrectionDialog from '@/components/catalog/CatalogCorrectionDialog.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
const route = useRoute();
const browsingHistory = useBrowsingHistoryStore();
const dishId = computed(() => String(route.params.dishId));
const {
  data: dish,
  error,
  initialLoading: loading,
  loading: dishPending,
  load,
} = useAsyncData(
  async (options) => {
    const dish = await fetchDish(dishId.value, options);
    if (
      dish.diningHallId !== route.params.canteenId ||
      dish.stallId !== route.params.stallId
    )
      throw new ApiError('菜品与当前食堂或档口不匹配', {
        status: 404,
        code: 'NOT_FOUND',
      });
    return dish;
  },
  {
    cacheKey: `dish:${route.params.canteenId}:${route.params.stallId}:${dishId.value}`,
    ttl: 0,
  },
);
const {
  data: images,
  error: imageError,
  initialLoading: imagesLoading,
  load: loadImages,
} = useAsyncData((options) => fetchDishImages(dishId.value, 1, options), {
  initial: { items: [] },
  immediate: false,
});
const {
  data: rating,
  error: ratingError,
  initialLoading: ratingLoading,
  load: loadRating,
} = useAsyncData((options) => fetchDishRating(dishId.value, options), {
  immediate: false,
});
watch(dishPending, (pending) => {
  if (!pending && dish.value && !error.value) {
    loadImages();
    loadRating();
    void browsingHistory.record('dish', dishId.value);
  }
});
const data = computed(() =>
  dish.value
    ? {
        dish: dish.value,
        images: images.value.items,
        rating: rating.value,
      }
    : null,
);
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
const correctionOpen = ref(false);
const correctionTarget = computed(() =>
  dish.value
    ? {
        type: 'dish',
        id: dish.value.id,
        revision: dish.value.revision,
        name: dish.value.name,
        description: dish.value.description,
        price: dish.value.price,
        summary: `${dish.value.diningHallName} · ${dish.value.stallName} · ${dish.value.name}`,
      }
    : null,
);
</script>
<template>
  <div class="dish-detail">
    <nav class="dish-detail__back">
      <RouterLink :to="{ name: 'stallDetail', params }">← 返回档口</RouterLink>
    </nav>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <template v-else-if="data">
      <article class="dish-detail__main">
        <div
          class="dish-detail__hero"
          :class="{ 'dish-detail__hero--empty': !data.images.length }"
        >
          <ErrorState
            v-if="imageError"
            :description="imageError.message"
            @retry="loadImages"
          />
          <MediaImage
            v-else
            fit="contain"
            :src="data.images[0]?.imageUrl || ''"
            :alt="data.dish.name"
            :empty="imagesLoading ? '正在加载图片…' : '暂未上传菜品图片'"
          />
          <div class="dish-detail__photo-actions">
            <RouterLink
              class="dish-detail__upload-link"
              :to="{ name: 'photoSubmission', params }"
              aria-label="上传菜品图片"
              >上传图片</RouterLink
            >
            <RouterLink
              class="dish-detail__gallery-link sticker sticker--r2"
              :to="{ name: 'dishGallery', params }"
              >翻看图册</RouterLink
            >
          </div>
        </div>
        <div class="dish-detail__content">
          <span class="stamp">今日主角</span>
          <h1 class="section-title">{{ data.dish.name }}</h1>
          <p class="dish-detail__meta">
            {{ data.dish.diningHallName }} · {{ data.dish.stallName }}
          </p>
          <p class="dish-detail__price">{{ formatPrice(data.dish.price) }}</p>
          <DishFavoriteButton :key="dishId" :dish-id="dishId" />
          <CatalogQuickActions
            :id="dishId"
            type="dishes"
            :back-to="{ name: 'stallDetail', params }"
            @updated="load"
            @images-changed="loadImages"
          />
          <p v-if="data.dish.description" class="dropcap">
            {{ data.dish.description }}
          </p>
          <div class="dish-detail__rating">
            <LoadingState v-if="ratingLoading" />
            <ErrorState
              v-else-if="ratingError"
              :description="ratingError.message"
              @retry="loadRating"
            />
            <template v-else-if="data.rating">
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
            </template>
          </div>
          <div class="dish-detail__actions">
            <RouterLink
              class="dish-detail__review-link button-ink is-primary"
              :to="{
                name: 'dishReviewCreate',
                params,
              }"
              >写点评</RouterLink
            >
            <button
              type="button"
              class="button-ink"
              :disabled="!correctionTarget"
              @click="correctionOpen = true"
            >
              纠错
            </button>
          </div>
        </div>
      </article>
      <section class="dish-detail__reviews" aria-labelledby="reviews-title">
        <div class="section-rule">
          <span class="section-rule__index">05</span>
          <span class="section-rule__line"></span>
        </div>
        <div class="dish-reviews__header">
          <h2 id="reviews-title" class="section-title">
            同学们的<span class="zine-highlight">评论</span>
          </h2>
          <img
            src="@/assets/images/decoration02/C/illustrations/C_doodle-heart.png"
            alt=""
            class="dish-reviews__decor-heart"
            aria-hidden="true"
          />
        </div>
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
    <CatalogCorrectionDialog
      v-model="correctionOpen"
      :target="correctionTarget"
    />
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
    display: flex;
    flex-direction: column;
    align-self: start;
    min-width: 0;
    overflow: hidden;
    :deep(.media-image) {
      height: auto;
      min-height: 120px;
    }
    :deep(img) {
      height: auto;
      max-height: clamp(220px, 55svh, 500px);
    }
  }
  &__photo-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px;
    a {
      flex: 1;
      min-height: 44px;
      padding: 8px 12px;
      display: grid;
      place-items: center;
      text-align: center;
      transform: none;
      background: var(--zine-paper-card);
      border: 1px solid var(--ft-color-text);
      border-radius: 12px;
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

  .dish-reviews__header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: var(--ft-space-3);

    .section-title {
      margin: 0;
    }

    .dish-reviews__decor-heart {
      width: 26px;
      height: auto;
      opacity: 0.85;
      transform: rotate(10deg);
      pointer-events: none;
    }
  }
}

@media (max-width: 768px) {
  .dish-detail {
    width: calc(100% - var(--zine-page-padding-mobile) * 2);

    &__main {
      grid-template-columns: 1fr;
    }

    &__hero {
      :deep(img) {
        max-height: clamp(200px, 55svh, 420px);
      }
    }

    &__hero--empty {
      aspect-ratio: auto;
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
