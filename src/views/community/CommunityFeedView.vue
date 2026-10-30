<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  fetchCommunityPosts,
  fetchMyCommunityPosts,
  fetchMyCommunityFavorites,
} from '@/api/community.api.js';
import CommunityPostCard from '@/components/community/CommunityPostCard.vue';
import CommunityPostDetailModal from '@/components/community/CommunityPostDetailModal.vue';
import PostCreateModal from '@/components/community/PostCreateModal.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';

const route = useRoute();

const posts = ref([]);
const loading = ref(false);
const cursor = ref(null);
const mode = ref('public'),
  currentPage = ref(1);
let feedVersion = 0;
const hasMore = ref(false);
const loadError = ref('');
const isCreateModalOpen = ref(false);
const prefillData = ref({});
const activePostId = ref('');
const isDetailModalOpen = ref(false);
const screenWidth = ref(
  typeof window !== 'undefined' ? window.innerWidth : 1200,
);

function handleResize() {
  if (typeof window !== 'undefined') screenWidth.value = window.innerWidth;
}

const columnCount = computed(() => (screenWidth.value <= 768 ? 2 : 3));

function openCreateModal(prefill = null) {
  if (prefill) {
    prefillData.value = prefill;
  }
  isCreateModalOpen.value = true;
}

async function loadFeed(more = false) {
  if (loading.value) return;
  const version = feedVersion;
  loadError.value = '';
  loading.value = true;
  try {
    // 关键需求：新发的帖子需要审核才能展示，故默认只拉取 approved 状态的帖子
    const pageNumber = more ? currentPage.value + 1 : 1;
    const res =
      mode.value === 'public'
        ? await fetchCommunityPosts({ cursor: more ? cursor.value : undefined })
        : await (
            mode.value === 'mine'
              ? fetchMyCommunityPosts
              : fetchMyCommunityFavorites
          )({ page: pageNumber, size: 20 });
    if (version !== feedVersion) return;
    currentPage.value = pageNumber;
    posts.value = more
      ? [...posts.value, ...(res.items || [])]
      : res.items || [];
    cursor.value = res.nextCursor;
    hasMore.value =
      mode.value === 'public' ? !!res.hasMore : pageNumber * 20 < res.total;
  } catch (error) {
    if (version !== feedVersion) return;
    loadError.value = error.message || '加载社区帖子失败';
    ElMessage.error(loadError.value);
  } finally {
    if (version === feedVersion) loading.value = false;
  }
}

// 响应式瀑布流分配算法（电脑端 3 列，手机端 2 列）
const columns = computed(() => {
  const colCount = columnCount.value;
  const cols = Array.from({ length: colCount }, () => []);
  const colHeights = Array.from({ length: colCount }, () => 0);

  for (const post of posts.value) {
    const img = post.images?.[0];
    let estimatedHeight = 240; // 默认基准高度
    if (img && img.width && img.height) {
      const ratio = img.height / img.width;
      const clampedRatio = Math.max(0.7, Math.min(1.4, ratio));
      estimatedHeight = 180 * clampedRatio + 60; // 图片高度 + 标题文本高度
    }

    let minIdx = 0;
    for (let i = 1; i < colCount; i++) {
      if (colHeights[i] < colHeights[minIdx]) {
        minIdx = i;
      }
    }
    cols[minIdx].push(post);
    colHeights[minIdx] += estimatedHeight;
  }

  return cols;
});

function handleCardClick(post) {
  activePostId.value = post.id;
  isDetailModalOpen.value = true;
}

function changeMode(next) {
  feedVersion++;
  mode.value = next;
  loading.value = false;
  posts.value = [];
  cursor.value = null;
  currentPage.value = 1;
  loadFeed();
}
function handlePostCreated() {
  changeMode('mine');
}

onMounted(() => {
  loadFeed();
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
  }
  if (route?.query?.action === 'new' || history.state?.prefill) {
    if (history.state?.prefill) {
      prefillData.value = history.state.prefill;
    }
    isCreateModalOpen.value = true;
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize);
  }
});
</script>

