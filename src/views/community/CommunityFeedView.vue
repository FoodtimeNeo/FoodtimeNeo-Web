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
const input = ref('');
const keyword = ref('');
const searchOpen = ref(false);
const refreshing = ref(false);
const pull = ref(0);
const tabs = [
  { id: 'following', label: '关注' },
  { id: 'public', label: '发现' },
  { id: 'favorites', label: '收藏' },
  { id: 'mine', label: '我的食记' },
];
let gesture;
const publicMode = computed(
  () => mode.value === 'public' || mode.value === 'following',
);
const emptyTitle = computed(() => {
  if (publicMode.value && keyword.value) return '没有匹配的食记';
  if (mode.value === 'following') return '关注的人还没有公开食记';
  if (mode.value === 'mine') return '你还没有发布食记';
  if (mode.value === 'favorites') return '你还没有收藏食记';
  return '社区暂无公开帖子';
});
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
  // 预填数据只属于一次发帖入口；普通发帖必须从空表单开始。
  prefillData.value = prefill || {};
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
    const res = publicMode.value
      ? await fetchCommunityPosts({
          cursor: more ? cursor.value : undefined,
          ...(mode.value === 'following' ? { following: true } : {}),
          ...(keyword.value ? { q: keyword.value } : {}),
        })
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
    hasMore.value = publicMode.value
      ? !!res.hasMore
      : pageNumber * 20 < res.total;
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

function changeMode(next, reload = false) {
  if (next === mode.value && !reload) return;
  feedVersion++;
  mode.value = next;
  refreshing.value = false;
  loading.value = false;
  posts.value = [];
  cursor.value = null;
  hasMore.value = false;
  currentPage.value = 1;
  loadFeed();
}
function search() {
  const query = input.value.trim();
  if (query === keyword.value) return;
  keyword.value = query;
  changeMode(mode.value, true);
}

function toggleSearch() {
  const wasOpen = searchOpen.value && publicMode.value;
  if (!publicMode.value) changeMode('public');
  searchOpen.value = !wasOpen;
  if (!searchOpen.value) {
    input.value = '';
    search();
  }
}

function startGesture(event) {
  if (event.touches.length !== 1) {
    cancelGesture();
    return;
  }
  const finger = event.touches[0];
  gesture = { x: finger.clientX, y: finger.clientY, top: window.scrollY <= 0 };
}

function moveGesture(event) {
  if (!gesture || event.touches.length !== 1) return;
  const finger = event.touches[0];
  const dx = finger.clientX - gesture.x;
  const dy = finger.clientY - gesture.y;
  if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 10) {
    if (Math.abs(dx) > Math.abs(dy) * 1.3) gesture.axis = 'swipe';
    else if (gesture.top && dy > 0 && !loading.value) gesture.axis = 'pull';
    else gesture.axis = 'scroll';
  }
  if (gesture.axis === 'pull') {
    if (!event.cancelable) {
      cancelGesture();
      return;
    }
    event.preventDefault();
    pull.value = Math.min(66, Math.max(0, (dy - 10) * 0.55));
  } else if (gesture.axis === 'swipe' && event.cancelable) {
    event.preventDefault();
  }
}

function cancelGesture() {
  gesture = undefined;
  pull.value = 0;
}

async function endGesture(event) {
  if (!gesture) return;
  const finger = event.changedTouches[0];
  const dx = finger.clientX - gesture.x;
  const dy = finger.clientY - gesture.y;
  const axis = gesture.axis;
  cancelGesture();
  if (axis === 'swipe' && Math.abs(dx) >= 64 && Math.abs(dx) > Math.abs(dy)) {
    const index = tabs.findIndex(({ id }) => id === mode.value);
    const next = tabs[index + (dx < 0 ? 1 : -1)];
    if (next) changeMode(next.id);
  } else if (axis === 'pull' && dy >= 88 && !loading.value) {
    const version = feedVersion;
    refreshing.value = true;
    await loadFeed();
    if (version === feedVersion) refreshing.value = false;
  }
}
function handlePostCreated() {
  // 提交成功后，旧的点评预填内容不能再次注入新弹窗。
  prefillData.value = {};
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
      <nav class="community-tabs" aria-label="食记分类">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :aria-pressed="mode === tab.id"
          @click="changeMode(tab.id)"
        >
          {{ tab.label }}
        </button>
      </nav>
      <div class="community-tools">
        <button
          class="community-tools__search"
          type="button"
          aria-label="搜索食记"
          :aria-expanded="searchOpen && publicMode"
          @click="toggleSearch"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m15.2 15.2 5.3 5.3" />
          </svg>
        </button>
        <RouterLink :to="{ name: 'home' }" aria-label="回到食堂首页">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path d="m3 10.5 9-7.5 9 7.5M5.5 9.5V20h13V9.5M10 20v-6h4v6" />
          </svg>
        </RouterLink>
      </div>
    </header>
    <form
      v-if="searchOpen && publicMode"
      class="community-search"
      role="search"
      @submit.prevent="search"
    >
      <label for="community-keyword">搜索食记</label>
      <input
        id="community-keyword"
        v-model="input"
        type="search"
        maxlength="50"
        placeholder="菜名、档口或关键词"
      />
      <button class="button-ink" type="submit">搜索</button>
    </form>
    <div
      class="community-stream"
      @touchstart.passive="startGesture"
      @touchmove="moveGesture"
      @touchend="endGesture"
      @touchcancel="cancelGesture"
    >
      <span
        class="community-refresh"
        :class="{
          'is-visible': pull > 0 || refreshing,
          'is-dragging': pull > 0,
          'is-refreshing': refreshing,
        }"
        :style="{ '--pull-offset': `${refreshing ? 44 : pull}px` }"
        :aria-hidden="!refreshing"
        role="status"
        aria-label="正在刷新食记"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M5 8a8 8 0 1 1-1 7M5 8V3M5 8h5" />
        </svg>
      </span>
      <div class="community-feed-view__banner">
        <h1 class="community-feed-view__title">校园食记 · 社区动态</h1>
        <p>随手拍、聊美味，看看同学们今天都在打卡什么好吃的。</p>
        <span class="community-feed-view__sketches" aria-hidden="true"></span>
      </div>
      <p v-if="loadError && !posts.length" role="alert">
        {{ loadError }} <button type="button" @click="loadFeed()">重试</button>
      </p>
      <LoadingState v-if="loading && !refreshing && !posts.length" />

      <EmptyState
        v-else-if="posts.length === 0"
        :title="emptyTitle"
        :description="
          keyword && publicMode
            ? '试试其他关键词。'
            : mode === 'following'
              ? '在食记或用户搜索中关注感兴趣的同学。'
              : ''
        "
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
    </div>

    <Teleport to="body">
      <button
        type="button"
        class="community-fab-btn"
        aria-label="发布新帖子"
        title="发布新美食帖"
        @click="openCreateModal()"
      >
        <span class="community-fab-btn__icon">+</span>
      </button>
    </Teleport>

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
.community-feed-view {
  min-height: calc(100vh - 200px);
  padding: 16px var(--zine-page-padding, 32px) 80px;

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid var(--ft-color-border);
  }

  &__banner {
    padding: 16px 0 12px;

    p {
      margin: 5px 0 2px;
      color: var(--ft-color-text-muted);
      font-family: var(--ft-font-family-note);
    }
  }

  &__title {
    margin: 0;
    font: 900 clamp(21px, 4vw, 26px) var(--ft-font-family-title, serif);
  }

  &__sketches {
    display: block;
    width: 80px;
    height: 26px;
    background:
      var(--zine-decor-food-sketch-2) left / 34px auto no-repeat,
      var(--zine-decor-food-sketch-4) right / 34px auto no-repeat;
    pointer-events: none;
  }
}

