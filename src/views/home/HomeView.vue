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
  <div class="home-page">
    <header class="home-page__hero">
      <div class="home-page__hero-main">
        <span class="sticker sticker--r-2">食堂日志 · 2026</span>
        <h1 class="home-page__title"><span>北交</span><span>干饭吧</span></h1>
        <p class="home-page__intro handwrite">
          把每次排队、踩雷和真香都记下来。
        </p>
        <RouterLink class="button-ink is-primary" :to="{ name: 'canteenList' }">
          翻开食堂手账
        </RouterLink>
      </div>
      <aside class="home-page__hero-note">
        <p class="home-page__eyebrow">BEIJIAO CANTEEN FIELD NOTES</p>
        <p>这不是餐饮官网，是一群爱吃饭的同学共同写下的校园美食笔记。</p>
        <span class="sticker sticker--r2">今日食堂档案</span>
      </aside>
      <span class="home-page__hero-sketch" aria-hidden="true"></span>
    </header>
    <section class="home-page__section" aria-labelledby="canteens-title">
      <div class="section-rule">
        <span class="section-rule__index">01</span>
        <span class="section-rule__line"></span>
      </div>
      <h2 id="canteens-title" class="section-title">
        选择今天的<span class="zine-highlight">食堂</span>
      </h2>
      <p class="section-subtitle">从真实食堂档案开始，继续翻到档口和菜品。</p>
      <LoadingState v-if="loading" />
      <ErrorState
        v-else-if="error"
        :description="error.message"
        @retry="load"
      />
      <EmptyState v-else-if="!canteens.length" title="暂无食堂" />
      <ul v-else class="home-page__grid">
        <li v-for="canteen in canteens" :key="canteen.id">
          <CanteenEntryCard :canteen="canteen" />
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home-page {
  width: min(calc(100% - var(--zine-page-padding) * 2), var(--page-max-width));
  margin: var(--ft-space-6) auto;

  &__hero {
    position: relative;
    display: grid;
    grid-template-columns: 1.25fr 0.75fr;
    min-height: 430px;
    margin-bottom: var(--ft-space-5);
    overflow: hidden;
    border: 1px solid var(--ft-color-secondary);
    background: var(--ft-color-surface);
    box-shadow:
      0 12px 26px rgb(58 36 24 / 16%),
      inset 0 2px 0 rgb(255 255 255 / 34%);
    clip-path: polygon(
      0 4%,
      8% 1%,
      16% 4%,
      24% 1%,
      32% 4%,
      40% 1%,
      48% 4%,
      56% 1%,
      64% 4%,
      72% 1%,
      80% 4%,
      88% 1%,
      100% 4%,
      100% 100%,
      0 100%
    );
  }

  &__hero-main {
    padding: clamp(32px, 6vw, 62px);
  }

  &__hero-note {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 36px 24px;
    border-left: 1px dashed rgb(58 36 24 / 35%);
    background: rgb(241 236 226 / 64%);

    p {
      color: var(--ft-color-secondary-soft);
      line-height: 1.8;
    }

    .sticker {
      align-self: flex-start;
      margin-top: var(--ft-space-2);
    }
  }

  &__hero-sketch {
    position: absolute;
    top: 12px;
    right: 18px;
    width: 110px;
    height: 82px;
    background: var(--zine-decor-food-sketch-4) center / contain no-repeat;
    opacity: 0.34;
    mix-blend-mode: multiply;
    pointer-events: none;
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

    span {
      display: block;
    }
  }

  &__intro {
    margin: var(--ft-space-2) 0 0;
    font-size: var(--ft-font-size-lg);
    color: var(--ft-color-primary);
    font-size: clamp(20px, 2.5vw, 32px);
  }

  &__section {
    position: relative;
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

    &__hero {
      grid-template-columns: 1fr;
      min-height: 0;
      clip-path: none;
      box-shadow: var(--app-mobile-shadow);
    }

    &__hero-main {
      padding: 28px 20px;
    }

    &__hero-note {
      padding: 20px;
      border-top: 1px dashed rgb(58 36 24 / 35%);
      border-left: 0;
    }

    &__hero-sketch {
      display: none;
    }

    &__grid {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: var(--ft-space-2);
    }
  }
}
</style>
