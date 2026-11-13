<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/store/useAuthStore.js';
import {
  createFavoriteGroup,
  fetchFavoriteGroups,
} from '@/api/favoriteGroups.api.js';
import { deleteDraft, isBlankDraft, loadDraft } from '@/utils/postDraft.js';
import {
  fetchCommunityPosts,
  fetchMyCommunityPosts,
  fetchMyCommunityFavorites,
} from '@/api/community.api.js';
import CommunityPostCard from '@/components/community/CommunityPostCard.vue';
import CommunityPins from '@/components/community/CommunityPins.vue';
import CommunityPinManager from '@/components/community/CommunityPinManager.vue';
import CommunityPostDetailModal from '@/components/community/CommunityPostDetailModal.vue';
import PostCreateModal from '@/components/community/PostCreateModal.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';

const route = useRoute();
const auth = useAuthStore();
const draftSummary = ref(null);
const postGroups = ref([]);
const postGroupId = ref(null);
const postUnfiled = ref(false);
const postGroupsError = ref('');

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function formatDraftTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('zh-CN');
  } catch {
    return '';
  }
}
const draftLabel = computed(() => {
  const draft = draftSummary.value;
  if (!draft) return '';
  return draft.title?.trim() || draft.content?.trim() || '未命名草稿';
});
async function refreshDraftSummary() {
  const user = auth.user;
  if (!user) {
    draftSummary.value = null;
    return;
  }
  try {
    const draft = await loadDraft(window.location.origin, user.id);
    if (!draft || isBlankDraft(draft)) {
      draftSummary.value = null;
      return;
    }
    draftSummary.value = {
      title: draft.title || '',
      content: draft.content || '',
      images: draft.images?.length || 0,
      updatedAt: draft.updatedAt,
      bytes: (draft.images || []).reduce(
        (total, image) => total + (image.blob?.size || 0),
        0,
      ),
    };
  } catch {
    draftSummary.value = null;
  }
}
async function removeDraft() {
  const user = auth.user;
  if (!user) return;
  if (!window.confirm('确定删除本机草稿吗？删除后无法恢复。')) return;
  try {
    await deleteDraft(window.location.origin, user.id);
    draftSummary.value = null;
    ElMessage.success('草稿已删除');
  } catch {
    ElMessage.warning('草稿删除失败，请稍后重试');
  }
}

const mode = ref('public');
const input = ref('');
const keyword = ref('');
const searchOpen = ref(false);
const refreshing = ref(false);
const pull = ref(0);
const tabs = [
  {
    id: 'following',
    label: '关注',
    heading: '关注',
    intro: '看看关注的同学最近都在吃啥，顺便给下一顿找点灵感。',
  },
  {
    id: 'public',
    label: '发现',
    heading: '社区动态',
    intro: '随手拍、聊美味，看看同学们今天都在打卡什么好吃的。',
  },
  {
    id: 'favorites',
    label: '收藏',
    heading: '收藏',
    intro: '把喜欢的校园味道收在这里，馋了就翻一翻，下次再去吃。',
  },
  {
    id: 'mine',
    label: '我的食记',
    heading: '我的',
    intro: '把三餐里的小欢喜记下来，回头翻翻，都是自己的校园味道。',
  },
];
const pages = reactive(
  tabs.map(() => ({
    posts: [],
    pins: null,
    loading: false,
    error: '',
    cursor: null,
    page: 1,
    hasMore: false,
    query: '',
    version: 0,
    loadedAt: null,
  })),
);
const activeIndex = computed(() =>
  tabs.findIndex(({ id }) => id === mode.value),
);
const activePage = computed(() => pages[activeIndex.value]);
const pager = ref(null);
const drag = ref(0);
const dragging = ref(false);
const otherIndex = ref(-1);
const swipeOrigin = ref(-1);
const heldHeight = ref(0);
const incomingTop = ref(0);
const position = computed(() => activeIndex.value + drag.value);
const SETTLE_MS = 240;
const FEED_FRESH_MS = 60_000;
let settleTimer;
let gesture;
const isPublic = (section) => section === 'public' || section === 'following';
const publicMode = computed(() => isPublic(mode.value));

