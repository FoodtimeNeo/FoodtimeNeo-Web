<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  fetchCommunityPostDetail,
  fetchPostComments,
  createPostComment,
} from '@/api/community.api.js';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';

/**
 * 小红书风格帖子详情弹窗。
 * 电脑端：居中双栏浮层，左侧自适应完整图片，右侧作者/正文/滚动评论/吸底操作栏。
 * 手机端：小红书原生上下流，顶部返回与作者简栏，上方图片，下方文案评论，底部吸底操作栏。
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
});

const emit = defineEmits(['update:modelValue', 'close', 'postUpdated']);

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
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${month}-${day} ${hours}:${minutes}`;
}

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function loadPostData(id) {
  if (!id) return;
  loading.value = true;
  error.value = null;
  currentImageIndex.value = 0;
  try {
    post.value = await fetchCommunityPostDetail(id);
    await loadComments(id);
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
  }
}

async function loadComments(id) {
  commentLoading.value = true;
  try {
    comments.value = await fetchPostComments(id);
  } catch (err) {
    console.warn('加载评论失败', err);
  } finally {
    commentLoading.value = false;
  }
}

watch(
  () => [props.modelValue, props.postId],
  ([isOpen, newId]) => {
    if (isOpen && newId) {
      loadPostData(newId);
    } else if (!isOpen) {
      post.value = null;
      error.value = null;
      comments.value = [];
      quickCommentText.value = '';
    }
  },
  { immediate: true },
);

function close() {
  emit('update:modelValue', false);
  emit('close');
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    close();
  }
}

function handleKeydown(e) {
  if (props.modelValue && e.key === 'Escape') {
    close();
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown);
  }
});

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
  emit('postUpdated', post.value);
}

function toggleFavorite() {
  if (!post.value) return;
  isFavorited.value = !isFavorited.value;
  post.value.favoriteCount =
    (post.value.favoriteCount || 0) + (isFavorited.value ? 1 : -1);
  ElMessage.success(isFavorited.value ? '收藏成功' : '已取消收藏');
  emit('postUpdated', post.value);
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
    ElMessage.success('已生成分享卡片');
  }
}

function focusCommentInput() {
  nextTick(() => {
    if (commentInputRef.value) {
      commentInputRef.value.focus();
    }
  });
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
  focusCommentInput();
}
</script>

<template>
  <Teleport to="body">
    <Transition name="redbook-fade">
      <div
        v-if="modelValue"
        class="redbook-modal"
        role="dialog"
        aria-modal="true"
        aria-label="帖子详情"
        @click="handleOverlayClick"
      >
        <!-- 移动端顶部导航栏（<= 768px） -->
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
              v-if="post?.author?.avatar"
              :src="post.author.avatar"
              :alt="post.author.name"
              class="mobile-author-avatar"
            />
            <span v-else class="mobile-author-fallback">{{
              (post?.author?.name || '饭')[0]
            }}</span>
            <span class="mobile-author-name">{{
              post?.author?.name || '校园干饭人'
            }}</span>
          </div>
          <div class="mobile-header-actions">
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

        <!-- 电脑端悬浮关闭按钮（> 768px） -->
        <button
          type="button"
          class="redbook-modal__close-btn"
          aria-label="关闭详情弹窗"
          @click="close"
        >
          ×
        </button>

        <!-- 弹窗主体卡片 -->
        <div class="redbook-modal__card" @click.stop>
          <LoadingState v-if="loading" />

          <ErrorState
            v-else-if="error"
            :description="error.message || '加载帖子详情失败'"
            @retry="loadPostData(postId)"
          />

          <div v-else-if="post" class="redbook-modal__body">
            <!-- 左侧：图片区域（自适应尺寸居中，保持原图比例） -->
            <div class="redbook-media-pane">
              <div class="redbook-media-pane__wrapper">
                <img
                  v-if="currentImage"
                  :src="currentImage"
                  :alt="post.title"
                  class="redbook-media-pane__img"
                  loading="lazy"
                />
                <div v-else class="redbook-media-pane__empty">
                  <span>暂无图片</span>
                </div>

                <!-- 切换箭头 -->
                <button
                  v-if="images.length > 1 && currentImageIndex > 0"
                  type="button"
                  class="redbook-img-nav redbook-img-nav--prev"
                  aria-label="上一张"
                  @click="prevImage"
                >
                  ‹
                </button>
                <button
                  v-if="
                    images.length > 1 && currentImageIndex < images.length - 1
                  "
                  type="button"
                  class="redbook-img-nav redbook-img-nav--next"
                  aria-label="下一张"
                  @click="nextImage"
                >
                  ›
                </button>

                <!-- 底部轮播小圆点 -->
                <div v-if="images.length > 1" class="redbook-dots">
                  <span
                    v-for="(_, idx) in images"
                    :key="idx"
                    class="redbook-dot"
                    :class="{ 'is-active': idx === currentImageIndex }"
                    @click="currentImageIndex = idx"
                  ></span>
                </div>
              </div>
            </div>

            <!-- 右侧：作者信息、正文、滚动评论与底部吸底操作栏 -->
            <div class="redbook-info-pane">
              <!-- 作者栏（PC 端展示） -->
              <header class="redbook-author-bar">
                <div class="redbook-author-avatar-wrap">
                  <img
                    v-if="post.author?.avatar"
                    :src="post.author.avatar"
                    :alt="post.author.name"
                    class="redbook-author-avatar"
                  />
                  <div v-else class="redbook-author-fallback">
                    {{ (post.author?.name || '饭')[0] }}
                  </div>
                </div>
                <div class="redbook-author-meta">
                  <span class="redbook-author-name">{{
                    post.author?.name || '校园干饭人'
                  }}</span>
                </div>
                <button
                  type="button"
                  class="redbook-follow-btn"
                  :class="{ 'is-following': isFollowing }"
                  @click="toggleFollow"
                >
                  {{ isFollowing ? '已关注' : '关注' }}
                </button>
              </header>

              <!-- 中间可滚动区域（正文 + 评论列表） -->
              <div class="redbook-scroll-area">
                <!-- 审核提示 -->
                <div
                  v-if="post.status === 'pending'"
                  class="redbook-audit-badge"
                >
                  ⚠️ 当前帖子正在审核中，仅供本人预览
                </div>

                <!-- 标题 -->
                <h1 class="redbook-post-title">{{ post.title }}</h1>

                <!-- 话题标签 -->
                <div
                  v-if="post.tags && post.tags.length"
                  class="redbook-post-tags"
                >
                  <span v-for="tag in post.tags" :key="tag" class="redbook-tag">
                    #{{ tag }}
                  </span>
                </div>

                <!-- 正文内容 -->
                <p class="redbook-post-text">{{ post.content }}</p>

                <!-- 发布时间与食堂位置 -->
                <div class="redbook-post-footline">
                  <time>{{ formatPostTime(post.createdAt) }}</time>
                  <span v-if="post.canteenName"> · {{ post.canteenName }}</span>
                </div>

                <!-- 评论列表部分 -->
                <div class="redbook-comments-section">
                  <div class="redbook-comments-header">
                    <span>共 {{ comments.length }} 条评论</span>
                  </div>

                  <div v-if="commentLoading" class="redbook-comments-loading">
                    评论加载中...
                  </div>
                  <div
                    v-else-if="comments.length === 0"
                    class="redbook-comments-empty"
                  >
                    还没有人评论，来发第一条吧~
                  </div>
                  <div v-else class="redbook-comments-list">
                    <article
                      v-for="cmt in comments"
                      :key="cmt.id"
                      class="redbook-comment-item"
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
                      <div class="cmt-content-wrap">
                        <div class="cmt-author-row">
                          <span class="cmt-author-name">{{
                            cmt.author?.name || '热心同学'
                          }}</span>
                          <span
                            v-if="cmt.author?.id === post.author?.id"
                            class="cmt-author-tag"
                            >作者</span
                          >
                        </div>
                        <p class="cmt-body-text">{{ cmt.content }}</p>
                        <div class="cmt-meta-row">
                          <time class="cmt-time">{{
                            formatTime(cmt.createdAt)
                          }}</time>
                          <button
                            type="button"
                            class="cmt-reply-btn"
                            @click="replyUser(cmt)"
                          >
                            回复
                          </button>
                          <button
                            type="button"
                            class="cmt-like-btn"
                            :class="{
                              'is-liked': likedComments.has(cmt.id),
                            }"
                            @click="toggleLikeComment(cmt)"
                          >
                            <span>{{
                              likedComments.has(cmt.id) ? '❤️' : '🤍'
                            }}</span>
                            <span v-if="cmt.likeCount">{{
                              cmt.likeCount
                            }}</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  </div>
                </div>
              </div>

              <!-- 底部吸底操作栏 -->
              <footer class="redbook-bottom-bar">
                <div class="redbook-input-pill">
                  <span class="pill-pen-icon" aria-hidden="true">✎</span>
                  <input
                    ref="commentInputRef"
                    v-model="quickCommentText"
                    type="text"
                    placeholder="说点什么..."
                    class="pill-input"
                    maxlength="300"
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
                    <span class="icon-emoji">{{ isLiked ? '❤️' : '🤍' }}</span>
                    <span class="icon-count">{{ post.likeCount || 0 }}</span>
                  </button>
                  <button
                    type="button"
                    class="action-icon-btn"
                    :class="{ 'is-active': isFavorited }"
                    :aria-label="`收藏 ${post.favoriteCount || 0}`"
                    @click="toggleFavorite"
                  >
                    <span class="icon-emoji">{{
                      isFavorited ? '⭐' : '☆'
                    }}</span>
                    <span class="icon-count">{{
                      post.favoriteCount || 0
                    }}</span>
                  </button>
                  <button
                    type="button"
                    class="action-icon-btn"
                    :aria-label="`评论 ${comments.length}`"
                    @click="focusCommentInput"
                  >
                    <span class="icon-emoji">💬</span>
                    <span class="icon-count">{{ comments.length }}</span>
                  </button>
                  <button
                    type="button"
                    class="action-icon-btn"
                    aria-label="分享"
                    @click="handleShare"
                  >
                    <span class="icon-emoji">↗</span>
                  </button>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.redbook-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 68%);
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
    background: rgb(255 255 255 / 85%);
    color: #333;
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
      background: #fff;
      transform: scale(1.08);
    }
  }

  &__card {
    position: relative;
    width: min(94vw, 1020px);
    height: min(88vh, 840px);
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 20px 50px rgb(0 0 0 / 35%);
    overflow: hidden;
    display: flex;
  }

  &__body {
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
}

// 移动端顶部栏默认隐藏
.redbook-mobile-header {
  display: none;
}

// 左栏：自适应图片展示
.redbook-media-pane {
  flex: 1;
  min-width: 0;
  height: 100%;
  background: #f7f6f9;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  &__wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    user-select: none;
    transition: opacity 200ms ease;
  }

  &__empty {
    color: var(--ft-color-text-muted);
    font-size: 15px;
  }
}

.redbook-img-nav {
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

.redbook-dots {
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
}

.redbook-dot {
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

// 右栏：信息、滚动评论与吸底栏
.redbook-info-pane {
  width: 420px;
  flex: none;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #f0eee8;
}

.redbook-author-bar {
  flex: none;
  height: 68px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #f5f2eb;

  .redbook-author-avatar-wrap {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    overflow: hidden;
    background: #f0ece1;
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
    color: var(--ft-color-secondary);
  }

  .redbook-author-meta {
    flex: 1;
    min-width: 0;
  }

  .redbook-author-name {
    font-size: 15px;
    font-weight: 700;
    color: #333;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .redbook-follow-btn {
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

.redbook-scroll-area {
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

.redbook-audit-badge {
  padding: 6px 12px;
  margin-bottom: 14px;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  color: #e6a23c;
  font-size: 12px;
  border-radius: 4px;
}

.redbook-post-title {
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.35;
  color: #222;
}

.redbook-post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;

  .redbook-tag {
    color: #13386c;
    font-size: 14px;
    font-weight: 600;
  }
}

.redbook-post-text {
  margin: 0 0 16px;
  font-size: 15px;
  line-height: 1.68;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
}

.redbook-post-footline {
  font-size: 12px;
  color: #999;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f2eee9;
}

.redbook-comments-section {
  .redbook-comments-header {
    font-size: 14px;
    font-weight: 700;
    color: #666;
    margin-bottom: 16px;
  }

  .redbook-comments-loading,
  .redbook-comments-empty {
    font-size: 13px;
    color: #999;
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
    color: #555;
  }

  .cmt-author-tag {
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 2px;
    background: #fdf6ec;
    color: #e6a23c;
  }

  .cmt-body-text {
    margin: 0 0 6px;
    font-size: 14px;
    line-height: 1.45;
    color: #222;
    word-break: break-word;
  }

  .cmt-meta-row {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: #999;
  }

  .cmt-reply-btn {
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

  .cmt-like-btn {
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

// 底部吸底操作栏
.redbook-bottom-bar {
  flex: none;
  padding: 12px 18px;
  border-top: 1px solid #f0eee8;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 12px;

  .redbook-input-pill {
    flex: 1;
    min-width: 0;
    height: 38px;
    border-radius: 999px;
    background: #f4f3f0;
    display: flex;
    align-items: center;
    padding: 0 14px;
    gap: 8px;

    .pill-pen-icon {
      color: #999;
      font-size: 14px;
    }

    .pill-input {
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
    gap: 14px;
  }

  .action-icon-btn {
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

    .icon-emoji {
      font-size: 17px;
    }

    &.is-active {
      color: var(--ft-color-primary, #e60026);
      font-weight: 700;
    }
  }
}

// 移动端响应式（<= 768px）
@media (max-width: 768px) {
  .redbook-modal {
    padding: 0;
    background: #fff;

    &__close-btn {
      display: none;
    }

    &__card {
      width: 100vw;
      height: 100vh;
      max-height: 100vh;
      border-radius: 0;
      flex-direction: column;
    }

    &__body {
      flex-direction: column;
      overflow-y: auto;
      height: calc(100vh - 54px - 60px);
    }
  }

  // 移动端顶部导航
  .redbook-mobile-header {
    flex: none;
    height: 54px;
    padding: 0 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #fff;
    border-bottom: 1px solid #f0eee8;

    .mobile-header-btn {
      border: 0;
      background: none;
      font-size: 24px;
      cursor: pointer;
      color: #333;
      padding: 4px;
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
      background: #eee;
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
      gap: 10px;
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

  // 移动端上方：图片自适应
  .redbook-media-pane {
    flex: none;
    width: 100%;
    min-height: 280px;
    max-height: 70vh;
    height: auto;
    background: #000;

    &__img {
      max-height: 70vh;
    }
  }

  // 移动端下方：文案与评论
  .redbook-info-pane {
    width: 100%;
    height: auto;
    border-left: 0;
  }

  .redbook-author-bar {
    display: none; // 手机端由顶部 header 接管
  }

  .redbook-scroll-area {
    padding: 16px 14px 20px;
    overflow-y: visible;
  }

  // 底部固定操作栏（吸底）
  .redbook-bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10002;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
    box-shadow: 0 -2px 10px rgb(0 0 0 / 8%);
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
