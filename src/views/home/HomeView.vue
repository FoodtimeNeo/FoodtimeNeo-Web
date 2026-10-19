<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchCanteens } from '@/api/canteen.api.js';
import { fetchCommunityPosts } from '@/api/community.api.js';
import CanteenEntryCard from '@/components/home/CanteenEntryCard.vue';
import CommunityPostCard from '@/components/community/CommunityPostCard.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';

const router = useRouter();

const {
  data: canteens,
  error,
  loading,
  load,
} = useAsyncData(fetchCanteens, { initial: [] });

// 02 社区动态部分
const communityPosts = ref([]);
const communityLoading = ref(false);
const communityTotal = ref(0);

const displayPosts = computed(() => communityPosts.value.slice(0, 6));

async function loadCommunityPosts() {
  communityLoading.value = true;
  try {
    const res = await fetchCommunityPosts({
      page: 1,
      size: 6,
      status: 'approved',
    });
    communityPosts.value = res.items || [];
    communityTotal.value = res.total || communityPosts.value.length;
  } catch (err) {
    console.warn('加载首页社区动态失败', err);
  } finally {
    communityLoading.value = false;
  }
}

function handlePostClick(post) {
  router.push({
    name: 'communityDetail',
    params: { postId: post.id },
  });
}

onMounted(() => {
  loadCommunityPosts();
});
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

    <!-- 01 食堂档案 -->
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

    <!-- 02 校园食记 · 社区动态（第二部分） -->
    <section
      class="home-page__section home-page__community-section"
      aria-labelledby="community-title"
    >
      <div class="section-rule">
        <span class="section-rule__index">02</span>
        <span class="section-rule__line"></span>
      </div>
      <div class="home-page__section-header">
        <div class="home-page__section-titles">
          <h2 id="community-title" class="section-title">
            校园食记 · <span class="zine-highlight">社区动态</span>
          </h2>
          <p class="section-subtitle">
            随手拍、聊美味，看看同学们今天都在吃什么。
          </p>
        </div>
        <RouterLink
          class="home-page__community-more button-ink"
          :to="{ name: 'community' }"
        >
          进入社区广场 →
        </RouterLink>
      </div>

      <LoadingState v-if="communityLoading" />
      <EmptyState
        v-else-if="!communityPosts.length"
        title="暂无社区动态"
        description="快去社区分享你的第一篇美食手账吧！"
      />
      <div v-else class="home-page__community-grid">
        <CommunityPostCard
          v-for="post in displayPosts"
          :key="post.id"
          :post="post"
          @click="handlePostClick(post)"
        />
      </div>

      <div v-if="communityPosts.length > 0" class="home-page__community-footer">
        <RouterLink
          :to="{ name: 'community' }"
          class="home-page__community-bottom-btn"
        >
          <span>进入社区广场发现更多（共 {{ communityTotal }} 篇食记）</span>
          <span class="btn-arrow">→</span>
        </RouterLink>
      </div>
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
      90% 4%,
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

  /* 02 社区部分样式 */
  &__community-section {
    margin-top: var(--ft-space-6, 56px);
  }

  &__section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: var(--ft-space-3, 20px);
  }

  &__community-more {
    font-size: 14px;
    padding: 8px 18px;
    text-decoration: none;
  }

  &__community-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 18px;
    align-items: start;
  }

  &__community-footer {
    display: flex;
    justify-content: center;
    margin-top: var(--ft-space-5, 36px);
  }

  &__community-bottom-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 28px;
    background: var(--zine-paper-card, #fffaf0);
    border: 2px solid var(--ft-color-secondary, #3a2418);
    border-radius: var(--ft-radius-pill, 999px);
    box-shadow: 4px 4px 0 var(--ft-color-secondary, #3a2418);
    color: var(--ft-color-secondary, #3a2418);
    font-weight: 700;
    font-size: 14px;
    text-decoration: none;
    transition: all var(--ft-transition-fast, 180ms ease);

    &:hover {
      background: #fff;
      transform: translate(-1px, -1px);
      box-shadow: 5px 5px 0 var(--ft-color-secondary, #3a2418);
      color: var(--ft-color-primary, #c9341e);
    }

    &:active {
      transform: translate(2px, 2px);
      box-shadow: 2px 2px 0 var(--ft-color-secondary, #3a2418);
    }

    .btn-arrow {
      font-size: 16px;
      transition: transform var(--ft-transition-fast, 180ms ease);
    }

    &:hover .btn-arrow {
      transform: translateX(4px);
    }
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

    &__community-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    &__community-more {
      width: 100%;
      text-align: center;
    }
  }
}
</style>
