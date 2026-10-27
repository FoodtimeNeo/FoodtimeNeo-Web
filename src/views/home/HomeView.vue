<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchCanteens } from '@/api/canteen.api.js';
import { fetchCommunityPosts } from '@/api/community.api.js';
import CanteenCarousel from '@/components/home/CanteenCarousel.vue';
import CommunityPostCard from '@/components/community/CommunityPostCard.vue';
import CommunityPostDetailModal from '@/components/community/CommunityPostDetailModal.vue';
import PostCreateModal from '@/components/community/PostCreateModal.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';

const {
  data: canteens,
  error,
  loading,
  load,
} = useAsyncData(fetchCanteens, { initial: [], cacheKey: 'canteens_list' });

// 02 社区动态部分
const communityPosts = ref([]);
const communityLoading = ref(false);
const communityTotal = ref(0);
const isCreateModalOpen = ref(false);
const activePostId = ref('');
const isDetailModalOpen = ref(false);

const screenWidth = ref(
  typeof window !== 'undefined' ? window.innerWidth : 1200,
);

function handleResize() {
  if (typeof window !== 'undefined') {
    screenWidth.value = window.innerWidth;
  }
}

// 响应式列数：超大屏/宽屏 4 列，中等宽屏 3 列，手机端 2 列
const colCount = computed(() => {
  if (screenWidth.value <= 768) return 2;
  if (screenWidth.value <= 1100) return 3;
  return 4;
});

// 真正的贪心高度对齐瀑布流，彻底消除断行空洞与列悬空空白
const waterfallColumns = computed(() => {
  const count = colCount.value;
  const cols = Array.from({ length: count }, () => []);
  const colHeights = Array.from({ length: count }, () => 0);

  // 保证填满网格：4 列取 8 篇（每列正好 2 篇饱满对称），3 列取 6 篇（每列 2 篇），2 列取 6 篇（每列 3 篇）
  const targetSize = count === 4 ? 8 : 6;
  const source = communityPosts.value.slice(0, targetSize);

  for (const post of source) {
    const img = post.images?.[0];
    let estimatedHeight = 220;
    if (img && img.width && img.height) {
      const ratio = img.height / img.width;
      const clampedRatio = Math.max(0.65, Math.min(1.35, ratio));
      estimatedHeight = 160 * clampedRatio + 60;
    }

    let minIdx = 0;
    for (let i = 1; i < count; i++) {
      if (colHeights[i] < colHeights[minIdx]) {
        minIdx = i;
      }
    }
    cols[minIdx].push(post);
    colHeights[minIdx] += estimatedHeight;
  }

  return cols;
});

async function loadCommunityPosts() {
  communityLoading.value = true;
  try {
    const res = await fetchCommunityPosts({
      page: 1,
      size: 16,
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
  activePostId.value = post.id;
  isDetailModalOpen.value = true;
}

onMounted(() => {
  loadCommunityPosts();
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize);
  }
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
      <CanteenCarousel v-else :canteens="canteens" />
    </section>

    <!-- 02 校园食记 · 社区动态（第二部分，饱满紧凑的真实多列瀑布流） -->
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
          <div class="title-with-badge">
            <h2 id="community-title" class="section-title">
              校园食记 · <span class="zine-highlight">社区动态</span>
            </h2>
            <span class="community-hot-badge">今日热门</span>
          </div>
          <p class="section-subtitle">
            随手拍、聊美味，看看同学们今天都在打卡什么好吃的。
          </p>
        </div>
        <div class="home-page__community-actions">
          <button
            type="button"
            class="community-quick-post-btn"
            @click="isCreateModalOpen = true"
          >
            <span>＋ 我来记一笔</span>
          </button>
          <RouterLink
            class="home-page__community-more button-ink"
            :to="{ name: 'community' }"
          >
            进入社区广场 →
          </RouterLink>
        </div>
      </div>

      <LoadingState v-if="communityLoading" />
      <EmptyState
        v-else-if="!communityPosts.length"
        title="暂无社区动态"
        description="快去社区分享你的第一篇美食手账吧！"
      />
      <!-- 紧凑饱满的真实多列瀑布流容器，按高度自平衡，彻底消除断行空洞与右侧悬空 -->
      <div
        v-else
        class="home-community-waterfall"
        :style="{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }"
      >
        <div
          v-for="(col, colIdx) in waterfallColumns"
          :key="colIdx"
          class="home-community-waterfall__col"
        >
          <CommunityPostCard
            v-for="post in col"
            :key="post.id"
            :post="post"
            @click="handlePostClick(post)"
          />
        </div>
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

      <!-- 发帖弹窗 -->
      <PostCreateModal
        v-model="isCreateModalOpen"
        @created="loadCommunityPosts"
      />

      <!-- 小红书风格帖子详情弹窗 -->
      <CommunityPostDetailModal
        v-model="isDetailModalOpen"
        :post-id="activePostId"
      />
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

  .title-with-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;

    .section-title {
      margin: 0;
    }
  }

  .community-hot-badge {
    font-size: 11px;
    font-weight: 800;
    color: var(--ft-color-primary, #c9341e);
    border: 1.5px solid var(--ft-color-primary, #c9341e);
    padding: 1px 6px;
    border-radius: 4px;
    transform: rotate(-2deg);
    background: rgb(201 52 30 / 6%);
    line-height: 1.2;
  }

  &__community-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .community-quick-post-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 8px 16px;
    background: var(--ft-color-primary, #c9341e);
    color: #fff;
    border: 1px solid var(--ft-color-primary-strong, #ab1f0b);
    border-radius: var(--ft-radius-pill, 999px);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 3px 8px rgb(201 52 30 / 25%);
    transition: all var(--ft-transition-fast, 180ms ease);

    &:hover {
      background: var(--ft-color-primary-strong, #ab1f0b);
      transform: translateY(-1px);
      box-shadow: 0 5px 12px rgb(201 52 30 / 35%);
    }

    &:active {
      transform: translateY(1px);
    }
  }

  &__community-more {
    font-size: 14px;
    padding: 8px 18px;
    text-decoration: none;
  }

  /* 紧凑对齐的瀑布流容器 */
  .home-community-waterfall {
    display: grid;
    gap: 14px;
    align-items: start;
    width: 100%;

    &__col {
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-width: 0;

      :deep(.community-post-card) {
        margin-bottom: 0;
      }
    }
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

    &__community-actions {
      width: 100%;
      justify-content: space-between;
    }

    .community-quick-post-btn,
    &__community-more {
      flex: 1;
      text-align: center;
      justify-content: center;
    }
  }
}
</style>
