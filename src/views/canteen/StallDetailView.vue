<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchStalls, fetchStallDishes } from '@/api/canteen.api.js';
import { ApiError } from '@/api/http.js';
import { useCatalogSearch } from '@/composables/useCatalogSearch.js';
import CatalogSearch from '@/components/canteen/CatalogSearch.vue';
import DishPriceCard from '@/components/canteen/DishPriceCard.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
const route = useRoute();
const canteenId = computed(() => String(route.params.canteenId));
const stallId = computed(() => String(route.params.stallId));
const { data, error, loading, load } = useAsyncData(async (options) => {
  const stalls = await fetchStalls(canteenId.value, options);
  const stall = stalls.find((item) => item.id === stallId.value);
  if (!stall)
    throw new ApiError('档口不存在或已停用', {
      status: 404,
      code: 'NOT_FOUND',
    });
  const dishes = await fetchStallDishes(stall.id, options);
  return {
    stall,
    dishes,
  };
});
const { query, matches: dishes } = useCatalogSearch(
  () => data.value?.dishes || [],
  () => `dishes:${stallId.value}`,
);
const sortedDishes = computed(() =>
  [...dishes.value].sort(
    (a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1),
  ),
);
</script>
<template>
  <div class="stall-detail">
    <nav class="stall-detail__back">
      <RouterLink :to="{ name: 'canteenDetail', params: { canteenId } }"
        >← 返回食堂</RouterLink
      >
    </nav>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <template v-else-if="data">
      <header class="stall-detail__hero torn-edge">
        <span class="sticker sticker--r-1">档口菜单</span>
        <h1 class="section-title">{{ data.stall.name }}</h1>
        <p class="handwrite">今天想吃什么，就从这张菜单里慢慢挑。</p>
        <RouterLink
          class="button-ink"
          :to="{ name: 'dishSubmission', params: { canteenId, stallId } }"
          >投稿菜品</RouterLink
        >
      </header>
      <div class="section-rule">
        <span class="section-rule__index">04</span>
        <span class="section-rule__line"></span>
      </div>
      <CatalogSearch
        v-if="data.dishes.length"
        v-model="query"
        label="搜索菜品"
        placeholder="输入当前档口的菜名"
        :count="dishes.length"
        :total="data.dishes.length"
        unit="道菜品"
      />
      <EmptyState
        v-if="!dishes.length"
        :title="data.dishes.length ? '没有匹配的菜品' : '这个档口还没有菜品'"
        :description="
          data.dishes.length
            ? '试试其他关键词，或查看全部菜品。'
            : '可以通过上方入口投稿菜品。'
        "
      >
        <button
          v-if="data.dishes.length"
          class="button-ink"
          type="button"
          @click="query = ''"
        >
          查看全部菜品
        </button>
      </EmptyState>
      <ul v-else class="stall-detail__list">
        <li v-for="dish in sortedDishes" :key="dish.id">
          <DishPriceCard
            :dish="dish"
            :canteen-id="canteenId"
            :rating="dish.averageScore ?? null"
          />
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped lang="scss">
.stall-detail {
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

  &__summary {
    margin: var(--ft-space-2) 0 0;
    color: var(--ft-color-text-muted);
  }

  &__hero {
    position: relative;
    margin-bottom: var(--ft-space-4);
    padding: clamp(24px, 5vw, 48px);
    border: 1px solid var(--ft-color-secondary);
    background:
      var(--zine-decor-food-sketch-2) right 28px center / 150px auto no-repeat,
      var(--ft-color-surface);

    p {
      max-width: 620px;
      color: var(--ft-color-primary);
      font-size: 24px;
    }
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--ft-space-2);
    margin: var(--ft-space-3) 0 0;
    padding: 0;
    list-style: none;
  }
}

@media (max-width: 768px) {
  .stall-detail {
    width: calc(100% - var(--zine-page-padding-mobile) * 2);

    &__hero {
      padding: var(--app-mobile-card-padding);
      background: var(--ft-color-surface);
      margin-bottom: var(--ft-space-2);
      h1 {
        font-size: clamp(28px, 7vw, 36px);
        line-height: 1.2;
        overflow-wrap: anywhere;
      }
      p {
        font-family: var(--ft-font-family);
        font-size: var(--ft-font-size-md);
      }
    }

    &__list {
      grid-template-columns: 1fr;
    }
  }
}
</style>
