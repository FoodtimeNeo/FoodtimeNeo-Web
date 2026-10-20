<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  fetchCommunityPostDetail,
  fetchPostComments,
  createPostComment,
} from '@/api/community.api.js';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';

/**
 * 社区帖子独立详情页。
 * 电脑端：仿照小红书 PC 端双栏展示，左侧自适应尺寸完整图片，右侧文案与滚动评论，底部固定操作栏；
 * 手机端：仿照小红书移动端，上方图片，下方文案，底部固定评论与点赞收藏。
 */
defineOptions({
  name: 'CommunityDetailView',
});

const route = useRoute();
const postId = computed(() => String(route.params.postId));

const post = ref(null);
const loading = ref(false);
const error = ref(null);
const comments = ref([]);
const commentLoading = ref(false);

const isFollowing = ref(false);
const isLiked = ref(false);
const isFavorited = ref(false);
const currentImageIndex = ref(0);
const quickCommentText = ref('');
const isSubmittingComment = ref(false);
const commentInputRef = ref(null);

const images = computed(() => post.value?.images || []);
const currentImage = computed(
  () => images.value[currentImageIndex.value]?.url || '',
);

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

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function loadPost() {
  if (!postId.value) return;
  loading.value = true;
  error.value = null;
  currentImageIndex.value = 0;
  try {
    post.value = await fetchCommunityPostDetail(postId.value);
    await loadComments();
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
}

async function loadComments() {
  commentLoading.value = true;
  try {
    comments.value = await fetchPostComments(postId.value);
  } catch (err) {
    console.warn('加载评论失败', err);
  } finally {
    commentLoading.value = false;
  }
}

function prevImage() {
  if (currentImageIndex.value > 0) {
    currentImageIndex.value -= 1;
  }
}

function nextImage() {
  if (currentImageIndex.value < images.value.length - 1) {
    currentImageIndex.value += 1;
  }
}

function toggleLike() {
  if (!post.value) return;
  isLiked.value = !isLiked.value;
  post.value.likeCount = (post.value.likeCount || 0) + (isLiked.value ? 1 : -1);
  ElMessage.success(isLiked.value ? '点赞成功' : '已取消点赞');
}

function toggleFavorite() {
  if (!post.value) return;
  isFavorited.value = !isFavorited.value;
  post.value.favoriteCount =
    (post.value.favoriteCount || 0) + (isFavorited.value ? 1 : -1);
  ElMessage.success(isFavorited.value ? '收藏成功' : '已取消收藏');
}

function toggleFollow() {
  isFollowing.value = !isFollowing.value;
  ElMessage.success(isFollowing.value ? '已关注作者' : '已取消关注');
}

function handleShare() {
  if (typeof window !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(window.location.href);
    ElMessage.success('已复制帖子链接');
  } else {
    ElMessage.success('已生成分享卡片');
  }
}

async function handleSendComment() {
  const text = quickCommentText.value.trim();
  if (!text) {
    ElMessage.warning('请输入评论内容');
    return;
  }
  if (!post.value?.id) return;

  isSubmittingComment.value = true;
  try {
    const newCmt = await createPostComment(post.value.id, {
      content: text,
    });
    comments.value.push(newCmt);
    quickCommentText.value = '';
    ElMessage.success('评论发表成功');
  } catch (err) {
    ElMessage.error(err.message || '发表评论失败');
  } finally {
    isSubmittingComment.value = false;
  }
}

const likedComments = ref(new Set());
function toggleLikeComment(cmt) {
  if (likedComments.value.has(cmt.id)) {
    likedComments.value.delete(cmt.id);
    cmt.likeCount = Math.max(0, (cmt.likeCount || 0) - 1);
  } else {
    likedComments.value.add(cmt.id);
    cmt.likeCount = (cmt.likeCount || 0) + 1;
    ElMessage.success('赞同了该评论');
  }
}

function replyUser(cmt) {
  const name = cmt.author?.name || '同学';
  quickCommentText.value = `@${name} `;
  if (commentInputRef.value) {
    commentInputRef.value.focus();
  }
}

onMounted(() => {
  loadPost();
});
</script>

<template>
  <div class="community-detail-page">
    <nav class="community-detail-page__nav">
      <RouterLink :to="{ name: 'community' }" class="back-link">
        ← 返回社区广场
      </RouterLink>
    </nav>

    <LoadingState v-if="loading" />

    <ErrorState
      v-else-if="error"
      :description="error.message || '加载帖子详情失败'"
      @retry="loadPost"
    />

    <article v-else-if="post" class="redbook-card">
      <!-- 移动端顶部导航 -->
      <header class="redbook-card__mobile-top">
        <RouterLink
          :to="{ name: 'community' }"
          class="mobile-back"
          aria-label="返回社区"
        >
          ←
        </RouterLink>
        <div class="mobile-author">
          <img
            v-if="post.author?.avatar"
            :src="post.author.avatar"
            :alt="post.author.name"
            class="mobile-avatar"
          />
          <span v-else class="mobile-avatar-fallback">{{
            (post.author?.name || '饭')[0]
          }}</span>
          <span class="mobile-name">{{
            post.author?.name || '校园干饭人'
          }}</span>
        </div>
        <div class="mobile-actions">
          <button
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

      <!-- 左侧：图片区域（PC 左右双栏，自适应图片尺寸；手机端全宽轮播） -->
      <div class="redbook-card__media">
        <div class="media-container">
          <img
            v-if="currentImage"
            :src="currentImage"
            :alt="post.title"
            class="media-img"
            loading="lazy"
          />
          <div v-else class="media-empty">
            <span>暂无图片</span>
          </div>

          <!-- 翻页箭头 -->
          <button
            v-if="images.length > 1 && currentImageIndex > 0"
            type="button"
            class="img-nav img-nav--prev"
            aria-label="上一张图片"
            @click="prevImage"
          >
            ‹
          </button>
          <button
            v-if="images.length > 1 && currentImageIndex < images.length - 1"
            type="button"
            class="img-nav img-nav--next"
            aria-label="下一张图片"
            @click="nextImage"
          >
            ›
          </button>

          <!-- 小圆点指示器 -->
          <div v-if="images.length > 1" class="img-dots">
            <span
              v-for="(_, idx) in images"
              :key="idx"
              class="dot-item"
              :class="{ 'is-active': idx === currentImageIndex }"
              @click="currentImageIndex = idx"
            ></span>
          </div>
        </div>
      </div>

      <!-- 右侧：作者信息、正文文案、滚动评论列表与底部吸底操作栏 -->
      <div class="redbook-card__content">
        <!-- PC 顶部作者栏 -->
        <header class="pc-author-bar">
          <div class="author-avatar-wrap">
            <img
              v-if="post.author?.avatar"
              :src="post.author.avatar"
              :alt="post.author.name"
              class="author-avatar"
            />
            <div v-else class="author-avatar-fallback">
              {{ (post.author?.name || '饭')[0] }}
            </div>
          </div>
          <div class="author-info">
            <span class="author-name">{{
              post.author?.name || '校园干饭人'
            }}</span>
            <span class="author-id"
              >ID: {{ post.author?.id || 'visitor' }}</span
            >
          </div>
          <button
            type="button"
            class="follow-btn"
            :class="{ 'is-following': isFollowing }"
            @click="toggleFollow"
          >
            {{ isFollowing ? '已关注' : '关注' }}
          </button>
        </header>

        <!-- 中部可滚动区：正文与评论 -->
        <div class="content-scroll-area">
          <div
            v-if="post.status === 'pending'"
            class="audit-warning community-detail-card__audit-banner"
          >
            ⚠️ 当前帖子正在审核中，审核通过前仅供本人预览
          </div>

          <h1 class="post-title">{{ post.title }}</h1>

          <div v-if="post.tags && post.tags.length" class="post-tags">
            <span v-for="tag in post.tags" :key="tag" class="tag-chip">
              #{{ tag }}
            </span>
          </div>

          <p class="post-text">{{ post.content }}</p>

          <div class="post-date-line">
            <time>{{ formatPostTime(post.createdAt) }}</time>
            <span v-if="post.canteenName"> · {{ post.canteenName }}</span>
          </div>

          <!-- 评论区 -->
          <section class="comments-block" aria-label="评论区">
            <div class="comments-header">
              <span>共 {{ comments.length }} 条评论</span>
            </div>

            <div v-if="commentLoading" class="comments-loading">
              加载评论中...
            </div>
            <div v-else-if="comments.length === 0" class="comments-empty">
              快来留下你的第一条手账评论吧~
            </div>
            <div v-else class="comments-list">
              <article
                v-for="cmt in comments"
                :key="cmt.id"
                class="comment-item"
              >
                <div class="cmt-avatar-wrap">
                  <img
                    v-if="cmt.author?.avatar"
                    :src="cmt.author.avatar"
                    :alt="cmt.author.name"
                    class="cmt-avatar"
                  />
                  <span v-else class="cmt-fallback">{{
                    (cmt.author?.name || '评')[0]
                  }}</span>
                </div>
                <div class="cmt-info-wrap">
                  <div class="cmt-head-row">
                    <span class="cmt-name">{{
                      cmt.author?.name || '同学'
                    }}</span>
                    <span
                      v-if="cmt.author?.id === post.author?.id"
                      class="cmt-author-tag"
                      >作者</span
                    >
                  </div>
                  <p class="cmt-content">{{ cmt.content }}</p>
                  <div class="cmt-foot-row">
                    <time class="cmt-date">{{
                      formatTime(cmt.createdAt)
                    }}</time>
                    <button
                      type="button"
                      class="cmt-reply"
                      @click="replyUser(cmt)"
                    >
                      回复
                    </button>
                    <button
                      type="button"
                      class="cmt-like"
                      :class="{ 'is-liked': likedComments.has(cmt.id) }"
                      @click="toggleLikeComment(cmt)"
                    >
                      <span>{{ likedComments.has(cmt.id) ? '❤️' : '🤍' }}</span>
                      <span v-if="cmt.likeCount">{{ cmt.likeCount }}</span>
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>

        <!-- 底部吸底操作栏 -->
        <footer class="bottom-action-bar">
          <div class="input-pill">
            <span class="pen-icon" aria-hidden="true">✎</span>
            <input
              ref="commentInputRef"
              v-model="quickCommentText"
              type="text"
              placeholder="说点什么..."
              class="pill-field"
              maxlength="300"
              @keydown.enter="handleSendComment"
            />
            <button
              v-if="quickCommentText.trim()"
              type="button"
              class="pill-send"
              :disabled="isSubmittingComment"
              @click="handleSendComment"
            >
              发送
            </button>
          </div>

          <div class="action-buttons community-detail-card__interactions">
            <button
              type="button"
              class="btn-action interact-btn"
              :class="{ 'is-active': isLiked }"
              :aria-pressed="isLiked"
              :aria-label="`点赞 ${post.likeCount || 0}`"
              @click="toggleLike"
            >
              <span class="btn-emoji btn-icon">{{
                isLiked ? '❤️' : '🤍'
              }}</span>
              <span class="btn-num"
                >{{ isLiked ? '已赞' : '点赞' }} {{ post.likeCount || 0 }}</span
              >
            </button>
            <button
              type="button"
              class="btn-action interact-btn"
              :class="{ 'is-active': isFavorited }"
              :aria-pressed="isFavorited"
              :aria-label="`收藏 ${post.favoriteCount || 0}`"
              @click="toggleFavorite"
            >
              <span class="btn-emoji btn-icon">{{
                isFavorited ? '⭐' : '☆'
              }}</span>
              <span class="btn-num"
                >{{ isFavorited ? '已收藏' : '收藏' }}
                {{ post.favoriteCount || 0 }}</span
              >
            </button>
            <button
              type="button"
              class="btn-action"
              :aria-label="`评论 ${comments.length}`"
              @click="
                () => {
                  if (commentInputRef) commentInputRef.focus();
                }
              "
            >
              <span class="btn-emoji">💬</span>
              <span class="btn-num">{{ comments.length }}</span>
            </button>
            <button
              type="button"
              class="btn-action"
              aria-label="分享"
              @click="handleShare"
            >
              <span class="btn-emoji">↗</span>
            </button>
          </div>
        </footer>
      </div>
    </article>
  </div>
</template>

<style scoped lang="scss">
.community-detail-page {
  width: min(calc(100% - var(--zine-page-padding) * 2), 1040px);
  margin: var(--ft-space-3, 20px) auto 64px;

  &__nav {
    margin-bottom: 14px;

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--ft-color-primary, #c9341e);
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 6px;
      background: var(--ft-color-surface-ink, #f1ece2);
      transition: background 180ms ease;

      &:hover {
        background: #fff;
      }
    }
  }
}

.redbook-card {
  display: flex;
  height: min(86vh, 800px);
  background: #fff;
  border: 1px solid var(--ft-color-border, #d5ccbc);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 40px rgb(58 36 24 / 14%);

  &__mobile-top {
    display: none;
  }

  // 左侧图片自适应
  &__media {
    flex: 1;
    min-width: 0;
    height: 100%;
    background: #f7f6f9;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;

    .media-container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .media-img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      user-select: none;
    }

    .media-empty {
      color: var(--ft-color-text-muted);
      font-size: 15px;
    }
  }

  // 右侧内容区
  &__content {
    width: 420px;
    flex: none;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #fff;
    border-left: 1px solid #f0eee8;
  }
}

.img-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 0;
  background: rgb(255 255 255 / 82%);
  color: #333;
  font-size: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
  transition: all 180ms ease;

  &:hover {
    background: #fff;
    transform: translateY(-50%) scale(1.1);
  }

  &--prev {
    left: 14px;
  }

  &--next {
    right: 14px;
  }
}

