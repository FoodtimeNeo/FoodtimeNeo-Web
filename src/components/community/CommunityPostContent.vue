<script setup>
import { nextTick, ref, watch } from 'vue';
import { useAuthStore } from '@/store/useAuthStore.js';
import { ElMessageBox, ElMessage } from 'element-plus';
import {
  fetchCommunityPostDetail,
  setPostLike,
  setPostFavorite,
  deleteCommunityPost,
  createPostComment,
} from '@/api/community.api.js';
import CommunityImageViewer from './CommunityImageViewer.vue';
import CommunityCommentSection from './CommunityCommentSection.vue';

const props = defineProps({
  postId: {
    type: String,
    required: true,
  },
  isModal: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['deleted', 'close']);

const auth = useAuthStore();
const post = ref(null);
const loading = ref(false);
const error = ref('');

const actionError = ref('');
const acting = ref(false);
const isFollowing = ref(false);

const commentSectionRef = ref(null);
const scrollAreaRef = ref(null);
const quickInputRef = ref(null);
const quickDraft = ref('');
const isSubmittingComment = ref(false);
const replyTarget = ref(null);

let version = 0;
let requestId = crypto.randomUUID();

async function load() {
  const current = ++version;
  loading.value = true;
  error.value = '';
  try {
    const result = await fetchCommunityPostDetail(props.postId);
    if (current === version) {
      post.value = result;
    }
  } catch (e) {
    if (current === version) {
      error.value = e.message || '帖子加载失败';
    }
  } finally {
    if (current === version) {
      loading.value = false;
    }
  }
}

watch(
  () => props.postId,
  () => {
    post.value = null;
    replyTarget.value = null;
    quickDraft.value = '';
    load();
  },
  { immediate: true },
);

async function interact(kind) {
  if (acting.value || !post.value) return;
  acting.value = true;
  actionError.value = '';
  try {
    if (kind === 'like') {
      const nextLiked = !post.value.likedByMe;
      const state = await setPostLike(post.value.id, nextLiked);
      post.value.likedByMe = state.liked;
      post.value.likeCount = state.likeCount;
      ElMessage.success(state.liked ? '点赞成功' : '已取消点赞');
    } else {
      const nextFav = !post.value.favoritedByMe;
      const state = await setPostFavorite(post.value.id, nextFav);
      post.value.favoritedByMe = state.favorited;
      post.value.favoriteCount = state.favoriteCount;
      ElMessage.success(state.favorited ? '收藏成功' : '已取消收藏');
    }
  } catch (e) {
    actionError.value = e.message || '操作失败，请重试';
    ElMessage.error(actionError.value);
  } finally {
    acting.value = false;
  }
}

async function remove() {
  if (!post.value) return;
  try {
    await ElMessageBox.confirm(
      '删除后无法恢复，帖子将从公开社区隐藏。',
      '删除食记',
      { type: 'warning' },
    );
  } catch {
    return;
  }
  acting.value = true;
  try {
    await deleteCommunityPost(post.value.id);
    ElMessage.success('食记已删除');
    emit('deleted');
  } catch (e) {
    actionError.value = e.message || '删除失败';
    ElMessage.error(actionError.value);
  } finally {
    acting.value = false;
  }
}

function toggleFollow() {
  isFollowing.value = !isFollowing.value;
  ElMessage.success(isFollowing.value ? '已关注作者' : '已取消关注');
}

function handleShare() {
  if (typeof window !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(window.location.href);
    ElMessage.success('已复制帖子链接到剪贴板');
  } else {
    ElMessage.success('已生成分享链接');
  }
}

function onReplyTargetChange(targetData) {
  replyTarget.value = targetData;
  nextTick(() => {
    quickInputRef.value?.focus();
  });
}

function cancelReply() {
  replyTarget.value = null;
  commentSectionRef.value?.setTarget(null);
}

function focusCommentInput() {
  nextTick(() => {
    quickInputRef.value?.focus();
    if (scrollAreaRef.value) {
      scrollAreaRef.value.scrollTo({
        top: scrollAreaRef.value.scrollHeight,
        behavior: 'smooth',
      });
    }
  });
}

async function handleSendQuickComment() {
  const text = quickDraft.value.trim();
  if (!text || isSubmittingComment.value || !post.value?.id) return;
  if (text.length > 500) {
    ElMessage.warning('评论最多500字');
    return;
  }

  isSubmittingComment.value = true;
  actionError.value = '';
  try {
    const body = { content: text };
    if (replyTarget.value) {
      body.rootCommentId = replyTarget.value.root?.id;
      body.replyToCommentId = replyTarget.value.item?.id;
    }
    await createPostComment(post.value.id, {
      ...body,
      clientRequestId: requestId,
    });
    quickDraft.value = '';
    replyTarget.value = null;
    requestId = crypto.randomUUID();
    ElMessage.success('已提交审核，通过前仅自己可见');
    if (commentSectionRef.value) {
      await commentSectionRef.value.load(false, true, !body.rootCommentId);
    }
    post.value.commentCount = (post.value.commentCount || 0) + 1;
  } catch (err) {
    actionError.value = err.message || '发送失败，请重试';
    ElMessage.error(actionError.value);
  } finally {
    isSubmittingComment.value = false;
  }
}

function formatPostTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
</script>

<template>
  <div class="community-post-content-wrapper">
    <p v-if="error" role="alert" class="state-alert">
      {{ error }}
      <button type="button" class="btn-retry" @click="load">重试</button>
    </p>
    <div v-else-if="loading && !post" role="status" class="state-loading">
      <div class="loading-spinner"></div>
      <span>食记加载中…</span>
    </div>

    <article
      v-if="post && !error"
      class="community-post-content"
      :class="{ 'is-modal-layout': isModal }"
    >
      <!-- 移动端顶部常驻导航栏（<= 768px） -->
      <header class="redbook-mobile-header">
        <button
          v-if="isModal"
          type="button"
          class="mobile-header-btn"
          aria-label="返回"
          @click="emit('close')"
        >
          ←
        </button>
        <div class="mobile-header-author">
          <img
            v-if="post.author?.avatar"
            :src="post.author.avatar"
            :alt="post.author.name"
            class="mobile-author-avatar"
          />
          <span v-else class="mobile-author-fallback">
            {{ (post.author?.name || '饭')[0] }}
          </span>
          <span class="mobile-author-name">{{
            post.author?.name || '同学'
          }}</span>
        </div>
        <div class="mobile-header-actions">
          <button
            v-if="post.userId !== auth.user?.id"
            type="button"
            class="mobile-follow-btn"
            :class="{ 'is-following': isFollowing }"
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

      <!-- 左侧：媒体展示区（大图轮播） -->
      <div class="post-media">
        <CommunityImageViewer :images="post.images || []" :alt="post.title" />
      </div>

      <!-- 右侧：作者信息、正文、滚动评论与吸底操作栏 -->
      <div class="post-copy">
        <!-- PC 端作者栏 -->
        <header class="redbook-author-bar">
          <div class="author-avatar-wrap">
            <img
              v-if="post.author?.avatar"
              :src="post.author.avatar"
              :alt="post.author.name"
              class="author-avatar"
            />
            <span v-else class="author-avatar-fallback">
              {{ (post.author?.name || '同').slice(0, 1) }}
            </span>
          </div>
          <div class="author-meta">
            <span class="author-name">{{ post.author?.name || '同学' }}</span>
            <time class="author-time">{{
              formatPostTime(post.createdAt)
            }}</time>
          </div>
          <div class="author-actions">
            <button
              v-if="post.userId === auth.user?.id"
              type="button"
              :disabled="acting"
              class="post-delete"
              @click="remove"
            >
              删除食记
            </button>
            <button
              v-else
              type="button"
              class="redbook-follow-btn"
              :class="{ 'is-following': isFollowing }"
              @click="toggleFollow"
            >
              {{ isFollowing ? '已关注' : '关注' }}
            </button>
          </div>
        </header>

        <!-- 可滚动内容区（正文 + 楼中楼评论） -->
        <div ref="scrollAreaRef" class="post-scroll-area">
          <p
            v-if="post.status === 'pending'"
            class="audit-banner"
            role="status"
          >
            正在审核中 · 通过前仅自己可见{{
              post.reviewStage === 'manual_pending' ? '，已转人工审核' : ''
            }}
          </p>
          <p v-if="post.status === 'rejected'" class="audit-banner">
            未通过审核：{{ post.reviewReason || '请遵守社区规范' }}
          </p>

          <h1 class="post-title">{{ post.title }}</h1>
          <p class="post-body">{{ post.content }}</p>

          <div v-if="post.tags && post.tags.length" class="post-tags">
            <span v-for="tag in post.tags" :key="tag" class="post-tag">
              #{{ tag }}
            </span>
          </div>

          <!-- 楼中楼评论体系 -->
          <div v-if="post.status === 'approved'" class="comments-container">
            <CommunityCommentSection
              ref="commentSectionRef"
              :post-id="post.id"
              @changed="load"
              @reply-target-change="onReplyTargetChange"
            />
          </div>
        </div>

        <p v-if="actionError" role="alert" class="action-error-msg">
          {{ actionError }}
        </p>

        <!-- 吸底交互操作栏（电脑端与移动端统一小红书交互） -->
        <footer class="redbook-bottom-bar">
          <div class="redbook-input-pill">
            <div v-if="replyTarget" class="pill-reply-tag">
              <span>回复 @{{ replyTarget.item?.author?.name || '同学' }}</span>
              <button
                type="button"
                class="btn-cancel-reply"
                aria-label="取消回复"
                @click="cancelReply"
              >
                ×
              </button>
            </div>
            <input
              ref="quickInputRef"
              v-model="quickDraft"
              type="text"
              :placeholder="replyTarget ? '写下你的回复...' : '说点什么...'"
              class="pill-input"
              maxlength="500"
              :disabled="isSubmittingComment"
              @keydown.enter="handleSendQuickComment"
            />
            <button
              v-if="quickDraft.trim()"
              type="button"
              class="pill-send-btn"
              :disabled="isSubmittingComment"
              @click="handleSendQuickComment"
            >
              {{ isSubmittingComment ? '…' : '发送' }}
            </button>
          </div>

          <div class="redbook-action-icons">
            <!-- 点赞（兼容 .post-like class 以供单测和功能调用） -->
            <button
              type="button"
              class="action-icon-btn post-like"
              :class="{ 'is-active': post.likedByMe }"
              :aria-pressed="post.likedByMe"
              :disabled="acting"
              :aria-label="`点赞 ${post.likeCount || 0}`"
              @click="interact('like')"
            >
              <span class="icon-emoji">{{ post.likedByMe ? '♥' : '♡' }}</span>
              {{ post.likedByMe ? '已赞' : '点赞' }} {{ post.likeCount || 0 }}
            </button>

            <!-- 收藏（兼容 .post-favorite class） -->
            <button
              type="button"
              class="action-icon-btn post-favorite"
              :class="{ 'is-active': post.favoritedByMe }"
              :aria-pressed="post.favoritedByMe"
              :disabled="acting"
              :aria-label="`收藏 ${post.favoriteCount || 0}`"
              @click="interact('favorite')"
            >
              <span class="icon-emoji">{{
                post.favoritedByMe ? '★' : '☆'
              }}</span>
              {{ post.favoritedByMe ? '已收藏' : '收藏' }}
              {{ post.favoriteCount || 0 }}
            </button>

            <!-- 评论图标 -->
            <button
              type="button"
              class="action-icon-btn post-comments-btn"
              :aria-label="`评论 ${post.commentCount || 0}`"
              @click="focusCommentInput"
            >
              <span class="icon-emoji">💬</span>
              <span class="icon-count">{{ post.commentCount || 0 }}</span>
            </button>

            <!-- 分享 -->
            <button
              type="button"
              class="action-icon-btn post-share-btn"
              aria-label="分享"
              @click="handleShare"
            >
              <span class="icon-emoji">↗</span>
            </button>
          </div>
        </footer>
      </div>
    </article>
  </div>
</template>

<style scoped lang="scss">
.community-post-content-wrapper {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.state-alert {
  padding: 24px;
  text-align: center;
  color: var(--ft-color-primary, #e60026);
  font-size: 15px;

  .btn-retry {
    margin-left: 10px;
    padding: 6px 14px;
    border-radius: 6px;
    border: 1px solid var(--ft-color-primary, #e60026);
    background: transparent;
    color: var(--ft-color-primary, #e60026);
    cursor: pointer;
  }
}

.state-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  gap: 16px;
  color: var(--ft-color-text-secondary, #706458);

  .loading-spinner {
    width: 36px;
    height: 36px;
    border: 3px solid #eee;
    border-top-color: var(--ft-color-primary, #e60026);
    border-radius: 50%;
    animation: spin 800ms linear infinite;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.community-post-content {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #fff;
  color: var(--ft-color-text, #333);
  overflow: hidden;

  &.is-modal-layout {
    height: 100%;
    max-height: min(88vh, 860px);
  }
}

.post-media {
  min-width: 0;
  height: 100%;
  background: radial-gradient(circle at center, #faf8f5 0%, #ede8e0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.post-copy {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  background: #fff;
  border-left: 1px solid rgb(0 0 0 / 6%);
  position: relative;
  overflow: hidden;
}

// 移动端顶部作者栏
.redbook-mobile-header {
  display: none;
}

// PC 端作者栏
.redbook-author-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid rgb(0 0 0 / 6%);
  flex-shrink: 0;
  background: #fff;
  z-index: 2;

  .author-avatar-wrap {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
  }

  .author-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .author-avatar-fallback {
    width: 100%;
    height: 100%;
    background: #f0ece3;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: var(--ft-color-text-secondary, #706458);
  }

  .author-meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .author-name {
    font-weight: 700;
    font-size: 15px;
    color: #222;
  }

  .author-time {
    font-size: 12px;
    color: #999;
  }

  .author-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .redbook-follow-btn {
    padding: 5px 16px;
    border-radius: 999px;
    border: 1px solid var(--ft-color-primary, #e60026);
    background: #fff;
    color: var(--ft-color-primary, #e60026);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 160ms ease;

    &:hover {
      background: rgb(230 0 38 / 6%);
    }

    &.is-following {
      border-color: #ddd;
      color: #999;
      background: #fafafa;
    }
  }

  .post-delete {
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid #ffccd2;
    background: #fff5f5;
    color: var(--ft-color-primary, #e60026);
    font-size: 12px;
    cursor: pointer;
    transition: background 160ms ease;

    &:hover {
      background: #ffe3e6;
    }
  }
}

// 右栏滚动区域（正文 + 楼中楼）
.post-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #e2ded5;
    border-radius: 3px;
  }
}

.audit-banner {
  padding: 10px 14px;
  border-radius: 8px;
  background: #fdf3f2;
  color: var(--ft-color-primary, #e60026);
  font-size: 13px;
  margin-bottom: 14px;
}

.post-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
  margin: 0 0 12px;
  color: #1a1a1a;
}

.post-body {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.8;
  font-size: 15px;
  color: #333;
  margin: 0 0 16px;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;

  .post-tag {
    color: #13386c;
    font-size: 13px;
    background: #f0f4fa;
    padding: 3px 8px;
    border-radius: 4px;
  }
}

.comments-container {
  border-top: 1px solid rgb(0 0 0 / 6%);
  margin-top: 10px;
}

.action-error-msg {
  padding: 6px 20px;
  color: var(--ft-color-primary, #e60026);
  font-size: 12px;
  margin: 0;
  background: #fff2f2;
}

// 底部吸底操作栏（PC 端固定吸在右栏底，移动端吸在屏幕底）
.redbook-bottom-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgb(0 0 0 / 7%);
  box-shadow: 0 -4px 16px rgb(0 0 0 / 4%);
  z-index: 10;
}

.redbook-input-pill {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  background: #f4f3f0;
  border-radius: 999px;
  padding: 6px 14px;
  gap: 8px;
  border: 1px solid transparent;
  transition: all 180ms ease;

  &:focus-within {
    background: #fff;
    border-color: var(--ft-color-primary, #e60026);
    box-shadow: 0 2px 10px rgb(230 0 38 / 12%);
  }

  .pill-reply-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgb(230 0 38 / 10%);
    color: var(--ft-color-primary, #e60026);
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 999px;
    white-space: nowrap;

    .btn-cancel-reply {
      border: 0;
      background: none;
      cursor: pointer;
      color: #999;
      font-size: 13px;
      padding: 0;
      line-height: 1;

      &:hover {
        color: #333;
      }
    }
  }

  .pill-input {
    flex: 1;
    min-width: 0;
    border: 0;
    background: none;
    font-size: 13px;
    color: #222;
    outline: none;

    &::placeholder {
      color: #999;
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
    white-space: nowrap;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.redbook-action-icons {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.action-icon-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: none;
  cursor: pointer;
  padding: 6px 8px;
  color: #444;
  font-size: 13px;
  border-radius: 8px;
  transition: all 140ms ease;

  &:hover {
    background: #f7f6f4;
    transform: scale(1.06);
  }

  .icon-emoji {
    font-size: 14px;
    transition: transform 140ms ease;
  }

  .icon-count {
    font-size: 12px;
    font-weight: 600;
  }

  &.is-active,
  &[aria-pressed='true'] {
    color: var(--ft-color-primary, #e60026);
    font-weight: 700;

    .icon-emoji {
      color: var(--ft-color-primary, #e60026);
    }
  }
}

// 移动端响应式（<= 768px）
@media (max-width: 768px) {
  .community-post-content {
    grid-template-columns: minmax(0, 1fr);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding-bottom: 64px; // 留出屏幕底部吸底栏空间
  }

  .redbook-mobile-header {
    display: flex;
    flex: none;
    width: 100%;
    height: 52px;
    padding: 0 14px;
    align-items: center;
    justify-content: space-between;
    background: #fff;
    border-bottom: 1px solid rgb(0 0 0 / 6%);
    z-index: 10;

    .mobile-header-btn {
      border: 0;
      background: none;
      font-size: 22px;
      cursor: pointer;
      color: #333;
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
      background: #f0ece3;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
    }

    .mobile-author-name {
      font-size: 14px;
      font-weight: 700;
      color: #333;
    }

    .mobile-header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .mobile-follow-btn {
      padding: 4px 14px;
      border-radius: 999px;
      border: 1px solid var(--ft-color-primary, #e60026);
      background: #fff;
      color: var(--ft-color-primary, #e60026);
      font-size: 12px;
      font-weight: 600;

      &.is-following {
        border-color: #ddd;
        color: #999;
      }
    }

    .mobile-share-btn {
      border: 0;
      background: none;
      font-size: 18px;
      color: #444;
      cursor: pointer;
    }
  }

  .redbook-author-bar {
    display: none;
  }

  .post-media {
    flex: none;
    width: 100%;
    min-height: 260px;
    max-height: 60vh;
  }

  .post-copy {
    border-left: 0;
    height: auto;
    overflow: visible;
  }

  .post-scroll-area {
    overflow-y: visible;
    height: auto;
    padding: 16px 14px;
  }

  .redbook-bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px 14px max(10px, env(safe-area-inset-bottom));
    box-shadow: 0 -4px 16px rgb(0 0 0 / 8%);
  }
}
</style>
