<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { ElDialog, ElMessage, useZIndex } from 'element-plus';
import {
  addFavoriteGroupMember,
  createFavoriteGroup,
  fetchFavoriteGroupMemberships,
  fetchFavoriteGroups,
  removeFavoriteGroupMember,
} from '@/api/favoriteGroups.api.js';
import { useCommunityRemoval } from '@/composables/useCommunityRemoval.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import {
  fetchFollowStatus,
  followUser,
  unfollowUser,
} from '@/api/follow.api.js';
import {
  fetchCommunityPostDetail,
  recordPostView,
  setPostLike,
  setPostFavorite,
} from '@/api/community.api.js';
import CommunityCommentSection from './CommunityCommentSection.vue';
import ReportButton from '@/components/base/ReportButton.vue';
import DishLink from '@/components/canteen/DishLink.vue';
import CommunityPinManager from './CommunityPinManager.vue';
import CommunityPostEdit from './CommunityPostEdit.vue';
import { shareCommunityPost } from '@/composables/usePostShare.js';
import { safeMediaUrl } from '@/utils/mediaUrl.js';
import CommunityImageViewer from './CommunityImageViewer.vue';
import CommunityPhotoContext from './CommunityPhotoContext.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
const { nextZIndex } = useZIndex();
const modalLayer = ref(0);

/**
 * 小红书风格帖子详情弹窗。
 * 电脑端：居中双栏浮层，左侧自适应完整图片，右侧作者/正文/滚动评论/吸底操作栏。
 * 手机端：小红书原生上下流，顶部常驻返回与作者简栏，上方全宽图片，下方文案评论，底部吸底操作栏。
 */
defineOptions({
  name: 'CommunityPostDetailModal',
});

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  postId: {
    type: String,
    default: '',
  },
  initialPost: { type: Object, default: null },
});

const emit = defineEmits([
  'update:modelValue',
  'close',
  'postUpdated',
  'postEdited',
  'pinsChanged',
  'followUpdated',
  'deleted',
]);

const {
  canRemove,
  remove: removeContent,
  removing,
  outcome,
} = useCommunityRemoval();
const post = ref(null);
const loading = ref(false);
const error = ref(null);
const commentSection = ref(null);
let epoch = 0;
let detailRequest;
const recordedViewCount = ref(0);
const displayedViewCount = computed(() =>
  Math.max(recordedViewCount.value, Number(post.value?.viewCount) || 0),
);
let viewRequestId = '',
  viewRecorded = false,
  recordingView = false;

async function recordView(id, version) {
  if (viewRecorded || recordingView || !post.value) return;
  const requestId = viewRequestId;
  recordingView = true;
  try {
    const result = await recordPostView(id, requestId);
    if (version !== epoch || !props.modelValue || props.postId !== id) return;
    recordedViewCount.value = Math.max(
      recordedViewCount.value,
      Number(result.viewCount) || 0,
    );
    viewRecorded = true;
  } catch {
    // 阅读不等待统计；后续详情刷新用相同请求编号重试。
  } finally {
    if (version === epoch) recordingView = false;
  }
}

const auth = useAuthStore();
const isFollowing = ref(false);
const followBusy = ref(false);
const isLiked = ref(false);
const isFavorited = ref(false);
const groupDialogOpen = ref(false);
const postGroups = ref([]);
const postGroupIds = ref([]);
const groupLoading = ref(false);
const groupBusy = ref(false);
const groupError = ref('');
const newGroupName = ref('');

async function openGroups() {
  const targetId = post.value?.id;
  if (!targetId) return;
  groupDialogOpen.value = true;
  groupLoading.value = true;
  groupError.value = '';
  try {
    const [groups, membership] = await Promise.all([
      fetchFavoriteGroups('post'),
      fetchFavoriteGroupMemberships('post', targetId),
    ]);
    if (post.value?.id !== targetId) return;
    postGroups.value = groups;
    postGroupIds.value = membership.groupIds || [];
  } catch (error) {
    if (post.value?.id !== targetId) return;
    groupError.value = error.message || '无法读取收藏分组';
  } finally {
    groupLoading.value = false;
  }
}

async function togglePostGroup(group) {
  if (!post.value?.id || groupBusy.value) return;
  groupBusy.value = true;
  const joined = postGroupIds.value.includes(group.id);
  try {
    if (joined) {
      await removeFavoriteGroupMember(group.id, post.value.id);
      postGroupIds.value = postGroupIds.value.filter((id) => id !== group.id);
    } else {
      await addFavoriteGroupMember(group.id, post.value.id);
      postGroupIds.value = [...postGroupIds.value, group.id];
    }
    const refreshed = await fetchFavoriteGroups('post');
    postGroups.value = refreshed;
  } catch (error) {
    groupError.value = error.message || '更新分组失败';
  } finally {
    groupBusy.value = false;
  }
}