.img-dots {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  padding: 4px 10px;
  background: rgb(0 0 0 / 25%);
  border-radius: 12px;
  backdrop-filter: blur(4px);

  .dot-item {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgb(255 255 255 / 50%);
    cursor: pointer;
    transition: all 180ms ease;

    &.is-active {
      background: #fff;
      width: 14px;
      border-radius: 4px;
    }
  }
}

.pc-author-bar {
  flex: none;
  height: 68px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #f5f2eb;

  .author-avatar-wrap {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    overflow: hidden;
    background: #f0ece1;
    border: 1px solid #e5dfd3;
    flex: none;
  }

  .author-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .author-avatar-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: var(--ft-color-secondary);
  }

  .author-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .author-name {
    font-size: 15px;
    font-weight: 700;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .author-id {
    font-size: 11px;
    color: #999;
  }

  .follow-btn {
    padding: 6px 16px;
    border-radius: 999px;
    border: 1px solid var(--ft-color-primary, #e60026);
    background: #fff;
    color: var(--ft-color-primary, #e60026);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 180ms ease;

    &:hover {
      background: rgb(230 0 38 / 6%);
    }

    &.is-following {
      border-color: #ccc;
      color: #888;
      background: #fafafa;
    }
  }
}

.content-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 3px;
  }
}

