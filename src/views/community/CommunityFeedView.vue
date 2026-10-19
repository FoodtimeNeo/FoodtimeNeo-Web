<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { fetchCommunityPosts } from '@/api/community.api.js';
import CommunityPostCard from '@/components/community/CommunityPostCard.vue';
import PostCreateModal from '@/components/community/PostCreateModal.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';

const route = useRoute();
const router = useRouter();

const posts = ref([]);
const loading = ref(false);
const isCreateModalOpen = ref(false);
const prefillData = ref({});

function openCreateModal(prefill = null) {
  if (prefill) {
    prefillData.value = prefill;
  }
  isCreateModalOpen.value = true;
}

async function loadFeed() {
  loading.value = true;
  try {
    // 关键需求：新发的帖子需要审核才能展示，故默认只拉取 approved 状态的帖子
    const res = await fetchCommunityPosts({ status: 'approved' });
    posts.value = res.items || [];
  } catch (error) {
    ElMessage.error(error.message || '加载社区帖子失败');
  } finally {
    loading.value = false;
  }
}

const isMobile = ref(false);
let mediaQueryList = null;

function handleMediaChange(e) {
  isMobile.value = e.matches;
}

// 响应式瀑布流分配算法（电脑端 3 列，手机端 2 列）
const columns = computed(() => {
  const colCount = isMobile.value ? 2 : 3;
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
  router.push({
    name: 'communityDetail',
    params: { postId: post.id },
  });
}

function handlePostCreated() {
  // 发帖成功后，由于新贴为 pending 待审核状态，无需强制刷新公开 Feed，但可以轻微拉取最新已过审数据
  loadFeed();
}

onMounted(() => {
  loadFeed();
  if (typeof window !== 'undefined' && window.matchMedia) {
    mediaQueryList = window.matchMedia('(max-width: 768px)');
    isMobile.value = mediaQueryList.matches;
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleMediaChange);
    }
  }
  if (route?.query?.action === 'new' || history.state?.prefill) {
    if (history.state?.prefill) {
      prefillData.value = history.state.prefill;
    }
    isCreateModalOpen.value = true;
  }
});

onUnmounted(() => {
  if (mediaQueryList && mediaQueryList.removeEventListener) {
    mediaQueryList.removeEventListener('change', handleMediaChange);
  }
});
</script>

<template>
  <div class="community-feed-view">
    <header class="community-feed-view__header">
      <div class="community-feed-view__banner">
        <h1 class="community-feed-view__title">校园食记 · 社区</h1>
        <p class="community-feed-view__subtitle">
          随手拍、聊美味，发现更多好吃的校园美食
        </p>
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

    <LoadingState v-if="loading" />

    <EmptyState
      v-else-if="posts.length === 0"
      title="社区暂无公开帖子"
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

    <!-- 右下角悬浮「+」发帖按钮 -->
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
  </div>
</template>

<style scoped lang="scss">
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
    flex-direction: column;
    gap: 4px;
  }

  &__title {
    margin: 0;
    font-size: 26px;
    font-family: var(--ft-font-family-title, serif);
    font-weight: 900;
    color: var(--ft-color-primary, #c9341e);
    letter-spacing: 0.5px;
  }

  &__subtitle {
    margin: 0;
    font-size: 14px;
    color: var(--ft-color-text-muted, #6e5547);
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
  border-radius: var(--ft-radius-pill, 999px);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 10px rgb(171 31 11 / 30%);
  transition: all var(--ft-transition-fast, 180ms ease);
  flex: none;

  &:hover {
    background: var(--ft-color-primary-strong, #ab1f0b);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgb(171 31 11 / 40%);
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
  display: flex;
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