async function createPostGroup() {
  const name = newGroupName.value.trim();
  if (!name || groupBusy.value) return;
  groupBusy.value = true;
  try {
    await createFavoriteGroup('post', name);
    newGroupName.value = '';
    postGroups.value = await fetchFavoriteGroups('post');
  } catch (error) {
    groupError.value = error.message || '创建分组失败';
  } finally {
    groupBusy.value = false;
  }
}
async function useDefaultGroup() {
  if (!post.value?.id || groupBusy.value) return;
  groupBusy.value = true;
  groupError.value = '';
  try {
    for (const id of [...postGroupIds.value]) {
      await removeFavoriteGroupMember(id, post.value.id);
      postGroupIds.value = postGroupIds.value.filter((value) => value !== id);
    }
    postGroups.value = await fetchFavoriteGroups('post');
  } catch (error) {
    groupError.value = error.message || '更新默认分组失败，请重试';
  } finally {
    groupBusy.value = false;
  }
}
const replyTarget = ref(null);

const quickCommentText = ref('');
const isSubmittingComment = ref(false);
const detailModalRef = ref(null);

function formatPostTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  const pad = (n) => String(n).padStart(2, '0');
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${month}-${day} ${hours}:${minutes}`;
}

async function loadPostData(id) {
  const version = ++epoch;
  if (!id) return;
  recordedViewCount.value = 0;
  viewRequestId = crypto.randomUUID();
  viewRecorded = false;
  recordingView = false;
  detailRequest?.abort();
  detailRequest = new AbortController();
  loading.value = true;
  error.value = null;
  const initial = props.initialPost?.id === id ? props.initialPost : null;
  post.value = initial ? { ...initial } : null;
  isLiked.value = Boolean(initial?.likedByMe);
  isFavorited.value = Boolean(initial?.favoritedByMe);
  isFollowing.value = false;
  replyTarget.value = null;
  quickCommentText.value = '';
  try {
    const result = await fetchCommunityPostDetail(id, {
      signal: detailRequest.signal,
    });
    if (version !== epoch || !props.modelValue || props.postId !== id) return;
    post.value = result;
    recordView(id, version);
    isLiked.value = !!result.likedByMe;
    isFavorited.value = !!result.favoritedByMe;
    isFollowing.value = false;
    const authorId = result.author?.id;
    if (authorId && authorId !== auth.user?.id) {
      fetchFollowStatus(authorId)
        .then((state) => {
          if (version === epoch && props.postId === id) {
            isFollowing.value = state.followed;
          }
        })
        .catch(() => {
          /* 关注状态失败不影响正文浏览 */
        });
    }
  } catch (failure) {
    if (version !== epoch) return;
    if ([401, 403, 404].includes(failure.status)) post.value = null;
    if (!post.value) error.value = failure;
    else ElMessage.error('暂时无法更新食记，已保留当前内容');
  } finally {
    if (version === epoch) loading.value = false;
  }
}
async function onPostEdited() {
  post.value = null;
  replyTarget.value = null;
  quickCommentText.value = '';
  loading.value = true;
  await refreshPost();
  loading.value = false;
  emit('postEdited');
  emit('pinsChanged');
}
async function refreshPost() {
  const id = props.postId,
    version = epoch;
  try {
    const result = await fetchCommunityPostDetail(id);
    if (version === epoch && props.modelValue && props.postId === id) {
      post.value = result;
      recordView(id, version);
      emit('postUpdated', result);
    }
  } catch (failure) {
    if (version === epoch) {
      if (!post.value) error.value = failure;
      ElMessage.error(failure.message || '读取最新食记失败');
    }
  }
}
function selectReply(value) {
  replyTarget.value = value;
  focusCommentInput();
}

watch(
  () => [props.modelValue, props.postId],
  ([isOpen, newId]) => {
    isSubmittingComment.value = false;
    if (isOpen && newId) {
      modalLayer.value = nextZIndex();
      loadPostData(newId);
    } else if (!isOpen) {
      ++epoch;
      detailRequest?.abort();
      post.value = null;
      error.value = null;
      quickCommentText.value = '';
      replyTarget.value = null;
    }
  },
  { immediate: true },
);

function close() {
  if (removing.value) return;
  emit('update:modelValue', false);
  emit('close');
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    close();
  }
}

function handleKeydown(e) {
  if (
    props.modelValue &&
    !removing.value &&
    e.key === 'Escape' &&
    !Array.from(document.querySelectorAll('.el-dialog, .el-message-box')).some(
      (dialog) => dialog.getClientRects().length > 0,
    )
  ) {
    close();
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown);
  }
});

onUnmounted(() => {
  ++epoch;
  detailRequest?.abort();
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown);
  }
});

const liking = ref(false);
const favoriting = ref(false);

async function toggleLike() {
  if (
    !post.value ||
    loading.value ||
    liking.value ||
    post.value.status !== 'approved'
  )
    return;
  const targetId = post.value.id;
  const next = !isLiked.value;
  liking.value = true;
  isLiked.value = next;
  try {
    const res = await setPostLike(targetId, next);
    if (!post.value || post.value.id !== targetId) return;
    post.value.likeCount = res.likeCount;
    post.value.likedByMe = res.liked;
    ElMessage.success(next ? '点赞成功' : '已取消点赞');
    emit('postUpdated', post.value);
  } catch (e) {
    if (post.value?.id === targetId) isLiked.value = !next;
    ElMessage.error(e.message || '操作失败');
  } finally {
    liking.value = false;
  }
}

async function toggleFavorite() {
  if (
    !post.value ||
    loading.value ||
    favoriting.value ||
    post.value.status !== 'approved'
  )
    return;
  const targetId = post.value.id;
  const next = !isFavorited.value;
  favoriting.value = true;
  isFavorited.value = next;
  try {
    const res = await setPostFavorite(targetId, next);
    if (!post.value || post.value.id !== targetId) return;
    post.value.favoriteCount = res.favoriteCount;
    post.value.favoritedByMe = res.favorited;
    ElMessage.success(next ? '收藏成功' : '已取消收藏');
    emit('postUpdated', post.value);
  } catch (e) {
    if (post.value?.id === targetId) isFavorited.value = !next;
    ElMessage.error(e.message || '操作失败');
  } finally {
    favoriting.value = false;
  }
}

async function toggleFollow() {
  const authorId = post.value?.author?.id;
  if (
    !authorId ||
    loading.value ||
    followBusy.value ||
    authorId === auth.user?.id
  )
    return;
  followBusy.value = true;
  try {
    const state = isFollowing.value
      ? await unfollowUser(authorId)
      : await followUser(authorId);
    if (post.value?.author?.id !== authorId) return;
    isFollowing.value = state.followed;
    emit('followUpdated');
    ElMessage.success(state.followed ? '已关注作者' : '已取消关注');
  } catch (error) {
    ElMessage.error(error.message || '关注操作失败，请稍后重试');
  } finally {
    followBusy.value = false;
  }
}

function handleShare() {
  return shareCommunityPost(post.value?.id);
}

function focusCommentInput() {
  nextTick(() => {
    Array.from(
      detailModalRef.value?.querySelectorAll('.redbook-input-pill input') || [],
    )
      .find((input) => input.getClientRects().length)
      ?.focus();
  });
}

async function handleSendComment() {
  const text = quickCommentText.value.trim(),
    version = epoch;
  if (!text || !post.value || isSubmittingComment.value) return;
  isSubmittingComment.value = true;
  try {
    if (await commentSection.value?.submitText(text)) {
      if (version !== epoch) return;
      quickCommentText.value = '';
      replyTarget.value = null;
    }
  } finally {
    if (version === epoch) isSubmittingComment.value = false;
  }
}

async function removePost() {
  if (!post.value || removing.value) return;
  const id = post.value.id;
  try {
    if (
      !(await removeContent('posts', post.value, {
        isCurrent: () => props.modelValue && props.postId === id,
      }))
    )
      return;
    if (post.value?.id !== id || !props.modelValue) return;
    ElMessage.success(
      outcome.value === 'missing' ? '内容已不可见，已更新页面' : '食记已删除',
    );
    close();
    emit('deleted');
  } catch (e) {
    ElMessage.error(e.message || '删除失败');
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="redbook-fade">
      <div
        v-if="modelValue"
        ref="detailModalRef"
        class="redbook-modal"
        :style="{ zIndex: modalLayer }"
        role="dialog"
        aria-modal="true"
        aria-label="帖子详情"
        @click="handleOverlayClick"
      >
        <!-- 电脑端悬浮关闭按钮（> 768px） -->
        <button
          type="button"
          class="redbook-modal__close-btn"
          aria-label="关闭详情弹窗"
          @click="close"
        >
          ×
        </button>

        <!-- 弹窗主体卡片容器 -->
        <div class="redbook-modal__card" @click.stop>
          <LoadingState v-if="loading && !post" />

          <ErrorState
            v-else-if="error"
            :description="error.message || '加载帖子详情失败'"
            @retry="loadPostData(postId)"
          />

          <div v-else-if="post" class="redbook-modal__body">
            <!-- 移动端顶部常驻导航栏（<= 768px） -->
            <header class="redbook-mobile-header">
              <button
                type="button"
                class="mobile-header-btn"
                aria-label="返回"
                @click="close"
              >
                ←
              </button>
              <div class="mobile-header-author">
                <img
                  v-if="safeMediaUrl(post.author?.avatar)"
                  :src="safeMediaUrl(post.author.avatar)"
                  :alt="post.author.name"
                  referrerpolicy="no-referrer"
                  class="mobile-author-avatar"
                />
                <span v-else class="mobile-author-fallback">{{
                  (post.author?.name || '饭')[0]
                }}</span>
                <RouterLink
                  v-if="post.userId"
                  class="mobile-author-name"
                  :to="{
                    name: 'communityAuthor',
                    params: { userId: post.userId },
                  }"
                  @click="emit('update:modelValue', false)"
                  >{{ post.author?.name || '校园干饭人' }}</RouterLink
                >
                <span v-else class="mobile-author-name">{{
                  post.author?.name || '校园干饭人'
                }}</span>
              </div>
              <div class="mobile-header-actions">
                <ReportButton
                  v-if="
                    auth.user?.id &&
                    post.userId !== auth.user.id &&
                    post.status === 'approved'
                  "
                  target-type="post"
                  :target-id="post.id"
                />
                <button
                  v-if="canRemove(post)"
                  type="button"
                  class="mobile-delete-btn"
                  :disabled="removing"
                  @click="removePost"
                >
                  删除
                </button>
                <button
                  v-else-if="post.userId !== auth.user?.id"
                  type="button"
                  class="mobile-follow-btn"
                  :class="{ 'is-following': isFollowing }"
                  :disabled="followBusy"
                  @click="toggleFollow"
                >
                  {{ isFollowing ? '已关注' : '关注' }}
                </button>
                <button
                  type="button"
                  class="mobile-share-btn"
                  aria-label="分享"
                  @click="handleShare"
                >
                  ↗
                </button>
              </div>
            </header>

            <!-- 主内容展示区（左右分栏） -->
            <div class="redbook-layout-main">
              <!-- 左侧：图片区域（自适应尺寸居中，保持原图比例） -->
              <div class="redbook-media-pane">
                <CommunityImageViewer
                  :images="post.images || []"
                  :alt="post.title"
                >
                  <template #context="{ close: closePhoto }">
                    <CommunityPhotoContext
                      v-if="post.status === 'approved'"
                      :post="post"
                      :time="formatPostTime(post.createdAt)"
                      :like-busy="isLiked !== Boolean(post.likedByMe)"
                      @post="closePhoto"
                      @comment="
                        closePhoto();
                        focusCommentInput();
                      "
                      @share="handleShare"
                      @like="toggleLike"
                    />
                  </template>
                </CommunityImageViewer>
              </div>

              <!-- 右侧：作者信息、正文、滚动评论 -->
              <div class="redbook-info-pane">
                <!-- 作者栏（PC 端展示） -->
                <header class="redbook-author-bar">
                  <div class="redbook-author-avatar-wrap">
                    <img
                      v-if="safeMediaUrl(post.author?.avatar)"
                      :src="safeMediaUrl(post.author.avatar)"
                      :alt="post.author.name"
                      referrerpolicy="no-referrer"
                      class="redbook-author-avatar"
                    />
                    <div v-else class="redbook-author-fallback">
                      {{ (post.author?.name || '饭')[0] }}
                    </div>
                  </div>
                  <div class="redbook-author-meta">
                    <RouterLink
                      v-if="post.userId"
                      class="redbook-author-name"
                      :to="{
                        name: 'communityAuthor',
                        params: { userId: post.userId },
                      }"
                      @click="emit('update:modelValue', false)"
                      >{{ post.author?.name || '校园干饭人' }}</RouterLink
                    >
                    <span v-else class="redbook-author-name">{{
                      post.author?.name || '校园干饭人'
                    }}</span>
                  </div>
                  <ReportButton
                    v-if="
                      auth.user?.id &&
                      post.userId !== auth.user.id &&
                      post.status === 'approved'
                    "
                    target-type="post"
                    :target-id="post.id"
                  />
                  <button
                    v-if="canRemove(post)"
                    type="button"
                    class="redbook-delete-btn"
                    :disabled="removing"
                    @click="removePost"
                  >
                    删除
                  </button>
                  <button
                    v-else-if="post.userId !== auth.user?.id"
                    type="button"
                    class="redbook-follow-btn"
                    :class="{ 'is-following': isFollowing }"
                    :disabled="followBusy"
                    @click="toggleFollow"
                  >
                    {{ isFollowing ? '已关注' : '关注' }}
                  </button>
                </header>

                <!-- 正文 + 评论区域 -->
                <div class="redbook-scroll-area">
                  <!-- 审核提示 -->
                  <div
                    v-if="post.status === 'pending'"
                    class="redbook-audit-badge"
                  >
                    ⚠️ 当前帖子正在审核中，通过前仅自己可见{{
                      post.reviewStage === 'manual_pending'
                        ? '，已转人工审核'
                        : ''
                    }}
                  </div>
                  <div
                    v-if="post.status === 'rejected'"
                    class="redbook-audit-badge redbook-audit-badge--rejected"
                  >
                    ❌ 未通过审核：{{ post.reviewReason || '请遵守社区规范' }}
                  </div>

                  <!-- 标题 -->
                  <CommunityPinManager
                    :post="post"
                    @changed="emit('pinsChanged')"
                  />
                  <CommunityPostEdit :post="post" @edited="onPostEdited" />
                  <h1 class="redbook-post-title">{{ post.title }}</h1>

                  <!-- 话题标签 -->
                  <div
                    v-if="post.tags && post.tags.length"
                    class="redbook-post-tags"
                  >
                    <span
                      v-for="tag in post.tags"
                      :key="tag"
                      class="redbook-tag"
                    >
                      #{{ tag }}
                    </span>
                  </div>

                  <!-- 正文内容 -->
                  <p class="redbook-post-text">{{ post.content }}</p>
                  <DishLink
                    v-if="post.linkedDish"
                    :dish="post.linkedDish"
                    class="button-ink"
                    @click="$emit('update:modelValue', false)"
                  >
                    菜品 · {{ post.linkedDish.name }}
                  </DishLink>

                  <!-- 发布时间与食堂位置 -->
                  <div class="redbook-post-footline">
                    <time>{{ formatPostTime(post.createdAt) }}</time>
                    <time v-if="post.editedAt"
                      >修改于 {{ formatPostTime(post.editedAt) }}</time
                    >
                    <span
                      class="post-view-count"
                      :aria-label="`${displayedViewCount} 次浏览`"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        aria-hidden="true"
                      >
                        <path
                          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                        />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      {{ displayedViewCount.toLocaleString('zh-CN') }} 次浏览
                    </span>
                    <span v-if="post.canteenName">
                      · {{ post.canteenName }}</span
                    >
                  </div>

                  <!-- 评论列表部分（纯净小红书风格） -->
                  <CommunityCommentSection
                    v-if="post.status === 'approved'"
                    :key="post.id"
                    ref="commentSection"
                    :post-id="post.id"
                    embedded
                    @changed="refreshPost"
                    @reply-target-change="selectReply"
                  />
                </div>

                <div v-if="replyTarget" class="detail-reply-target">
                  回复 {{ replyTarget.item.author?.name || '同学'
                  }}<button
                    type="button"
                    @click="
                      replyTarget = null;
                      commentSection?.setTarget(null);
                    "
                  >
                    取消回复
                  </button>
                </div>
                <!-- PC 端吸底操作栏（右栏底部） -->
                <footer
                  v-if="post.status === 'approved'"
                  class="redbook-bottom-bar pc-only-bottom"
                >
                  <div class="redbook-input-pill">
                    <span class="pill-pen-icon" aria-hidden="true">✎</span>
                    <input
                      v-model="quickCommentText"
                      type="text"
                      placeholder="说点什么..."
                      class="pill-input"
                      maxlength="300"
                      :disabled="isSubmittingComment"
                      @keydown.enter="
                        !$event.isComposing && handleSendComment()
                      "
                    />
                    <button
                      v-if="quickCommentText.trim()"
                      type="button"
                      class="pill-send-btn"
                      :disabled="isSubmittingComment"
                      @click="handleSendComment"
                    >
                      发送
                    </button>
                  </div>

                  <div class="redbook-action-icons">
                    <button
                      type="button"
                      class="action-icon-btn post-like"
                      :class="{ 'is-active': isLiked }"
                      :aria-pressed="isLiked"
                      :aria-label="`点赞 ${post.likeCount || 0}`"
                      @click="toggleLike"
                    >
                      <svg
                        class="action-svg"
                        viewBox="0 0 24 24"
                        :fill="isLiked ? 'currentColor' : 'none'"
                        stroke="currentColor"
                        stroke-width="1.9"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path
                          d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"
                        />
                      </svg>
                      <span class="icon-count">{{ post.likeCount || 0 }}</span>
                    </button>
                    <button
                      type="button"
                      class="action-icon-btn post-favorite"
                      :class="{ 'is-active is-favorite': isFavorited }"
                      :aria-pressed="isFavorited"
                      :aria-label="`收藏 ${post.favoriteCount || 0}`"
                      @click="toggleFavorite"
                    >
                      <svg
                        class="action-svg"
                        viewBox="0 0 24 24"
                        :fill="isFavorited ? 'currentColor' : 'none'"
                        stroke="currentColor"
                        stroke-width="1.9"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path
                          d="m12 3.2 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.1 6.6 20l1-6.1-4.4-4.3 6.1-.9L12 3.2Z"
                        />
                      </svg>
                      <span class="icon-count">{{
                        post.favoriteCount || 0
                      }}</span>
                    </button>
                    <button
                      v-if="isFavorited"
                      type="button"
                      class="action-icon-btn action-group-chip"
                      aria-label="设置收藏分组"
                      @click="openGroups"
                    >
                      <span class="icon-count">分组</span>
                    </button>
                    <button
                      type="button"
                      class="action-icon-btn"
                      :aria-label="`评论 ${post.commentCount || 0}`"
                      @click="focusCommentInput"
                    >
                      <svg
                        class="action-svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.9"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path
                          d="M21 6v10a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z"
                        />
                      </svg>
                      <span class="icon-count">{{
                        post.commentCount || 0
                      }}</span>
                    </button>
                    <button
                      type="button"
                      class="action-icon-btn"
                      aria-label="分享"
                      @click="handleShare"
                    >
                      <svg
                        class="action-svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.9"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m7 17 10-10M7 7h10v10" />
                      </svg>
                    </button>
                  </div>
                </footer>
              </div>
            </div>

            <!-- 手机端固定吸底操作条（<= 768px） -->
            <footer
              v-if="post.status === 'approved'"
              class="redbook-bottom-bar mobile-only-bottom"
            >
              <div class="redbook-input-pill">
                <span class="pill-pen-icon" aria-hidden="true">✎</span>
                <input
                  v-model="quickCommentText"
                  type="text"
                  placeholder="说点什么..."
                  class="pill-input"
                  maxlength="300"
                  :disabled="isSubmittingComment"
                  @keydown.enter="handleSendComment"
                />
                <button
                  v-if="quickCommentText.trim()"
                  type="button"
                  class="pill-send-btn"
                  :disabled="isSubmittingComment"
                  @click="handleSendComment"
                >
                  发送
                </button>
              </div>

              <div class="redbook-action-icons">
                <button
                  type="button"
                  class="action-icon-btn"
                  :class="{ 'is-active': isLiked }"
                  :aria-label="`点赞 ${post.likeCount || 0}`"
                  @click="toggleLike"
                >
                  <svg
                    class="action-svg"
                    viewBox="0 0 24 24"
                    :fill="isLiked ? 'currentColor' : 'none'"
                    stroke="currentColor"
                    stroke-width="1.9"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path
                      d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"
                    />
                  </svg>
                  <span class="icon-count">{{ post.likeCount || 0 }}</span>
                </button>
                <button
                  type="button"
                  class="action-icon-btn"
                  :class="{ 'is-active is-favorite': isFavorited }"
                  :aria-label="`收藏 ${post.favoriteCount || 0}`"
                  @click="toggleFavorite"
                >
                  <svg
                    class="action-svg"
                    viewBox="0 0 24 24"
                    :fill="isFavorited ? 'currentColor' : 'none'"
                    stroke="currentColor"
                    stroke-width="1.9"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path
                      d="m12 3.2 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.1 6.6 20l1-6.1-4.4-4.3 6.1-.9L12 3.2Z"
                    />
                  </svg>
                  <span class="icon-count">{{ post.favoriteCount || 0 }}</span>
                </button>
                <button
                  v-if="isFavorited"
                  type="button"
                  class="action-icon-btn action-group-chip"
                  aria-label="设置收藏分组"
                  @click="openGroups"
                >
                  <span class="icon-count">分组</span>
                </button>
                <button
                  type="button"
                  class="action-icon-btn"
                  :aria-label="`评论 ${post.commentCount || 0}`"
                  @click="focusCommentInput"
                >
                  <svg
                    class="action-svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path
                      d="M21 6v10a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z"
                    />
                  </svg>
                  <span class="icon-count">{{ post.commentCount || 0 }}</span>
                </button>
                <button
                  type="button"
                  class="action-icon-btn"
                  aria-label="分享"
                  @click="handleShare"
                >
                  <svg
                    class="action-svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m7 17 10-10M7 7h10v10" />
                  </svg>
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </Transition>
    <ElDialog
      v-model="groupDialogOpen"
      title="收藏分组"
      width="min(420px, 92vw)"
    >
      <p v-if="groupError" role="alert">{{ groupError }}</p>
      <button
        v-if="groupError && !groupLoading"
        type="button"
        @click="openGroups"
      >
        重新读取分组
      </button>
      <p v-if="groupLoading">正在读取分组…</p>
      <template v-else-if="!groupError">
        <button
          type="button"
          class="group-default"
          :disabled="groupBusy"
          :aria-pressed="!postGroupIds.length"
          @click="useDefaultGroup"
        >
          默认分组
        </button>
        <label v-for="group in postGroups" :key="group.id" class="group-choice">
          <input
            type="checkbox"
            :checked="postGroupIds.includes(group.id)"
            :disabled="groupBusy"
            @change="togglePostGroup(group)"
          />
          {{ group.name }} ({{ group.itemCount }})
        </label>
        <div class="group-create">
          <input
            v-model="newGroupName"
            maxlength="20"
            placeholder="新分组名称"
            aria-label="新分组名称"
          />
          <button type="button" :disabled="groupBusy" @click="createPostGroup">
            新建分组
          </button>
        </div>
      </template>
    </ElDialog>
  </Teleport>
</template>

<style scoped lang="scss">
.group-choice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  min-height: 44px;
  cursor: pointer;
  input {
    width: 20px;
    height: 20px;
    accent-color: var(--ft-color-primary);
  }
}
.group-default,
.group-create button {
  min-height: 44px;
  padding: 8px 14px;
  border: 1px solid var(--ft-color-secondary);
  border-radius: 4px;
  background: var(--zine-paper-card);
  color: var(--ft-color-text);
  font: inherit;
  cursor: pointer;
  &:focus-visible {
    outline: 2px solid var(--ft-color-primary);
    outline-offset: 3px;
  }
  &:disabled {
    opacity: 0.5;
    cursor: wait;
  }
}
.group-default[aria-pressed='true'] {
  color: var(--ft-color-primary);
  border-color: var(--ft-color-primary);
  background: rgb(201 52 30 / 8%);
}
.group-create {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
  input {
    flex: 1;
    min-width: 120px;
    min-height: 44px;
    padding: 8px 10px;
    border: 1px solid var(--ft-color-secondary);
    border-radius: 4px;
    background: var(--zine-paper-card);
    color: var(--ft-color-text);
    font: inherit;
  }
  button {
    color: var(--ft-color-primary);
    border-style: dashed;
  }

  input {
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
  }
}
.post-view-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 10px;
  white-space: nowrap;
}
.detail-reply-target {
  padding: 8px 20px;
  font-size: 12px;
  color: var(--ft-color-text-muted);
}
.detail-reply-target button {
  margin-left: 8px;
  border: 0;
  background: transparent;
  color: var(--ft-color-primary);
  min-height: 32px;
}

.redbook-modal {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 72%);
  backdrop-filter: blur(8px);
  padding: 24px;
  overflow: hidden;

  &__close-btn {
    position: absolute;
    top: 24px;
    right: 24px;
    z-index: 10001;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 0;
    background: rgb(var(--ft-overlay-surface-rgb) / 85%);
    color: var(--ft-color-text);
    font-size: 28px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgb(0 0 0 / 25%);
    transition:
      background var(--ft-transition-fast),
      transform var(--ft-transition-fast);

    &:hover {
      background: var(--zine-paper-card);
      transform: scale(1.08);
    }
  }

  &__card {
    position: relative;
    width: min(94vw, 1040px);
    height: min(88vh, 840px);
    background: var(--zine-paper-card);
    border-radius: 16px;
    box-shadow: 0 20px 50px rgb(0 0 0 / 35%);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  &__body {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
}

// 电脑端布局：左右分栏
.redbook-layout-main {
  display: flex;
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

// 移动端顶部导航默认在 PC 端隐藏
.redbook-mobile-header {
  display: none;
}

// 移动端吸底操作栏默认在 PC 端隐藏
.mobile-only-bottom {
  display: none !important;
}

// 左栏：自适应图片展示
.redbook-media-pane {
  flex: 1;
  min-width: 0;
  height: 100%;
  background: var(--ft-color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  :deep(.community-image-viewer__stage) {
    flex: 1;
    min-height: 0;
    max-height: 100%;
    border: 0;
    border-radius: 0;
    background: inherit;
    box-shadow: none;
  }
}

// 右栏：信息、滚动评论与吸底栏
.redbook-info-pane {
  width: 420px;
  flex: none;
  height: 100%;
  background: var(--zine-paper-card);
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--ft-border-subtle);
}

.redbook-author-bar {
  flex: none;
  height: 68px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--ft-border-subtle);

  .redbook-author-avatar-wrap {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    overflow: hidden;
    background: var(--zine-paper-card);
    border: 1px solid #e5dfd3;
    flex: none;
  }

  .redbook-author-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .redbook-author-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: var(--ft-color-secondary, #666);
  }

  .redbook-author-meta {
    flex: 1;
    min-width: 0;
  }

  .redbook-author-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--ft-color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .redbook-follow-btn {
    padding: 6px 16px;
    border-radius: 999px;
    border: 1px solid var(--ft-color-primary, #e60026);
    background: var(--zine-paper-card);
    color: var(--ft-color-primary, #e60026);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 180ms ease;

    &:hover {
      background: rgb(230 0 38 / 6%);
    }

    &.is-following {
      border-color: var(--ft-color-border);
      color: var(--ft-color-text-muted);
      background: var(--zine-paper-card);
    }
  }

  .redbook-delete-btn {
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid #ffccd2;
    background: var(--ft-color-surface);
    color: var(--ft-color-primary, #e60026);
    font-size: 12px;
    cursor: pointer;
    transition: background 160ms ease;

    &:hover {
      background: var(--ft-color-surface);
    }
  }
}

.redbook-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--ft-color-surface-ink);
    border-radius: 3px;
  }
}

.redbook-audit-badge {
  padding: 6px 12px;
  margin-bottom: 14px;
  background: var(--ft-color-surface);
  border: 1px solid #faecd8;
  color: #e6a23c;
  font-size: 12px;
  border-radius: 4px;

  &--rejected {
    background: var(--ft-color-surface);
    border-color: #fde2e2;
    color: #f56c6c;
  }
}

.redbook-post-title {
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.35;
  color: var(--ft-color-text);
}

.redbook-post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;

  .redbook-tag {
    color: var(--zine-stamp-blue);
    font-size: 14px;
    font-weight: 600;
  }
}

.redbook-post-text {
  margin: 0 0 16px;
  font-size: 15px;
  line-height: 1.68;
  color: var(--ft-color-text);
  white-space: pre-wrap;
  word-break: break-word;
}

.redbook-post-footline {
  font-size: 12px;
  color: var(--ft-color-text-muted);
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--ft-border-subtle);
}

.redbook-comments-section {
  .redbook-comments-header {
    font-size: 14px;
    font-weight: 700;
    color: var(--ft-color-text-muted);
    margin-bottom: 16px;
  }

  .redbook-comments-loading,
  .redbook-comments-empty {
    font-size: 13px;
    color: var(--ft-color-text-muted);
    text-align: center;
    padding: 20px 0;
  }
}

.redbook-comment-item {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;

  .cmt-avatar-wrap {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    overflow: hidden;
    background: var(--zine-paper-card);
    flex: none;
  }

  .cmt-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cmt-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: var(--ft-color-text-muted);
  }

  .cmt-content-wrap {
    flex: 1;
    min-width: 0;
  }

  .cmt-author-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .cmt-author-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--ft-color-text-muted);
  }

  .cmt-author-tag {
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 2px;
    background: var(--ft-color-surface);
    color: #e6a23c;
  }

  .cmt-body-text {
    margin: 0 0 6px;
    font-size: 14px;
    line-height: 1.45;
    color: var(--ft-color-text);
    word-break: break-word;

    .cmt-reply-target {
      color: var(--ft-color-primary, #e60026);
      font-weight: 600;
    }
  }

  .cmt-meta-row {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--ft-color-text-muted);
  }

  .cmt-reply-btn {
    border: 0;
    background: none;
    color: var(--ft-color-text-muted);
    font-size: 12px;
    cursor: pointer;
    padding: 0;

    &:hover {
      color: var(--ft-color-text);
    }
  }

  .cmt-like-btn {
    border: 0;
    background: none;
    color: var(--ft-color-text-muted);
    font-size: 12px;
    cursor: pointer;
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 2px;

    &.is-liked {
      color: #e60026;
    }
  }
}

// 吸底操作栏样式
.redbook-bottom-bar {
  flex: none;
  padding: 12px 18px;
  border-top: 1px solid var(--ft-border-subtle);
  background: var(--zine-paper-card);
  display: flex;
  align-items: center;
  gap: 12px;

  .redbook-input-pill {
    flex: 1;
    min-width: 0;
    height: 38px;
    border-radius: 999px;
    background: var(--zine-paper-card);
    display: flex;
    align-items: center;
    padding: 0 14px;
    gap: 8px;

    .pill-pen-icon {
      color: var(--ft-color-text-muted);
      font-size: 14px;
    }

    .pill-input {
      flex: 1;
      border: 0;
      background: none;
      font-size: 13px;
      color: var(--ft-color-text);
      outline: none;

      &::placeholder {
        color: var(--ft-color-text-muted);
      }
    }

    .pill-send-btn {
      border: 0;
      background: none;
      color: var(--ft-color-primary, #e60026);
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      padding: 0 4px;
    }
  }

  .redbook-action-icons {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .action-icon-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    border: 0;
    background: none;
    cursor: pointer;
    padding: 4px;
    color: var(--ft-color-text);
    font-size: 14px;
    transition:
      transform 140ms ease,
      color 140ms ease;

    &:hover {
      transform: scale(1.06);
    }

    .action-svg {
      width: 21px;
      height: 21px;
      flex: none;
    }

    &.is-active {
      color: var(--ft-color-primary, #e60026);
      font-weight: 700;
    }

    &.is-favorite {
      color: var(--ft-color-warning, #d49428);
    }

    &.action-group-chip {
      padding: 3px 9px;
      border-radius: 999px;
      border: 1px solid var(--ft-border-subtle);
      background: var(--zine-paper-card-alt);
      color: var(--ft-color-text-muted);
      font-size: 12px;
    }
  }
}

// 移动端响应式（<= 768px）
@media (max-width: 768px) {
  .redbook-modal {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    padding: 0;
    margin: 0;
    background: var(--zine-paper-card);
    backdrop-filter: none;
    display: block;

    &__close-btn {
      display: none;
    }

    &__card {
      width: 100vw;
      height: 100vh;
      max-height: 100vh;
      border-radius: 0;
      border: 0;
      box-shadow: none;
      display: flex;
      flex-direction: column;
    }

    &__body {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      position: relative;
    }
  }

  .redbook-mobile-header {
    display: flex;
    flex: none;
    width: 100%;
    height: 52px;
    padding: 0 12px;
    align-items: center;
    justify-content: space-between;
    background: var(--zine-paper-card);
    border-bottom: 1px solid var(--ft-border-subtle);
    z-index: 10;

    .mobile-header-btn {
      border: 0;
      background: none;
      font-size: 24px;
      cursor: pointer;
      color: var(--ft-color-text);
      padding: 4px 8px;
    }

    .mobile-header-author {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .mobile-author-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }

    .mobile-author-fallback {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--ft-color-surface-ink);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
    }

    .mobile-author-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--ft-color-text);
    }

    .mobile-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .mobile-follow-btn {
      padding: 4px 14px;
      border-radius: 999px;
      border: 1px solid var(--ft-color-primary, #e60026);
      background: var(--zine-paper-card);
      color: var(--ft-color-primary, #e60026);
      font-size: 12px;
      font-weight: 600;

      &.is-following {
        border-color: var(--ft-color-border);
        color: var(--ft-color-text-muted);
      }
    }

    .mobile-delete-btn {
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #ffccd2;
      background: var(--ft-color-surface);
      color: var(--ft-color-primary, #e60026);
      font-size: 12px;
    }

    .mobile-share-btn {
      border: 0;
      background: none;
      font-size: 18px;
      color: var(--ft-color-text);
      cursor: pointer;
    }
  }

  .redbook-layout-main {
    flex: 1;
    min-height: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 74px;
  }

  .redbook-media-pane {
    flex: none;
    width: 100%;
    min-height: 260px;
    max-height: 70vh;
    height: auto;
    background: #000;

    :deep(.community-image-viewer__stage) {
      flex: none;
      height: auto;
      max-height: 58vh;
      min-height: 220px;
    }
  }

  .redbook-info-pane {
    flex: none;
    width: 100%;
    height: auto;
    border-left: 0;
  }

  .redbook-author-bar,
  .pc-only-bottom {
    display: none !important;
  }

  .redbook-scroll-area {
    padding: 16px 14px 24px;
    overflow-y: visible;
  }

  .mobile-only-bottom {
    display: flex !important;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: rgb(var(--ft-overlay-surface-rgb) / 0.98);
    backdrop-filter: blur(8px);
    border-top: 1px solid var(--ft-border-subtle);
    padding: 8px 14px max(10px, env(safe-area-inset-bottom));
    box-shadow: 0 -3px 12px rgb(0 0 0 / 8%);
  }
}

// 动画
.redbook-fade-enter-active,
.redbook-fade-leave-active {
  transition: opacity 220ms ease;

  .redbook-modal__card {
    transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
  }
}

.redbook-fade-enter-from,
.redbook-fade-leave-to {
  opacity: 0;

  .redbook-modal__card {
    transform: scale(0.96) translateY(12px);
  }
}
</style>
