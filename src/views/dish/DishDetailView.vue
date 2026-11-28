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
import { recordedPrice } from '@/utils/priceHistory.js';
import { dishTagBadges } from '@/utils/dishTags.js';
import { getDishCoverImage } from '@/utils/homeVisuals.js';
import MediaImage from '@/components/base/MediaImage.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import DishReviewList from '@/components/dish/DishReviewList.vue';
import DishFavoriteButton from '@/components/canteen/DishFavoriteButton.vue';
import CatalogQuickActions from '@/components/admin/CatalogQuickActions.vue';
import CatalogCorrectionDialog from '@/components/catalog/CatalogCorrectionDialog.vue';
import LoadingState from '@/components/base/LoadingState.vue';
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
        images: images.value.items || [],
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
        priceUnit: dish.value.priceUnit,
        summary: `${dish.value.diningHallName} · ${dish.value.stallName} · ${dish.value.name}`,
      }
    : null,
);

const defaultIllustration = computed(() => {
  if (!dish.value) return '';
  return getDishCoverImage(dish.value);
});
</script>

<template>
  <div class="dish-detail">
    <nav class="dish-detail__back">
      <RouterLink :to="{ name: 'stallDetail', params }">← 返回档口</RouterLink>
    </nav>

    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />

    <template v-else-if="data">
      <!-- 核心主卡片：左右平衡布局 -->
      <article class="dish-detail__main">
        <!-- 左侧图片区：紧凑 4:3 比例，消除巨型空框 -->
        <div class="dish-detail__hero-box">
          <ErrorState
            v-if="imageError"
            :description="imageError.message"
            @retry="loadImages"
          />

          <!-- 有用户实拍图时展示实拍图 -->
          <template v-else-if="data.images.length > 0">
            <MediaImage
              fit="cover"
              :src="data.images[0]?.imageUrl || ''"
              :alt="data.dish.name"
              class="dish-detail__media-photo"
            />
            <!-- 图册数量 > 0 时在角落显示查看图册 (N) 入口 -->
            <RouterLink
              class="dish-detail__gallery-badge"
              :to="{ name: 'dishGallery', params }"
              aria-label="查看菜品图册"
            >
              <span class="badge-icon">📷</span>
              <span>查看图册 ({{ data.images.length }})</span>
            </RouterLink>
            <!-- 浮动小巧上传入口 -->
            <RouterLink
              class="dish-detail__upload-badge"
              :to="{ name: 'photoSubmission', params }"
              aria-label="补充上传图片"
            >
              <span>+ 上传</span>
            </RouterLink>
          </template>

          <!-- 无实拍图时：以手账插画作为背景底图，居中呈现精致的“+ 贡献首张实拍图”按钮 -->
          <div v-else class="dish-detail__empty-photo">
            <img
              :src="defaultIllustration"
              :alt="data.dish.name"
              class="dish-detail__illustration-bg"
            />
            <div class="dish-detail__empty-overlay">
              <span class="dish-detail__empty-badge">{{
                imagesLoading ? '正在读取图册…' : '暂未上传实拍图'
              }}</span>
              <RouterLink
                class="dish-detail__contribute-btn button-ink is-primary"
                :to="{ name: 'photoSubmission', params }"
                aria-label="贡献首张实拍图"
              >
                + 贡献首张实拍图
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- 右侧信息区：去噪、聚焦、收敛按钮层级 -->
        <div class="dish-detail__content">
          <div class="dish-detail__header-row">
            <h1 class="dish-detail__title">{{ data.dish.name }}</h1>
            <CatalogQuickActions
              :id="dishId"
              type="dishes"
              :back-to="{ name: 'stallDetail', params }"
              @updated="load"
              @images-changed="loadImages"
            />
          </div>

          <p class="dish-detail__meta">
            {{ data.dish.diningHallName }} · {{ data.dish.stallName }}
          </p>

          <div
            v-if="data.dish.tags?.length"
            class="dish-detail__tags"
            aria-label="菜品标签"
          >
            <span
              v-for="badge in dishTagBadges(data.dish.tags, undefined, 8)"
              :key="badge.code"
              class="dish-detail__tag"
            >
              {{ badge.label }}
            </span>
          </div>

          <!-- 价格栏与轻量辅助操作（纠错与价格走势降级为轻量文字图标链接） -->
          <div class="dish-detail__price-bar">
            <span class="dish-detail__price">
              {{ recordedPrice(data.dish.price, data.dish.priceUnit) }}
            </span>
            <div class="dish-detail__price-actions">
              <RouterLink
                class="dish-detail__text-action"
                :to="{ name: 'dishPriceHistory', params }"
                title="查看价格波动走势"
              >
                <span class="action-icon">📈</span>价格走势
              </RouterLink>
              <span class="action-divider">/</span>
              <button
                type="button"
                class="dish-detail__text-action"
                :disabled="!correctionTarget"
                title="向管理员反馈信息有误"
                @click="correctionOpen = true"
              >
                <span class="action-icon">✎</span>纠错
              </button>
            </div>
          </div>

          <p v-if="data.dish.description" class="dish-detail__desc dropcap">
            {{ data.dish.description }}
          </p>

          <!-- 评分统计栏（已删除冗余的“实时统计”等字样） -->
          <div class="dish-detail__rating-box">
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
              <div class="dish-detail__rating-meta">
                <span class="rating-title">综合评分</span>
                <span
                  v-if="data.rating.averageScore === null"
                  class="rating-val"
                  >暂无评分</span
                >
                <span v-else class="rating-val">
                  {{ Number(data.rating.averageScore).toFixed(2) }} / 5
                </span>
                <span class="rating-count">
                  {{ data.rating.reviewCount }} 条评价
                </span>
              </div>
            </template>
          </div>

          <!-- 核心操作区：写点评为主按钮，想吃为次按钮并排 -->
          <div class="dish-detail__cta-row">
            <RouterLink
              class="dish-detail__review-btn button-ink is-primary"
              :to="{ name: 'dishReviewCreate', params }"
            >
              写点评
            </RouterLink>
            <DishFavoriteButton
              :key="dishId"
              :dish-id="dishId"
              class="dish-detail__favorite-btn"
            />
          </div>
        </div>
      </article>

      <!-- 页面下半部分：同学真实点评专区，填补底部大面积留白 -->
      <section class="dish-detail__reviews" aria-labelledby="reviews-title">
        <div class="section-rule">
          <span class="section-rule__index">02</span>
          <span class="section-rule__line"></span>
        </div>

        <div class="dish-reviews__header">
          <div class="dish-reviews__title-wrap">
            <h2 id="reviews-title" class="section-title">
              同学<span class="zine-highlight">真实点评</span>
            </h2>
            <span v-if="total > 0" class="dish-reviews__count-tag">
              {{ total }} 条真实手账
            </span>
            <img
              src="@/assets/images/decoration02/C/illustrations/C_doodle-heart.png"
              alt=""
              class="dish-reviews__decor-heart"
              aria-hidden="true"
            />
          </div>

          <RouterLink
            class="dish-reviews__quick-write-btn"
            :to="{ name: 'dishReviewCreate', params }"
          >
            ＋ 我也来记一笔
          </RouterLink>
        </div>

        <LoadingState v-if="reviewLoading" />
        <ErrorState
          v-else-if="reviewError"
          :description="reviewError.message"
          @retry="loadReviews"
        />

        <!-- 0条评价时：具有手账温情与号召力的空状态卡片，消除底部突兀留白 -->
        <div v-else-if="!reviews.length" class="dish-reviews__empty-card">
          <img
            src="@/assets/images/decoration/手绘美食01.png"
            alt=""
            class="dish-reviews__empty-sketch"
            aria-hidden="true"
          />
          <div class="dish-reviews__empty-body">
            <h3 class="dish-reviews__empty-heading">还没有同学留下点评~</h3>
            <p class="dish-reviews__empty-sub">
              味道如何？分量够吗？避雷还是力荐？快来写下第一份实吃体验，给交大干饭人指路！
            </p>
            <RouterLink
              class="button-ink is-primary dish-reviews__empty-action"
              :to="{ name: 'dishReviewCreate', params }"
            >
              写第一条点评
            </RouterLink>
          </div>
        </div>

        <!-- 评论列表与分页 -->
        <template v-else>
          <DishReviewList :reviews="reviews" :actions="reviewActions" />
          <PaginationControls
            :page="page"
            :total="total"
            :size="size"
            :disabled="reviewLoading"
            @change="page = $event"
          />
        </template>
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
      transition: color var(--ft-transition-fast);

      &:hover {
        color: var(--ft-color-primary-strong, #ab1f0b);
        text-decoration: underline;
      }
    }
  }

  /* 核心主体卡片 */
  &__main {
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
    overflow: hidden;
    border: 1px solid var(--ft-border-subtle);
    background: var(--zine-paper-card);
    box-shadow: var(--ft-shadow-card);
    border-radius: var(--ft-radius-lg);
  }

  /* 紧凑 4:3 左侧图片展示区 */
  &__hero-box {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    background: var(--zine-paper-card-alt);
    border-right: 1px solid var(--ft-border-subtle);
    display: flex;
    align-items: center;
    justify-content: center;

    :deep(.media-image) {
      width: 100%;
      height: 100%;
    }

    :deep(img) {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  /* 角标：查看图册 (N) */
  &__gallery-badge {
    position: absolute;
    bottom: 12px;
    right: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: rgb(var(--ft-overlay-surface-rgb) / 0.9);
    border: 1px solid var(--ft-border-control);
    border-radius: var(--ft-radius-pill);
    font-size: 13px;
    font-weight: 700;
    color: var(--ft-color-text);
    text-decoration: none;
    box-shadow: var(--ft-shadow-card);
    backdrop-filter: blur(8px);
    transition: all var(--ft-transition-fast);
    z-index: 2;

    &:hover {
      background: var(--zine-paper-card);
      transform: translateY(-1px);
      box-shadow: var(--ft-shadow-card-hover);
      color: var(--ft-color-primary);
    }
  }

  /* 浮动小上传入口 */
  &__upload-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    padding: 5px 12px;
    background: rgb(var(--ft-overlay-surface-rgb) / 0.88);
    border: 1px solid var(--ft-border-control);
    border-radius: var(--ft-radius-pill);
    font-size: 12px;
    font-weight: 700;
    color: var(--ft-color-text);
    text-decoration: none;
    backdrop-filter: blur(8px);
    z-index: 2;
    transition: all var(--ft-transition-fast);

    &:hover {
      background: var(--zine-paper-card);
      color: var(--ft-color-primary);
    }
  }

  /* 无实拍图时的手账插画底图与居中贡献入口 */
  &__empty-photo {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__illustration-bg {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: saturate(0.85) contrast(0.95);
    opacity: 0.65;
    transform: scale(1.02);
  }

  &__empty-overlay {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at center,
      rgb(var(--ft-overlay-paper-rgb) / 0.72) 0%,
      rgb(var(--ft-overlay-paper-rgb) / 0.9) 100%
    );
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 20px;
  }

  &__empty-badge {
    font-size: 13px;
    font-family: var(--ft-font-family-note);
    color: var(--ft-color-text-muted);
    background: rgb(var(--ft-overlay-surface-rgb) / 0.85);
    padding: 3px 12px;
    border-radius: var(--ft-radius-pill);
    border: 1px solid var(--ft-border-subtle);
  }

  &__contribute-btn {
    font-size: 14px;
    padding: 8px 18px;
    text-decoration: none;
  }

  /* 右侧信息区 */
  &__content {
    padding: clamp(24px, 3.5vw, 36px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--ft-space-2, 12px);
  }

  &__header-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  &__title {
    margin: 0;
    font-family: var(--ft-font-family-title);
    font-size: clamp(32px, 4vw, 48px);
    font-weight: 900;
    line-height: 1.1;
    color: var(--ft-color-secondary);
  }

  &__meta {
    margin: 0;
    color: var(--ft-color-text-muted);
    font-size: 14px;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: var(--ft-radius-pill);
    background: var(--zine-paper-card-alt);
    border: 1px solid var(--ft-border-subtle);
    color: var(--ft-color-secondary);
    font-size: 12px;
    font-weight: 700;
  }

  /* 价格栏与轻量文字图标链接 */
  &__price-bar {
    display: flex;
    align-items: baseline;
    gap: 16px;
    flex-wrap: wrap;
    margin: 4px 0;
  }

  &__price {
    font-family: var(--ft-font-family-title);
    font-size: clamp(26px, 3vw, 34px);
    font-weight: 900;
    color: var(--ft-color-primary);
    line-height: 1;
  }

  &__price-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  &__text-action {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    padding: 2px 4px;
    font-size: 13px;
    font-weight: 700;
    color: var(--ft-color-text-muted);
    text-decoration: none;
    cursor: pointer;
    transition: color var(--ft-transition-fast);

    .action-icon {
      font-size: 12px;
    }

    &:hover:not(:disabled) {
      color: var(--ft-color-primary);
      text-decoration: underline;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .action-divider {
    color: var(--ft-border-control);
    font-size: 12px;
  }

  &__desc {
    margin: 0;
    color: var(--ft-color-secondary);
    font-size: 14px;
    line-height: 1.6;
  }

  /* 评分统计栏 */
  &__rating-box {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
    background: var(--zine-paper-card-alt);
    border: 1px solid var(--ft-border-subtle);
    border-radius: var(--ft-radius-md);
    margin: 4px 0 8px;
  }

  &__rating-meta {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;

    .rating-title {
      font-weight: 800;
      font-size: 13px;
      color: var(--ft-color-secondary);
    }

    .rating-val {
      font-family: var(--ft-font-family-title);
      font-weight: 900;
      color: var(--ft-color-primary);
      font-size: 15px;
    }

    .rating-count {
      font-size: 12px;
      color: var(--ft-color-text-muted);
    }
  }

  .zine-rating-stamp {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: 1.5px solid var(--zine-stamp-red);
    color: var(--zine-stamp-red);
    font-weight: 900;
    font-size: 15px;
    font-family: var(--ft-font-family-title);
    transform: none;
    border-radius: 50%;
  }

  /* 核心操作按钮行（主次分明并排） */
  &__cta-row {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-top: 6px;
  }

  &__review-btn {
    font-size: 15px;
    padding: 10px 28px;
    text-decoration: none;
    font-weight: 800;
  }

  &__favorite-btn {
    :deep(button) {
      font-size: 15px;
      padding: 10px 22px;
      font-weight: 700;
      background: var(--zine-paper-card);
    }
  }

  /* 下半部分：同学真实点评专区 */
  &__reviews {
    margin-top: var(--ft-space-6, 48px);
  }

  .dish-reviews__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: var(--ft-space-3);
    flex-wrap: wrap;

    .dish-reviews__title-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-title {
      margin: 0;
    }

    .dish-reviews__count-tag {
      font-size: 12px;
      color: var(--ft-color-text-muted);
      font-weight: 700;
      background: var(--zine-paper-card-alt);
      padding: 3px 10px;
      border-radius: var(--ft-radius-pill);
      border: 1px solid var(--ft-border-subtle);
    }

    .dish-reviews__decor-heart {
      width: 24px;
      height: auto;
      opacity: 0.85;
      transform: rotate(10deg);
      pointer-events: none;
    }

    .dish-reviews__quick-write-btn {
      font-size: 13px;
      font-weight: 700;
      color: var(--ft-color-primary);
      text-decoration: none;
      padding: 7px 16px;
      border: 1px solid rgb(201 52 30 / 32%);
      border-radius: var(--ft-radius-pill);
      background: var(--zine-stamp-red-soft);
      transition: all var(--ft-transition-fast);

      &:hover {
        background: var(--ft-color-primary);
        color: #fff;
        border-color: var(--ft-color-primary);
      }
    }
  }

  /* 空状态手账卡片 */
  .dish-reviews__empty-card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 28px;
    padding: 36px 24px;
    background: var(--zine-paper-card);
    border: 1px dashed var(--ft-border-control);
    border-radius: var(--ft-radius-lg);
    box-shadow: var(--ft-shadow-card);
    margin: var(--ft-space-3) 0;

    .dish-reviews__empty-sketch {
      width: 110px;
      height: auto;
      opacity: 0.85;
      transform: rotate(-3deg);
      pointer-events: none;
    }

    .dish-reviews__empty-body {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      max-width: 440px;
    }

    .dish-reviews__empty-heading {
      margin: 0;
      font-family: var(--ft-font-family-title);
      font-size: 20px;
      color: var(--ft-color-secondary);
    }

    .dish-reviews__empty-sub {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--ft-color-text-muted);
    }

    .dish-reviews__empty-action {
      margin-top: 6px;
      font-size: 14px;
      padding: 8px 22px;
      text-decoration: none;
    }
  }
}

@media (max-width: 768px) {
  .dish-detail {
    width: calc(100% - var(--zine-page-padding-mobile) * 2);

    &__main {
      grid-template-columns: 1fr;
    }

    &__hero-box {
      border-right: none;
      border-bottom: 1px solid var(--ft-border-subtle);
    }

    &__content {
      padding: var(--app-mobile-card-padding);
    }

    &__cta-row {
      width: 100%;

      .dish-detail__review-btn,
      .dish-detail__favorite-btn {
        flex: 1;
        text-align: center;
      }

      :deep(button) {
        width: 100%;
      }
    }

    .dish-reviews__empty-card {
      flex-direction: column;
      text-align: center;
      gap: 16px;
      padding: 28px 16px;

      .dish-reviews__empty-body {
        align-items: center;
      }
    }
  }
}
</style>