.audit-warning {
  padding: 6px 12px;
  margin-bottom: 14px;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  color: #e6a23c;
  font-size: 12px;
  border-radius: 4px;
}

.post-title {
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.35;
  color: #222;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;

  .tag-chip {
    color: #13386c;
    font-size: 14px;
    font-weight: 600;
  }
}

.post-text {
  margin: 0 0 16px;
  font-size: 15px;
  line-height: 1.68;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
}

.post-date-line {
  font-size: 12px;
  color: #999;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f2eee9;
}

.comments-block {
  .comments-header {
    font-size: 14px;
    font-weight: 700;
    color: #666;
    margin-bottom: 16px;
  }

  .comments-loading,
  .comments-empty {
    font-size: 13px;
    color: #999;
    text-align: center;
    padding: 20px 0;
  }
}

.comment-item {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;

  .cmt-avatar-wrap {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    overflow: hidden;
    background: #f0ece1;
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
    color: #666;
  }

  .cmt-info-wrap {
    flex: 1;
    min-width: 0;
  }

  .cmt-head-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .cmt-name {
    font-size: 13px;
    font-weight: 600;
    color: #555;
  }

  .cmt-author-tag {
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 2px;
    background: #fdf6ec;
    color: #e6a23c;
  }

  .cmt-content {
    margin: 0 0 6px;
    font-size: 14px;
    line-height: 1.45;
    color: #222;
    word-break: break-word;
  }

  .cmt-foot-row {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: #999;
  }

  .cmt-reply {
    border: 0;
    background: none;
    color: #666;
    font-size: 12px;
    cursor: pointer;
    padding: 0;

    &:hover {
      color: #222;
    }
  }

  .cmt-like {
    border: 0;
    background: none;
    color: #888;
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

.bottom-action-bar {
  flex: none;
  padding: 12px 18px;
  border-top: 1px solid #f0eee8;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 12px;

  .input-pill {
    flex: 1;
    min-width: 0;
    height: 38px;
    border-radius: 999px;
    background: #f4f3f0;
    display: flex;
    align-items: center;
    padding: 0 14px;
    gap: 8px;

    .pen-icon {
      color: #999;
      font-size: 14px;
    }

    .pill-field {
      flex: 1;
      border: 0;
      background: none;
      font-size: 13px;
      color: #333;
      outline: none;

      &::placeholder {
        color: #999;
      }
    }

    .pill-send {
      border: 0;
      background: none;
      color: var(--ft-color-primary, #e60026);
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      padding: 0 4px;
    }
  }

  .action-buttons {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .btn-action {
    display: flex;
    align-items: center;
    gap: 4px;
    border: 0;
    background: none;
    cursor: pointer;
    padding: 4px;
    color: #444;
    font-size: 13px;
    transition: transform 140ms ease;

    &:hover {
      transform: scale(1.1);
    }

    .btn-emoji {
      font-size: 17px;
    }

    &.is-active {
      color: var(--ft-color-primary, #e60026);
      font-weight: 700;
    }
  }
}

// 手机端小红书样式
@media (max-width: 768px) {
  .community-detail-page {
    width: 100%;
    margin: 0;
    padding: 0;

    &__nav {
      display: none; // 手机端由卡片顶部接管
    }
  }

  .redbook-card {
    border: 0;
    border-radius: 0;
    height: auto;
    min-height: 100vh;
    box-shadow: none;
    flex-direction: column;

    &__mobile-top {
      height: 52px;
      padding: 0 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #f0eee8;
      background: #fff;
      position: sticky;
      top: 0;
      z-index: 20;

      .mobile-back {
        font-size: 22px;
        color: #333;
        text-decoration: none;
        padding: 4px;
      }

      .mobile-author {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .mobile-avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        object-fit: cover;
      }

      .mobile-avatar-fallback {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #f0ece1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
      }

      .mobile-name {
        font-size: 14px;
        font-weight: 700;
        color: #333;
      }

      .mobile-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .mobile-follow-btn {
        padding: 4px 12px;
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
        font-size: 17px;
        color: #444;
      }
    }

    // 上方图片自适应
    &__media {
      flex: none;
      width: 100%;
      min-height: 280px;
      max-height: 70vh;
      height: auto;
      background: #000;

      .media-img {
        max-height: 70vh;
      }
    }

    // 下方文案与评论
    &__content {
      width: 100%;
      height: auto;
      border-left: 0;
    }
  }

  .pc-author-bar {
    display: none;
  }

  .content-scroll-area {
    padding: 16px 14px 72px;
    overflow-y: visible;
  }

  .bottom-action-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 30;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
    box-shadow: 0 -2px 10px rgb(0 0 0 / 8%);
  }
}
</style>
