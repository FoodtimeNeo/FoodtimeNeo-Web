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
let sectionObserver = null;

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

    if ('IntersectionObserver' in window) {
      sectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              sectionObserver?.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.3 },
      );
      document
        .querySelectorAll('.home-page__section')
        .forEach((section) => sectionObserver.observe(section));
    } else {
      document
        .querySelectorAll('.home-page__section')
        .forEach((section) => section.classList.add('is-visible'));
    }
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize);
  }
  sectionObserver?.disconnect();
  sectionObserver = null;
});
</script>

<template>
  <div class="home-page">
    <header class="home-page__hero hero-appear">
      <div class="home-page__hero-main">
        <div class="hero-stagger-1">
          <span class="sticker sticker--r-2">食堂日志 · 2026</span>
        </div>
        <h1 class="home-page__title hero-stagger-2">
          <span>北交</span><span>干饭吧</span>
        </h1>

        <!-- 证明数据纸条 (Proof Points) -->
        <div class="home-page__proof-ribbon hero-stagger-3">
          <div class="proof-item">
            <span class="proof-num">7</span>
            <span class="proof-label">所食堂全收录</span>
          </div>
          <span class="proof-divider" aria-hidden="true">/</span>
          <div class="proof-item">
            <span class="proof-num">130+</span>
            <span class="proof-label">档口避雷</span>
          </div>
          <span class="proof-divider" aria-hidden="true">/</span>
          <div class="proof-item">
            <span class="proof-num">3k+</span>
            <span class="proof-label">实吃手账笔记</span>
          </div>
        </div>

        <div class="home-page__hero-actions hero-stagger-5">
          <RouterLink
            class="button-ink is-primary"
            :to="{ name: 'canteenList' }"
          >
            翻开食堂手账
          </RouterLink>
          <RouterLink
            class="button-ink hero-secondary-link"
            :to="{ name: 'community' }"
          >
            看看大家在吃啥 →
          </RouterLink>
        </div>
      </div>
      <aside
        class="home-page__hero-note hero-stagger-3"
        aria-label="今日食堂档案"
      >
        <div class="hero-polaroid-card">
          <img
            src="@/assets/images/decoration02/B/stickers/B_red-tape-strip.png"
            alt=""
            class="hero-tape-decor"
            aria-hidden="true"
          />
          <img
            src="@/assets/images/decoration02/A/stickers/A_polaroid-noodle.png"
            alt="校园食堂风味手账"
            class="hero-polaroid-media"
          />
          <img
            src="@/assets/images/decoration02/B/stickers/B_better-campus-food-stamp.png"
            alt=""
            class="hero-stamp-decor"
            aria-hidden="true"
          />
        </div>
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
      <div class="section-title-wrap">
        <h2 id="canteens-title" class="section-title">
          选择今天的<span class="zine-highlight">食堂</span>
        </h2>
        <img
          src="@/assets/images/decoration02/A/illustrations/A_rice-bowl-lineart.png"
          alt=""
          class="section-title-doodle"
          aria-hidden="true"
        />
      </div>
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
            <img
              src="@/assets/images/decoration02/C/illustrations/C_doodle-sparkles.png"
              alt=""
              class="community-title-sparkle"
              aria-hidden="true"
            />
          </div>
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
@keyframes heroElemAppear {
  0% {
    opacity: 0;
    transform: translateY(6px);
    filter: blur(2px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

.hero-appear {
  --hero-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --hero-duration: 800ms;

  .hero-stagger-1 {
    animation: heroElemAppear var(--hero-duration) var(--hero-ease) 50ms both;
  }
  .hero-stagger-2 {
    animation: heroElemAppear var(--hero-duration) var(--hero-ease) 110ms both;
  }
  .hero-stagger-3 {
    animation: heroElemAppear var(--hero-duration) var(--hero-ease) 170ms both;
  }
  .hero-stagger-4 {
    animation: heroElemAppear var(--hero-duration) var(--hero-ease) 230ms both;
  }
  .hero-stagger-5 {
    animation: heroElemAppear var(--hero-duration) var(--hero-ease) 290ms both;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-appear [class*='hero-stagger-'],
  .home-page__section,
  .home-page__hero-sketch,
  .community-hot-badge::before {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    transition: none !important;
  }

  .community-hot-badge::before {
    display: none !important;
  }
}

@keyframes heroSketchFloat {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-8px) rotate(2deg);
  }
}

@keyframes stampPulseRing {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  60%,
  100% {
    transform: scale(1.3, 1.45);
    opacity: 0;
  }
}

.home-page {
  width: min(calc(100% - var(--zine-page-padding) * 2), var(--page-max-width));
  margin: var(--ft-space-6) auto;

  &__hero {
    position: relative;
    display: grid;
    grid-template-columns: 1.25fr 0.75fr;
    min-height: 420px;
    margin-bottom: var(--ft-space-5);
    overflow: hidden;
    border: 1.5px solid var(--ft-color-secondary);
    background: var(--ft-color-surface);
    box-shadow: 6px 6px 0 var(--ft-color-secondary);
    border-radius: var(--ft-radius-sm, 2px);
  }

  &__hero-main {
    padding: clamp(32px, 6vw, 62px);
  }

  &__hero-note {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 28px 20px 20px;
    border-left: 1px dashed rgb(58 36 24 / 35%);
    background: rgb(241 236 226 / 64%);

    .hero-polaroid-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: var(--ft-space-2);
      transform: rotate(2deg);
      transition: transform var(--ft-transition-normal);

      &:hover {
        transform: rotate(0deg) scale(1.03);
      }
    }

    .hero-tape-decor {
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%) rotate(-3deg);
      width: 100px;
      height: auto;
      z-index: 2;
      pointer-events: none;
      filter: drop-shadow(0 2px 2px rgba(58, 36, 24, 0.15));
    }

    .hero-polaroid-media {
      max-width: 168px;
      width: 100%;
      height: auto;
      border-radius: 2px;
      filter: drop-shadow(2px 4px 6px rgba(58, 36, 24, 0.16));
    }

    .hero-stamp-decor {
      position: absolute;
      right: -12px;
      bottom: -10px;
      width: 68px;
      height: auto;
      z-index: 3;
      transform: rotate(-10deg);
      pointer-events: none;
      filter: drop-shadow(1px 2px 2px rgba(58, 36, 24, 0.18));
    }

    .sticker {
      align-self: center;
      margin-top: var(--ft-space-1);
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
    animation: heroSketchFloat 4.2s ease-in-out infinite;
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

  &__proof-ribbon {
    display: inline-flex;
    align-items: center;
    gap: var(--ft-space-2);
    margin: var(--ft-space-2) 0 var(--ft-space-3);
    padding: 6px 14px;
    background: var(--zine-paper-card-alt, #f7efd9);
    border: 1px dashed rgb(58 36 24 / 32%);
    border-radius: var(--ft-radius-sm, 2px);
    transform: rotate(-0.5deg);
    box-shadow: 2px 2px 0 rgb(58 36 24 / 8%);

    .proof-item {
      display: inline-flex;
      align-items: baseline;
      gap: 4px;
    }

    .proof-num {
      font-family: var(--ft-font-family-title);
      font-size: 16px;
      font-weight: 800;
      color: var(--ft-color-primary);
    }

    .proof-label {
      font-size: 11px;
      color: var(--ft-color-text-muted);
    }

    .proof-divider {
      color: var(--ft-color-border);
      font-size: 12px;
      user-select: none;
    }
  }

  &__hero-actions {
    display: flex;
    align-items: center;
    gap: var(--ft-space-2);
    flex-wrap: wrap;
    margin-top: var(--ft-space-1);
  }

  .hero-secondary-link {
    font-size: 14px;
    padding: 8px 16px;
    text-decoration: none;
  }

  &__section {
    position: relative;
    opacity: 0;
    transform: translateY(10px);
    filter: blur(4px);
    transition:
      opacity 0.8s cubic-bezier(0.33, 1, 0.68, 1),
      transform 1.05s cubic-bezier(0.16, 1, 0.3, 1),
      filter 0.8s cubic-bezier(0.33, 1, 0.68, 1);

    &.is-visible {
      opacity: 1;
      transform: none;
      filter: none;
    }
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
    gap: var(--ft-space-1, 8px);
    flex-wrap: wrap;

    .section-title {
      margin: 0;
    }
  }

  .section-title-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: var(--ft-space-3, 20px);

    .section-title {
      margin: 0;
    }
  }

  .section-title-doodle {
    width: 38px;
    height: auto;
    opacity: 0.85;
    transform: rotate(-4deg);
    pointer-events: none;
    filter: drop-shadow(1px 2px 0 rgba(58, 36, 24, 0.08));
  }

  .community-title-sparkle {
    width: 22px;
    height: auto;
    opacity: 0.88;
    transform: rotate(10deg);
    pointer-events: none;
  }

  .community-hot-badge {
    position: relative;
    display: inline-block;
    font-size: 11px;
    font-weight: 800;
    color: var(--zine-stamp-red, #b72f1c);
    border: 1.5px solid var(--zine-stamp-red, #b72f1c);
    padding: 1px 6px;
    border-radius: var(--ft-radius-sm, 2px);
    transform: rotate(-2deg);
    background: rgb(183 47 28 / 6%);
    line-height: 1.2;
    transition: transform 180ms cubic-bezier(0.2, 0.8, 0.4, 1.25);

    &::before {
      content: '';
      position: absolute;
      inset: -2px;
      border: 1.5px solid var(--zine-stamp-red, #b72f1c);
      border-radius: inherit;
      pointer-events: none;
      animation: stampPulseRing 2.2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
    }

    &:hover {
      transform: rotate(0deg) scale(1.08);
    }
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
    border: 1.5px solid var(--ft-color-primary-strong, #ab1f0b);
    border-radius: var(--ft-radius-sm, 4px);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 2px 2px 0 var(--ft-color-primary-strong, #ab1f0b);
    transition:
      transform var(--ft-transition-fast, 180ms ease),
      box-shadow var(--ft-transition-fast, 180ms ease);

    &:hover {
      background: var(--ft-color-primary-strong, #ab1f0b);
      transform: translate(-1px, -1px);
      box-shadow: 3px 3px 0 var(--ft-color-primary-strong, #ab1f0b);
    }

    &:active {
      transform: translate(1px, 1px);
      box-shadow: 1px 1px 0 var(--ft-color-primary-strong, #ab1f0b);
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
    gap: var(--ft-space-2, 16px);
    align-items: start;
    width: 100%;

    &__col {
      display: flex;
      flex-direction: column;
      gap: var(--ft-space-2, 16px);
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
    border-radius: var(--ft-radius-sm, 4px);
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

    &__proof-ribbon {
      flex-wrap: wrap;
      gap: var(--ft-space-1, 8px);
      padding: 6px 10px;
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
