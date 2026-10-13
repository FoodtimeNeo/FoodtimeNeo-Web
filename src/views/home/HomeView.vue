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
  <main class="home-page">
    <header class="home-page__hero">
      <p class="home-page__eyebrow handwrite">FOODTIME · CAMPUS DINING NOTES</p>
      <h1 class="home-page__title">北交干饭吧</h1>
      <p class="home-page__intro">把每天的一餐，写成一页有温度的食堂手账。</p>
    </header>

    <section class="home-page__section" aria-labelledby="canteens-title">
      <div class="section-rule" aria-hidden="true">
        <span class="section-rule__index">01</span>
        <span class="section-rule__line"></span>
      </div>
      <h2 id="canteens-title" class="section-title">
        先挑一个<span class="zine-highlight">食堂</span>
      </h2>

      <LoadingState v-if="loading" message="正在翻开食堂手账…" />
      <ErrorState
        v-else-if="error"
        :description="error.message"
        @retry="load"
      />
      <EmptyState
        v-else-if="!canteens.length"
        title="还没有食堂"
        description="管理员添加后会显示在这里。"
      />
      <ul v-else class="home-page__grid">
        <li v-for="canteen in canteens" :key="canteen.id">
          <CanteenEntryCard :canteen="canteen" />
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped lang="scss">
.home-page {
  width: min(calc(100% - var(--zine-page-padding) * 2), var(--page-max-width));
  margin: var(--ft-space-6) auto;

  &__hero {
    margin-bottom: var(--ft-space-5);
  }

  &__eyebrow {
    margin: 0 0 var(--ft-space-1);
    color: var(--zine-stamp-red);
    font-size: var(--ft-font-size-lg);
  }

  &__title {
    margin: 0;
    font-family: var(--ft-font-family-title);
    font-size: var(--ft-font-size-2xl);
    font-weight: 900;
    line-height: 1.08;
  }

  &__intro {
    margin: var(--ft-space-2) 0 0;
    font-size: var(--ft-font-size-lg);
  }

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
  .home-page {
    width: calc(100% - var(--zine-page-padding-mobile) * 2);
    margin: var(--app-mobile-section-gap) auto;

    &__grid {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: var(--ft-space-2);
    }
  }
}
</style>
