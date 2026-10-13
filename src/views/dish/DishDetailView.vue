<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAsyncData } from '@/composables/useAsyncData.js';
import {
  avoidDish,
  fetchDish,
  fetchDishReviews,
  recommendDish,
} from '@/api/dish.api.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import InkButton from '@/components/base/InkButton.vue';
import DishReviewList from '@/components/dish/DishReviewList.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';

const route = useRoute();
const auth = useAuthStore();
const canteenId = computed(() => String(route.params.canteenId));
const dishId = computed(() => String(route.params.dishId));

const {
  data: dish,
  error,
  loading,
  load,
} = useAsyncData(() => fetchDish(dishId.value));

const {
  data: reviews,
  error: reviewError,
  loading: reviewLoading,
  load: loadReviews,
} = useAsyncData(() => fetchDishReviews(dishId.value), { initial: [] });

// 本地票数，乐观更新；失败回滚。voting 防重复点击。
const recommendVotes = ref(0);
const avoidVotes = ref(0);
const voting = ref(false);

// 详情加载完成后，把后端票数同步到本地状态。
watch(dish, (value) => {
  if (value) {
    recommendVotes.value = value.recommendVotes ?? 0;
    avoidVotes.value = value.avoidVotes ?? 0;
  }
});

async function vote(kind) {
  if (voting.value) return;
  if (!auth.isAuthenticated) {
    ElMessage.warning('登录后才能投票');
    return;
  }
  voting.value = true;
  const target = kind === 'recommend' ? recommendVotes : avoidVotes;
  target.value += 1; // 乐观更新
  try {
    await (kind === 'recommend' ? recommendDish : avoidDish)(dishId.value);
    ElMessage.success(kind === 'recommend' ? '已推荐' : '已避雷');
  } catch (err) {
    target.value -= 1; // 回滚
    ElMessage.error(err.message || '操作失败');
  } finally {
    voting.value = false;
  }
}
</script>

<template>
  <main class="dish-detail">
    <nav class="dish-detail__back">
      <RouterLink :to="{ name: 'canteenDetail', params: { canteenId } }">
        ← 返回食堂
      </RouterLink>
    </nav>

    <LoadingState v-if="loading" message="正在端上这道菜…" />
    <ErrorState
      v-else-if="error"
      :title="error.code === 'NOT_FOUND' ? '菜品不存在' : '暂时无法加载'"
      :description="error.message"
      @retry="load"
    />
    <template v-else-if="dish">
      <div class="dish-detail__hero">
        <img
          class="dish-detail__image"
          :src="dish.imageUrl"
          :alt="dish.name"
          width="960"
          height="540"
        />
      </div>

      <header class="dish-detail__head">
        <h1 class="section-title">{{ dish.name }}</h1>
        <span class="zine-rating-stamp dish-detail__rating">
          {{ (dish.rating ?? 0).toFixed(1) }}
        </span>
      </header>

      <p v-if="dish.price" class="dish-detail__price">¥{{ dish.price }}</p>
      <p v-if="dish.description" class="dish-detail__desc">
        {{ dish.description }}
      </p>

      <div class="dish-detail__actions">
        <InkButton
          variant="primary"
          :disabled="voting"
          @click="vote('recommend')"
        >
          推荐 · {{ recommendVotes }}
        </InkButton>
        <InkButton :disabled="voting" @click="vote('avoid')">
          避雷 · {{ avoidVotes }}
        </InkButton>
        <RouterLink
          class="dish-detail__gallery-link"
          :to="{
            name: 'dishGallery',
            params: { canteenId, dishId },
          }"
        >
          查看图册 →
        </RouterLink>
      </div>

      <section aria-labelledby="reviews-title">
        <h2 id="reviews-title" class="dish-detail__subtitle">
          大家的<span class="zine-highlight">点评</span>
        </h2>

        <LoadingState v-if="reviewLoading" message="正在翻点评…" />
        <ErrorState
          v-else-if="reviewError"
          :description="reviewError.message"
          @retry="loadReviews"
        />
        <EmptyState
          v-else-if="!reviews.length"
          title="还没有点评"
          description="成为第一个点评这道菜的人。"
        />
        <DishReviewList v-else :reviews="reviews" />
      </section>
    </template>
  </main>
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
    aspect-ratio: 16 / 9;
    overflow: hidden;
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
  }
}
</style>