function emptyTitle(section) {
  if (section === 'public' && activePage.value.pins?.items.length)
    return '暂时没有其他食记';
  if (isPublic(section) && keyword.value) return '没有匹配的食记';
  if (section === 'following') return '关注的人还没有公开食记';
  if (section === 'mine') return '你还没有发布食记';
  if (section === 'favorites') return '你还没有收藏食记';
  return '社区暂无公开帖子';
}
const isCreateModalOpen = ref(false);
watch(isCreateModalOpen, (open) => {
  if (!open) void refreshDraftSummary();
});
const prefillData = ref({});
const activePostId = ref('');
const activePost = computed(() =>
  activePage.value.posts.find(({ id }) => id === activePostId.value),
);
const isDetailModalOpen = ref(false);
watch(isDetailModalOpen, (open) => {
  if (!open) void loadPostGroups();
});

async function loadPostGroups() {
  if (!auth.user?.id) {
    postGroups.value = [];
    return;
  }
  postGroupsError.value = '';
  try {
    postGroups.value = await fetchFavoriteGroups('post');
  } catch (error) {
    postGroupsError.value = error.message || '无法读取收藏分组';
  }
}

function selectPostGroup(groupId = null, onlyUnfiled = false) {
  postGroupId.value = groupId;
  postUnfiled.value = onlyUnfiled;
  const feed = pages[tabs.findIndex(({ id }) => id === 'favorites')];
  feed.version += 1;
  feed.loadedAt = null;
  feed.page = 1;
  if (mode.value === 'favorites') loadFeed();
}

async function createPostGroup() {
  const name = window.prompt('新分组名称（1–20 个字符）');
  if (!name?.trim()) return;
  try {
    await createFavoriteGroup('post', name);
    await loadPostGroups();
  } catch (error) {
    postGroupsError.value = error.message || '创建分组失败';
  }
}
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
  const section = mode.value;
  const feed = activePage.value;
  if (feed.loading) return;
  const version = ++feed.version;
  const owner = `${auth.user?.id}:${auth.role}`;
  const query = feed.query;
  feed.error = '';
  feed.loading = true;
  try {
    // 关键需求：新发的帖子需要审核才能展示，故默认只拉取 approved 状态的帖子
    const pageNumber = more ? feed.page + 1 : 1;
    let append = more;
    const readPublic = (append) =>
      fetchCommunityPosts({
        cursor: append ? feed.cursor : undefined,
        ...(section === 'following' ? { following: true } : {}),
        ...(query ? { q: query } : {}),
        ...(append &&
        section === 'public' &&
        !query &&
        Number.isSafeInteger(feed.pins?.revision)
          ? { pinRevision: feed.pins.revision }
          : {}),
      });
    const res = isPublic(section)
      ? await readPublic(append).catch((error) => {
          if (append && error.bizCode === 'PIN_SET_CHANGED') {
            append = false;
            return readPublic(false);
          }
          throw error;
        })
      : await (
          section === 'mine'
            ? fetchMyCommunityPosts
            : (params) => fetchMyCommunityFavorites(params)
        )({
          page: pageNumber,
          size: 20,
          ...(section === 'favorites' && postGroupId.value
            ? { groupId: postGroupId.value }
            : {}),
          ...(section === 'favorites' && postUnfiled.value
            ? { unfiled: true }
            : {}),
        });
    if (version !== feed.version || owner !== `${auth.user?.id}:${auth.role}`)
      return;
    feed.page = append ? pageNumber : 1;
    feed.posts = append
      ? [...feed.posts, ...(res.items || [])]
      : res.items || [];
    feed.pins = section === 'public' && !query ? res.pins || null : null;
    feed.cursor = res.nextCursor;
    feed.hasMore = isPublic(section)
      ? !!res.hasMore
      : pageNumber * 20 < res.total;
    if (!append) feed.loadedAt = Date.now();
  } catch (error) {
    if (version !== feed.version || owner !== `${auth.user?.id}:${auth.role}`)
      return;
    feed.error = error.message || '加载社区帖子失败';
    if (mode.value === section) ElMessage.error(feed.error);
  } finally {
    if (version === feed.version) feed.loading = false;
  }
}