<template>
  <div class="community-feed-view">
    <header class="community-feed-view__header">
      <div class="community-feed-view__banner">
        <h1 class="community-feed-view__title">校园食记 · 社区</h1>
        <img
          src="@/assets/images/decoration02/C/illustrations/C_doodle-sparkles.png"
          alt=""
          class="community-feed-view__banner-sparkle"
          aria-hidden="true"
        />
      </div>
      <!-- 入口一：在社区页右上角放置加号发帖按钮 -->
      <button
        type="button"
        class="community-header-post-btn"
        aria-label="发布新帖子"
        @click="openCreateModal()"
      >
        <span class="btn-plus">＋</span>
        <span>发帖</span>
      </button>
    </header>

    <nav class="community-tabs" aria-label="食记分类">
      <button
        v-for="tab in [
          { id: 'public', label: '发现食记' },
          { id: 'mine', label: '我的食记' },
          { id: 'favorites', label: '我的收藏' },
        ]"
        :key="tab.id"
        type="button"
        :aria-pressed="mode === tab.id"
        @click="changeMode(tab.id)"
      >
        {{ tab.label }}
      </button>
    </nav>
    <p v-if="loadError" role="alert">
      {{ loadError }} <button type="button" @click="loadFeed()">重试</button>
    </p>
    <LoadingState v-if="loading && !posts.length" />

    <EmptyState
      v-else-if="posts.length === 0"
      :title="
        mode === 'public'
          ? '社区暂无公开帖子'
          : mode === 'mine'
            ? '你还没有发布食记'
            : '你还没有收藏食记'
      "
      description="点击右上角「+」号，抢先发布第一篇美食手账吧！"
    />

    <!-- 瀑布流布局 (电脑 3 列，手机 2 列) -->
    <main v-else class="community-waterfall" aria-label="帖子列表">
      <div
        v-for="(col, colIdx) in columns"
        :key="colIdx"
        class="community-waterfall__col"
      >
        <CommunityPostCard
          v-for="post in col"
          :key="post.id"
          :post="post"
          @click="handleCardClick(post)"
        />
      </div>
    </main>

    <button
      v-if="hasMore"
      type="button"
      class="community-more"
      :disabled="loading"
      @click="loadFeed(true)"
    >
      {{ loading ? '加载中…' : '加载更多' }}
    </button>

    <!-- 移动端快捷发帖按钮；桌面端使用页首主按钮 -->
    <button
      type="button"
      class="community-fab-btn"
      aria-label="发布新帖子"
      title="发布新美食帖"
      @click="isCreateModalOpen = true"
    >
      <span class="community-fab-btn__icon">+</span>
    </button>

    <!-- 发帖弹窗 -->
    <PostCreateModal
      v-model="isCreateModalOpen"
      :initial-data="prefillData"
      @created="handlePostCreated"
    />

    <!-- 小红书风格帖子详情弹窗 -->
    <CommunityPostDetailModal
      v-model="isDetailModalOpen"
      :post-id="activePostId"
      @deleted="loadFeed()"
    />
  </div>
</template>

<style scoped lang="scss">
.community-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  button {
    min-height: 44px;
    padding: 8px 16px;
    border: 1px solid var(--ft-color-border);
    background: transparent;
    border-radius: 0;
    color: inherit;
    cursor: pointer;
    &[aria-pressed='true'] {
      color: var(--ft-color-primary);
      border-color: currentColor;
      background: var(--zine-paper-card);
      box-shadow: 2px 2px 0 rgb(58 36 24 / 18%);
    }
  }
}
.community-more {
  display: block;
  margin: 24px auto;
  min-height: 44px;
  padding: 8px 24px;
  cursor: pointer;
}
.community-feed-view {
  position: relative;
  min-height: calc(100vh - 200px);
  padding: var(--ft-space-3, 24px) var(--zine-page-padding, 32px) 80px;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: var(--ft-space-3, 24px);
    border-bottom: 2px dashed var(--ft-color-border, #d5ccbc);
    padding-bottom: var(--ft-space-2, 16px);
  }

  &__banner {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__title {
    margin: 0;
    font-size: 26px;
    font-family: var(--ft-font-family-title, serif);
    font-weight: 900;
    color: var(--ft-color-primary, #c9341e);
    letter-spacing: 0.5px;
  }

  &__banner-sparkle {
    width: 24px;
    height: auto;
    opacity: 0.85;
    transform: rotate(10deg);
    pointer-events: none;
  }
}

/* 瀑布流容器 (电脑 3 列，手机 2 列) */
.community-waterfall {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
  max-width: 1080px;
  margin: 0 auto;

  &__col {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
}

.community-header-post-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: var(--ft-color-primary, #c9341e);
  color: #fff;
  border: 1px solid var(--ft-color-primary-strong, #ab1f0b);
  border-radius: 0;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 2px 2px 0 var(--ft-color-primary-strong, #ab1f0b);
  transition: all var(--ft-transition-fast, 180ms ease);
  flex: none;

  &:hover {
    background: var(--ft-color-primary-strong, #ab1f0b);
    transform: translateY(-1px);
    box-shadow: 3px 3px 0 var(--ft-color-primary-strong, #ab1f0b);
  }

  .btn-plus {
    font-size: 18px;
    line-height: 1;
    font-weight: 800;
    margin-top: -1px;
  }
}

/* 右下角悬浮发帖按钮 (Floating Action Button) */
.community-fab-btn {
  position: fixed;
  right: 28px;
  bottom: 84px;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: var(--ft-color-primary, #c9341e);
  color: #fff;
  border: 2px solid #fff;
  box-shadow:
    0 6px 18px rgb(171 31 11 / 40%),
    0 2px 4px rgb(58 36 24 / 20%);
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 50;
  transition:
    transform var(--ft-transition-fast, 180ms ease),
    background var(--ft-transition-fast, 180ms ease),
    box-shadow var(--ft-transition-fast, 180ms ease);

  &:hover {
    transform: scale(1.08) rotate(90deg);
    background: var(--ft-color-primary-strong, #ab1f0b);
    box-shadow: 0 8px 24px rgb(171 31 11 / 50%);
  }

  &:active {
    transform: scale(0.96);
  }

  &__icon {
    font-size: 36px;
    font-weight: 300;
    line-height: 1;
    margin-top: -3px;
  }
}

@media (max-width: 768px) {
  .community-feed-view {
    padding: var(--ft-space-2, 16px) var(--zine-page-padding-mobile, 14px) 100px;
  }

  .community-waterfall {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .community-fab-btn {
    display: flex;
    right: 20px;
    bottom: calc(var(--app-mobile-tabbar-height, 72px) + 20px);
    width: 52px;
    height: 52px;

    &__icon {
      font-size: 32px;
    }
  }
}
</style>
