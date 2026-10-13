<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchStalls } from '@/api/canteen.api.js';
import DishPriceCard from '@/components/canteen/DishPriceCard.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';

const route = useRoute();
const canteenId = computed(() => String(route.params.canteenId));
const stallId = computed(() => String(route.params.stallId));

// 后端档口序列化已内嵌 dishes，这里取食堂的档口列表再定位当前档口，
// 避免为单档口再加一个尚不存在的接口。
const {
  data: stalls,
  error,
  loading,
  load,
} = useAsyncData(() => fetchStalls(canteenId.value), { initial: [] });

const stall = computed(
  () => stalls.value.find((item) => String(item.id) === stallId.value) ?? null,
);
const dishes = computed(() => stall.value?.dishes ?? []);
</script>

<template>
  <main class="stall-detail">
    <nav class="stall-detail__back">
      <RouterLink :to="{ name: 'canteenDetail', params: { canteenId } }">
        ← 返回食堂
      </RouterLink>
    </nav>

    <LoadingState v-if="loading" message="正在走到档口前…" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <ErrorState
      v-else-if="!stall"
      title="档口不存在"
      description="它可能已被下架，返回食堂看看其他档口。"
      @retry="load"
    />
    <template v-else>
      <header class="stall-detail__header">
        <h1 class="section-title">{{ stall.name }}</h1>
        <p v-if="stall.summary" class="stall-detail__summary">
          {{ stall.summary }}
        </p>
      </header>

      <EmptyState
        v-if="!dishes.length"
        title="这个档口还没有菜品"
        description="管理员添加后会显示在这里。"
      />
      <ul v-else class="stall-detail__list">
        <li v-for="dish in dishes" :key="dish.id">
          <DishPriceCard :dish="dish" :canteen-id="canteenId" />
        </li>
      </ul>
    </template>
  </main>
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