// 响应式瀑布流分配算法（电脑端 3 列，手机端 2 列）
function distribute(posts) {
  const colCount = columnCount.value;
  const cols = Array.from({ length: colCount }, () => []);
  const colHeights = Array.from({ length: colCount }, () => 0);

  for (const post of posts) {
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
}
const columns = computed(() => pages.map((page) => distribute(page.posts)));

function handleCardClick(post) {
  if (dragging.value || settleTimer) return;
  activePostId.value = post.id;
  isDetailModalOpen.value = true;
}

function changeMode(next, reload = false) {
  if (next === mode.value && !reload) return;
  mode.value = next;
  refreshing.value = false;
  const feed = activePage.value;
  const query = publicMode.value ? keyword.value : '';
  if (reload || feed.query !== query) {
    Object.assign(feed, {
      version: feed.version + 1,
      query,
      loading: false,
      posts: [],
      cursor: null,
      hasMore: false,
      page: 1,
      loadedAt: null,
    });
  }
  if (feed.loadedAt === null || Date.now() - feed.loadedAt >= FEED_FRESH_MS)
    loadFeed();
}

function invalidateSection(section) {
  pages[tabs.findIndex(({ id }) => id === section)].loadedAt = null;
}

function pinsChanged() {
  invalidateSection('public');
  if (mode.value === 'public' && !keyword.value) loadFeed();
}

function updatePost(post) {
  for (const page of pages) {
    const index = page.posts.findIndex(({ id }) => id === post.id);
    if (index >= 0) page.posts[index] = post;
  }
  invalidateSection('favorites');
}

function onPostDeleted() {
  for (const page of pages) {
    page.posts = page.posts.filter(({ id }) => id !== activePostId.value);
    page.loadedAt = null;
  }
  loadFeed();
}

function selectTab(section) {
  if (dragging.value || settleTimer) return;
  changeMode(section);
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
  if (settleTimer) return;
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
    else if (gesture.top && dy > 0 && !activePage.value.loading)
      gesture.axis = 'pull';
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
    if (!dragging.value) {
      const bounds = pager.value.getBoundingClientRect();
      heldHeight.value = bounds.height;
      incomingTop.value = Math.max(0, -bounds.top);
      swipeOrigin.value = activeIndex.value;
      dragging.value = true;
    }
    const index = activeIndex.value;
    const width = pager.value.clientWidth || screenWidth.value;
    const fraction = Math.max(-1, Math.min(1, -dx / width));
    const clamped = Math.max(
      -index,
      Math.min(tabs.length - 1 - index, fraction),
    );
    otherIndex.value = clamped ? index + Math.sign(clamped) : -1;
    drag.value = clamped;
  }
}

function finishSlide() {
  clearTimeout(settleTimer);
  settleTimer = undefined;
  otherIndex.value = -1;
  if (incomingTop.value && heldHeight.value && pager.value) {
    const top = pager.value.getBoundingClientRect().top;
    if (top < 0 && swipeOrigin.value !== activeIndex.value) {
      window.scrollBy({ top, behavior: 'instant' });
    }
  }
  heldHeight.value = 0;
  incomingTop.value = 0;
  swipeOrigin.value = -1;
}

function settleSwipe(direction = 0) {
  if (!dragging.value) return;
  const index = activeIndex.value;
  const next = direction && tabs[index + direction];
  dragging.value = false;
  if (next) {
    otherIndex.value = index;
    changeMode(next.id);
  }
  drag.value = 0;
  settleTimer = setTimeout(finishSlide, SETTLE_MS);
}

function cancelGesture() {
  gesture = undefined;
  pull.value = 0;
  settleSwipe();
}