.community-tabs {
  display: flex;
  flex: 1;
  min-width: 0;

  button {
    position: relative;
    flex: 1;
    min-height: 44px;
    padding: 4px;
    border: 0;
    background: transparent;
    color: var(--ft-color-text-muted);
    font: inherit;
    white-space: nowrap;
    cursor: pointer;

    &[aria-pressed='true'] {
      color: var(--ft-color-primary);
      font-weight: 700;
    }

    &[aria-pressed='true']::after {
      position: absolute;
      right: calc(50% - 9px);
      bottom: 0;
      width: 18px;
      height: 3px;
      border-radius: 2px;
      background: currentColor;
      content: '';
    }
  }
}

.community-tools {
  display: flex;
  flex: none;

  a,
  button {
    display: grid;
    width: 42px;
    height: 44px;
    place-items: center;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--ft-color-text);
    cursor: pointer;

    &:hover,
    &:focus-visible {
      color: var(--ft-color-primary);
    }
  }

  svg {
    width: 22px;
    height: 22px;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
}

.community-search {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 10px 0 0;

  input {
    min-width: 0;
    flex: 1;
    min-height: 44px;
    padding: 8px 12px;
    border: 1px solid var(--ft-color-border);
    background: var(--zine-paper-card);
    font-size: 16px;
  }
}

.community-stream {
  position: relative;
  min-height: 45dvh;
  touch-action: pan-y pinch-zoom;
}

.community-refresh {
  position: absolute;
  z-index: 1;
  top: 0;
  left: calc(50% - 20px);
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid var(--ft-color-border);
  border-radius: 50%;
  background: var(--zine-paper-card);
  box-shadow: 0 3px 9px rgb(58 36 24 / 14%);
  color: var(--ft-color-primary);
  opacity: 0;
  transform: translateY(calc(var(--pull-offset) - 28px));
  transition:
    transform 180ms ease-out,
    opacity 180ms ease-out;
  pointer-events: none;

  &.is-visible {
    opacity: 1;
  }

  &.is-dragging {
    transition: opacity 100ms ease-out;
  }

  svg {
    width: 24px;
    height: 24px;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &.is-refreshing svg {
    animation: community-spin 0.85s linear infinite;
  }
}

@keyframes community-spin {
  to {
    transform: rotate(360deg);
  }
}

.community-waterfall {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
  max-width: 1080px;
  margin: 0 auto;

  &__col {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  :deep(.community-post-card) {
    border-color: var(--ft-color-border);
    border-radius: 10px;
    box-shadow: none;
  }
}

.community-more {
  display: block;
  margin: 20px auto;
  min-height: 44px;
  padding: 8px 24px;
  cursor: pointer;
}

.community-fab-btn {
  position: fixed;
  z-index: 24;
  right: 24px;
  bottom: 24px;
  display: grid;
  width: 52px;
  height: 52px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--ft-color-primary);
  box-shadow: 0 4px 14px rgb(58 36 24 / 22%);
  color: #fff;
  cursor: pointer;

  &:hover {
    background: var(--ft-color-primary-strong);
  }

  &__icon {
    font:
      300 32px / 1 system-ui,
      sans-serif;
  }
}

@media (max-width: 768px) {
  .community-feed-view {
    padding: 8px var(--zine-page-padding-mobile, 14px) 74px;
  }

  .community-waterfall {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .community-fab-btn {
    right: 16px;
    bottom: calc(
      var(--app-mobile-tabbar-height) + var(--app-mobile-safe-bottom) + 12px
    );
  }
}

@media (prefers-reduced-motion: reduce) {
  .community-refresh {
    transition: none;
  }

  .community-refresh.is-refreshing svg {
    animation: none;
  }
}
</style>
