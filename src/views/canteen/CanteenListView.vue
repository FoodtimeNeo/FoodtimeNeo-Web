<script setup>
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchCanteens } from '@/api/canteen.api.js';
import CanteenEntryCard from '@/components/home/CanteenEntryCard.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';

const {
  data: canteens,
  error,
  loading,
  load,
} = useAsyncData(fetchCanteens, { initial: [] });
</script>

<template>
  <main class="canteen-list">
    <div class="section-rule">
      <span class="section-rule__index">02</span>
      <span class="section-rule__line"></span>
    </div>
    <h1 class="section-title">全部<span class="zine-highlight">食堂</span></h1>
    <p class="section-subtitle">一张张食堂拍立得，点进去继续翻档口。</p>

    <LoadingState v-if="loading" message="正在翻开食堂手账…" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <EmptyState
      v-else-if="!canteens.length"
      title="还没有食堂"
      description="管理员添加后会显示在这里。"
    />
    <ul v-else class="canteen-list__grid">
      <li v-for="canteen in canteens" :key="canteen.id">
        <CanteenEntryCard :canteen="canteen" />
      </li>
    </ul>
  </main>
</template>

<style scoped lang="scss">
.canteen-list {
  width: min(calc(100% - var(--zine-page-padding) * 2), var(--page-max-width));
  margin: var(--ft-space-6) auto;

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--ft-space-3);
    margin: var(--ft-space-3) 0 0;
    padding: 0;
    list-style: none;
  }
}

@media (max-width: 768px) {
  .canteen-list {
    width: calc(100% - var(--zine-page-padding-mobile) * 2);
    margin: var(--app-mobile-section-gap) auto;

    &__grid {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: var(--ft-space-2);
    }
  }
}
</style>
