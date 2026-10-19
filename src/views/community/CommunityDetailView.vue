<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { fetchCommunityPostDetail } from '@/api/community.api.js';
import CommunityImageViewer from '@/components/community/CommunityImageViewer.vue';
import CommunityCommentSection from '@/components/community/CommunityCommentSection.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';

const route = useRoute();

const postId = computed(() => String(route.params.postId));
const post = ref(null);
const loading = ref(false);
const error = ref(null);

async function loadPost() {
  loading.value = true;
  error.value = null;
  try {
    post.value = await fetchCommunityPostDetail(postId.value);
  } catch (err) {
    error.value = err;
  } finally {
    loading.value = false;
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

const isLiked = ref(false);
const isFavorited = ref(false);

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

onMounted(() => {
  loadPost();
});
</script>

<template>
  <div class="community-detail-view">
    <nav class="community-detail-view__back-nav">
      <RouterLink :to="{ name: 'community' }" class="back-link">
        ← 返回社区
      </RouterLink>
    </nav>

    <LoadingState v-if="loading" />

    <ErrorState
      v-else-if="error"
      :description="error.message || '加载帖子详情失败'"
      @retry="loadPost"
    />

    <article v-else-if="post" class="community-detail-card torn-edge">
      <!-- 审核状态提示条（如果为待审核状态） -->
      <div
        v-if="post.status === 'pending'"
        class="community-detail-card__audit-banner"
      >
        <span>⚠️ 当前帖子正在审核中，审核通过前仅供本人预览</span>
      </div>

      <!-- 上半部分：多图轮播、圆点指示器与单击放大 -->
      <div class="community-detail-card__media-section">
        <CommunityImageViewer :images="post.images" :alt="post.title" />
      </div>

      <!-- 下半部分：作者信息、时间、标题与正文 -->
      <div class="community-detail-card__content-section">
        <!-- 发帖人与发布时间 -->
        <header class="community-detail-card__author-bar">
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
          <time class="post-time">{{ formatPostTime(post.createdAt) }}</time>
        </header>

        <!-- 标题 -->
        <h1 class="community-detail-card__title">{{ post.title }}</h1>

        <!-- 正文 -->
        <p class="community-detail-card__text">{{ post.content }}</p>

        <!-- 互动操作栏（点赞、收藏） -->
        <div class="community-detail-card__interactions">
          <button
            type="button"
            class="interact-btn"
            :class="{ 'is-active': isLiked }"
            :aria-pressed="isLiked"
            @click="toggleLike"
          >
            <span class="btn-icon">{{ isLiked ? '❤️' : '🤍' }}</span>
            <span
              >{{ isLiked ? '已赞' : '点赞' }} {{ post.likeCount || 0 }}</span
            >
          </button>
          <button
            type="button"
            class="interact-btn"
            :class="{ 'is-active': isFavorited }"
            :aria-pressed="isFavorited"
            @click="toggleFavorite"
          >
            <span class="btn-icon">{{ isFavorited ? '⭐' : '☆' }}</span>
            <span
              >{{ isFavorited ? '已收藏' : '收藏' }}
              {{ post.favoriteCount || 0 }}</span
            >
          </button>
        </div>

        <!-- 评论区组件 -->
        <CommunityCommentSection :post-id="post.id" />
      </div>
    </article>
  </div>
</template>

<style scoped lang="scss">
.community-detail-view {
  width: min(calc(100% - var(--zine-page-padding) * 2), 780px);
  margin: var(--ft-space-4, 32px) auto 64px;

  &__back-nav {
    margin-bottom: var(--ft-space-2, 16px);

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--ft-color-primary, #c9341e);
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
      padding: 4px 8px;
      border-radius: 4px;
      background: var(--ft-color-surface-ink, #f1ece2);
      transition: background 180ms ease;

      &:hover {
        background: #fff;
      }
    }
  }
}

.community-detail-card {
  background: var(--zine-paper-card, #fffaf0);
  border: 1px solid var(--ft-color-border, #d5ccbc);
  border-radius: var(--ft-radius-lg, 16px);
  padding: 24px;
  box-shadow: 0 10px 30px rgb(58 36 24 / 12%);

  &__audit-banner {
    padding: 8px 14px;
    background: #fdf6ec;
    border: 1px solid #faecd8;
    color: #e6a23c;
    font-size: 13px;
    font-weight: 600;
    border-radius: 6px;
    margin-bottom: 16px;
  }

  &__media-section {
    margin-bottom: 20px;
  }

  &__content-section {
    display: flex;
    flex-direction: column;
  }

  &__author-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgb(213 204 188 / 50%);

    .author-avatar-wrap {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      overflow: hidden;
      border: 1px solid var(--ft-color-border, #d5ccbc);
      background: var(--zine-paper-card-alt, #f7efd9);
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
      color: var(--ft-color-secondary, #3a2418);
      font-weight: 700;
      font-size: 16px;
    }

    .author-info {
      display: flex;
      flex-direction: column;
    }

    .author-name {
      font-size: 15px;
      font-weight: 700;
      color: var(--ft-color-secondary, #3a2418);
    }

    .author-id {
      font-size: 12px;
      color: var(--ft-color-text-muted, #6e5547);
    }

    .post-time {
      margin-left: auto;
      font-size: 12px;
      color: var(--ft-color-text-muted, #6e5547);
    }
  }

  &__title {
    margin: 0 0 12px;
    font-size: 22px;
    font-weight: 800;
    line-height: 1.4;
    color: var(--ft-color-secondary, #3a2418);
  }

  &__text {
    margin: 0 0 20px;
    font-size: 15px;
    line-height: 1.7;
    color: var(--ft-color-text, #3a2418);
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__interactions {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;

    .interact-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: var(--ft-color-surface, #f8f5ee);
      border: 1px solid var(--ft-color-border, #d5ccbc);
      border-radius: var(--ft-radius-pill, 999px);
      font-size: 13px;
      color: var(--ft-color-secondary, #3a2418);
      cursor: pointer;
      transition: all var(--ft-transition-fast, 180ms ease);

      &:hover {
        background: #fff;
        border-color: var(--ft-color-primary, #c9341e);
      }

      &.is-active {
        background: #fff;
        border-color: var(--ft-color-primary, #c9341e);
        color: var(--ft-color-primary, #c9341e);
        font-weight: 700;
        box-shadow: 0 2px 6px rgb(201 52 30 / 15%);
      }
    }
  }
}

@media (max-width: 768px) {
  .community-detail-view {
    width: 100%;
    padding: 0 var(--zine-page-padding-mobile, 14px);
    margin: var(--ft-space-2, 16px) auto 80px;
  }

  .community-detail-card {
    padding: 16px;
    border-radius: var(--ft-radius-md, 10px);

    &__title {
      font-size: 18px;
    }

    &__text {
      font-size: 14px;
    }
  }
}
</style>