async function endGesture(event) {
  if (!gesture) return;
  const finger = event.changedTouches[0];
  const dx = finger.clientX - gesture.x;
  const dy = finger.clientY - gesture.y;
  const axis = gesture.axis;
  gesture = undefined;
  pull.value = 0;
  if (axis === 'swipe' && Math.abs(dx) >= 64 && Math.abs(dx) > Math.abs(dy)) {
    settleSwipe(dx < 0 ? 1 : -1);
  } else if (axis === 'swipe') {
    settleSwipe();
  } else if (axis === 'pull' && dy >= 88 && !activePage.value.loading) {
    const section = mode.value;
    refreshing.value = true;
    await loadFeed();
    if (section === mode.value) refreshing.value = false;
  }
}
function handlePostCreated() {
  // 提交成功后，旧的点评预填内容不能再次注入新弹窗。
  prefillData.value = {};
  changeMode('mine', true);
}

onMounted(() => {
  loadFeed();
  void refreshDraftSummary();
  void loadPostGroups();
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
  for (const page of pages) page.version++;
  clearTimeout(settleTimer);
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize);
  }
});
</script>

<template>
  <div
    class="community-feed-view"
    :class="{ 'is-sliding': dragging }"
    :style="{ '--slide-duration': `${SETTLE_MS}ms` }"
  >
    <div v-if="draftSummary" class="community-draft" role="status">
      <div class="community-draft__text">
        <strong>本机草稿：{{ draftLabel }}</strong>
        <span>
          {{ formatDraftTime(draftSummary.updatedAt) }} ·
          {{ draftSummary.images }} 张图 · {{ formatBytes(draftSummary.bytes) }}
        </span>
      </div>
      <div class="community-draft__actions">
        <button type="button" @click="openCreateModal()">继续编辑</button>
        <button type="button" class="is-danger" @click="removeDraft">
          删除
        </button>
      </div>
    </div>
    <header class="community-feed-view__header">
      <nav class="community-tabs" aria-label="食记分类">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :aria-pressed="mode === tab.id"
          @click="selectTab(tab.id)"
        >
          {{ tab.label }}
        </button>
        <span
          class="community-tabs__indicator"
          :style="{ transform: `translateX(${position * 100}%)` }"
          aria-hidden="true"
        ></span>
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
    <div v-if="mode === 'favorites'" class="community-groups">
      <button
        type="button"
        :class="{ 'is-active': !postGroupId && !postUnfiled }"
        @click="selectPostGroup()"
      >
        全部
      </button>
      <button
        type="button"
        :class="{ 'is-active': postUnfiled }"
        @click="selectPostGroup(null, true)"
      >
        未分组
      </button>
      <button
        v-for="group in postGroups"
        :key="group.id"
        type="button"
        :class="{ 'is-active': postGroupId === group.id }"
        @click="selectPostGroup(group.id)"
      >
        {{ group.name }} ({{ group.itemCount }})
      </button>
      <button
        type="button"
        class="community-groups__create"
        @click="createPostGroup"
      >
        + 新建分组
      </button>
      <p v-if="postGroupsError" role="alert">{{ postGroupsError }}</p>
    </div>
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
      <div
        ref="pager"
        class="community-pager"
        :style="{ minHeight: heldHeight ? `${heldHeight}px` : undefined }"
      >
        <template v-for="(tab, index) in tabs" :key="tab.id">
          <section
            v-if="index === activeIndex || index === otherIndex"
            class="community-pager__page"
            :class="{ 'is-active': index === activeIndex }"
            :inert="index !== activeIndex"
            :style="{
              transform: `translateX(${(index - position) * 100}%)`,
              top: index !== swipeOrigin ? `${incomingTop}px` : undefined,
            }"
            :aria-label="tab.label"
          >
            <div class="community-feed-view__banner">
              <h1 class="community-feed-view__title">
                校园食记 · {{ tab.heading }}
              </h1>
              <p>{{ tab.intro }}</p>
              <span
                class="community-feed-view__sketches"
                aria-hidden="true"
              ></span>
            </div>
            <div class="community-pager__feed">
              <CommunityPinManager
                v-if="tab.id === 'public' && !pages[index].query"
                @changed="pinsChanged"
              />
              <CommunityPins
                v-if="tab.id === 'public' && !pages[index].query"
                :items="pages[index].pins?.items || []"
                @open="handleCardClick"
              />
              <p
                v-if="pages[index].error && !pages[index].posts.length"
                role="alert"
              >
                {{ pages[index].error }}
                <button type="button" @click="loadFeed()">重试</button>
              </p>
              <LoadingState
                v-if="
                  (pages[index].loading &&
                    !(refreshing && index === activeIndex) &&
                    !pages[index].posts.length) ||
                  (index !== activeIndex &&
                    (!pages[index].version ||
                      (isPublic(tab.id) && pages[index].query !== keyword)))
                "
              />
              <EmptyState
                v-else-if="!pages[index].error && !pages[index].posts.length"
                :title="emptyTitle(tab.id)"
                :description="
                  keyword && isPublic(tab.id)
                    ? '试试其他关键词。'
                    : tab.id === 'following'
                      ? '在食记或用户搜索中关注感兴趣的同学。'
                      : ''
                "
              />
              <div v-else class="community-waterfall" aria-label="帖子列表">
                <div
                  v-for="(col, colIdx) in columns[index]"
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
              </div>
              <button
                v-if="pages[index].hasMore"
                type="button"
                class="community-more"
                :disabled="pages[index].loading"
                @click="loadFeed(true)"
              >
                {{ pages[index].loading ? '加载中…' : '加载更多' }}
              </button>
            </div>
          </section>
        </template>
      </div>
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
      :initial-post="activePost"
      @post-updated="updatePost"
      @post-edited="onPostDeleted"
      @pins-changed="pinsChanged"
      @follow-updated="invalidateSection('following')"
      @deleted="onPostDeleted"
    />
  </div>
