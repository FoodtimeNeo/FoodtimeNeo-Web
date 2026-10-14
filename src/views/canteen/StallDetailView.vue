<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchStalls, fetchStallDishes } from '@/api/canteen.api.js';
import { ApiError } from '@/api/http.js';
import DishPriceCard from '@/components/canteen/DishPriceCard.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
const route = useRoute();
const canteenId = computed(() => String(route.params.canteenId));
const stallId = computed(() => String(route.params.stallId));
const query = ref('');
const { data, error, loading, load } = useAsyncData(async (options) => {
  const stalls = await fetchStalls(canteenId.value, options);
  const stall = stalls.find((item) => item.id === stallId.value);
  if (!stall)
    throw new ApiError('档口不存在或已停用', {
      status: 404,
      code: 'NOT_FOUND',
    });
  return { stall, dishes: await fetchStallDishes(stall.id, options) };
});
const dishes = computed(() =>
  (data.value?.dishes || []).filter((dish) =>
    dish.name.includes(query.value.trim()),
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
      <h1 class="section-title">{{ data.stall.name }}</h1>
      <RouterLink
        :to="{ name: 'dishSubmission', params: { canteenId, stallId } }"
        >投稿菜品</RouterLink
      >
      <label>搜索菜品<input v-model="query" type="search" /></label>
      <EmptyState
        v-if="!dishes.length"
        :title="data.dishes.length ? '没有匹配的菜品' : '这个档口还没有菜品'"
      />
      <ul v-else class="stall-detail__list">
        <li v-for="dish in dishes" :key="dish.id">
          <DishPriceCard :dish="dish" :canteen-id="canteenId" />
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

  &__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--ft-space-2);
    margin: var(--ft-space-3) 0 0;
    padding: 0;
    list-style: none;
  }
}

@media (max-width: 768px) {
  .stall-detail {
    width: calc(100% - var(--zine-page-padding-mobile) * 2);

    &__list {
      grid-template-columns: 1fr;
    }
  }
}
</style>