</template>

<style scoped lang="scss">
.community-feed-view {
  min-height: calc(100vh - 200px);
  padding: 16px var(--zine-page-padding, 32px) 80px;

  .community-draft {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
    padding: 10px 14px;
    border: 1px dashed var(--ft-color-secondary);
    background: var(--zine-paper-card);
    font-size: var(--ft-font-size-sm);
  }

  .community-draft__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    strong {
      overflow-wrap: anywhere;
    }

    span {
      color: var(--ft-color-text-muted);
    }
  }

  .community-groups {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;

    button {
      border: 1px solid var(--ft-color-secondary);
      background: transparent;
      color: var(--ft-color-text);
      padding: 6px 10px;
      cursor: pointer;
    }

    button.is-active {
      border-color: var(--ft-color-primary);
      background: rgb(201 52 30 / 10%);
    }

    .community-groups__create {
      border-style: dashed;
    }

    p[role='alert'] {
      width: 100%;
      margin: 0;
      color: var(--ft-color-danger);
    }
  }

  .community-draft__actions {
    display: flex;
    gap: 10px;

    button {
      border: 0;
      background: transparent;
      color: var(--ft-color-primary);
      cursor: pointer;
      text-decoration: underline;
    }

    .is-danger {
      color: var(--ft-color-danger);
    }
  }

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
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;

  button {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
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
  }

  &__indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    display: grid;
    width: 25%;
    justify-items: center;
    pointer-events: none;
    transition: transform var(--slide-duration)
      cubic-bezier(0.22, 0.61, 0.36, 1);

    &::after {
      width: 18px;
      height: 3px;
      border-radius: 2px;
      background: var(--ft-color-primary);
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

.community-pager {
  position: relative;
  min-height: 35dvh;
  overflow: clip;

  &__page {
    position: absolute;
    inset: 0 0 auto;
    transition: transform var(--slide-duration)
      cubic-bezier(0.22, 0.61, 0.36, 1);

    &.is-active {
      position: relative;
    }
  }

  &__feed {
    min-height: 35dvh;
  }
}

.is-sliding .community-pager__page,
.is-sliding .community-tabs__indicator {
  transition: none;
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
  .community-refresh,
  .community-pager__page,
  .community-tabs__indicator {
    transition: none;
  }

  .community-refresh.is-refreshing svg {
    animation: none;
  }
}
</style>
