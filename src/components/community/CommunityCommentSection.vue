<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { fetchPostComments, createPostComment } from '@/api/community.api.js';

const props = defineProps({
  postId: {
    type: String,
    required: true,
  },
});

const comments = ref([]);
const loading = ref(false);
const submitting = ref(false);
const commentText = ref('');

async function loadComments() {
  loading.value = true;
  try {
    comments.value = await fetchPostComments(props.postId);
  } catch (error) {
    ElMessage.error(error.message || '加载评论失败');
  } finally {
    loading.value = false;
  }
}

async function handleSendComment() {
  const text = commentText.value.trim();
  if (!text) {
    ElMessage.warning('请输入评论内容');
    return;
  }

  submitting.value = true;
  try {
    const newCmt = await createPostComment(props.postId, {
      content: text,
    });
    comments.value.push(newCmt);
    commentText.value = '';
    ElMessage.success('评论发表成功');
  } catch (error) {
    ElMessage.error(error.message || '发表评论失败');
  } finally {
    submitting.value = false;
  }
}

function formatTime(isoString) {
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

onMounted(() => {
  loadComments();
});
</script>

<template>
  <section class="community-comments" aria-label="帖子评论区">
    <div class="community-comments__header">
      <h2 class="community-comments__title">
        评论区
        <span class="community-comments__count">({{ comments.length }})</span>
      </h2>
    </div>

    <!-- 发表评论表单 -->
    <div class="community-comments__input-box">
      <textarea
        v-model="commentText"
        class="community-comments__textarea"
        rows="2"
        placeholder="写下你的美食心得或想问的话..."
        maxlength="300"
        :disabled="submitting"
        @keydown.ctrl.enter="handleSendComment"
      ></textarea>
      <div class="community-comments__input-actions">
        <span class="char-tip">{{ commentText.length }}/300</span>
        <button
          type="button"
          class="community-comments__send-btn"
          :disabled="submitting || !commentText.trim()"
          @click="handleSendComment"
        >
          {{ submitting ? '发送中...' : '发送' }}
        </button>
      </div>
    </div>

    <!-- 评论列表 -->
    <div v-if="loading" class="community-comments__loading">加载评论中...</div>
    <div v-else-if="comments.length === 0" class="community-comments__empty">
      <span>💬 还没有评论，快来抢沙发吧~</span>
    </div>
    <div v-else class="community-comments__list">
      <article
        v-for="cmt in comments"
        :key="cmt.id"
        class="community-comments__item"
      >
        <div class="community-comments__avatar-wrap">
          <img
            v-if="cmt.author?.avatar"
            :src="cmt.author.avatar"
            :alt="cmt.author.name"
            class="community-comments__avatar"
          />
          <div v-else class="community-comments__avatar-fallback">
            {{ (cmt.author?.name || '友')[0] }}
          </div>
        </div>

        <div class="community-comments__content-wrap">
          <div class="community-comments__meta">
            <span class="community-comments__author-name">
              {{ cmt.author?.name || '校园同学' }}
            </span>
            <span class="community-comments__author-id">
              (ID: {{ cmt.author?.id || 'visitor' }})
            </span>
            <time class="community-comments__time">
              {{ formatTime(cmt.createdAt) }}
            </time>
          </div>

          <p class="community-comments__text">{{ cmt.content }}</p>

          <!-- 下阶段交互占位：点赞与回复 -->
          <div class="community-comments__sub-actions" aria-hidden="true">
            <span
              class="sub-action-item is-disabled"
              title="点赞功能将在下阶段开放"
            >
              👍 {{ cmt.likeCount ? cmt.likeCount : '点赞' }}
            </span>
            <span
              class="sub-action-item is-disabled"
              title="回复功能将在下阶段开放"
            >
              回复
            </span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped lang="scss">
.community-comments {
  margin-top: var(--ft-space-4, 32px);
  padding-top: var(--ft-space-3, 24px);
  border-top: 1px dashed var(--ft-color-border, #d5ccbc);

  &__header {
    margin-bottom: var(--ft-space-2, 16px);
  }

  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--ft-color-secondary, #3a2418);
  }

  &__count {
    font-size: 14px;
    color: var(--ft-color-text-muted, #6e5547);
    font-weight: normal;
  }

  &__input-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--ft-color-surface, #f8f5ee);
    border: 1px solid var(--ft-color-border, #d5ccbc);
    border-radius: var(--ft-radius-md, 10px);
    margin-bottom: var(--ft-space-3, 24px);
  }

  &__textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--ft-color-border, #d5ccbc);
    border-radius: var(--ft-radius-sm, 4px);
    padding: 8px 10px;
    background: #fff;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    outline: none;

    &:focus {
      border-color: var(--ft-color-primary, #c9341e);
    }
  }

  &__input-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .char-tip {
      font-size: 12px;
      color: var(--ft-color-text-muted, #6e5547);
    }
  }

  &__send-btn {
    padding: 6px 18px;
    background: var(--ft-color-primary, #c9341e);
    border: 1px solid var(--ft-color-primary-strong, #ab1f0b);
    color: #fff;
    border-radius: var(--ft-radius-sm, 4px);
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 3px 0 rgb(171 31 11 / 35%);
    transition: all var(--ft-transition-fast, 180ms ease);

    &:hover:not(:disabled) {
      background: var(--ft-color-primary-strong, #ab1f0b);
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }
  }

  &__loading,
  &__empty {
    padding: 24px 0;
    text-align: center;
    color: var(--ft-color-text-muted, #6e5547);
    font-size: 14px;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__item {
    display: flex;
    gap: 12px;
    padding-bottom: 14px;
    border-bottom: 1px solid rgb(213 204 188 / 40%);

    &:last-child {
      border-bottom: none;
    }
  }

  &__avatar-wrap {
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    overflow: hidden;
    background: var(--zine-paper-card-alt, #f7efd9);
    border: 1px solid var(--ft-color-border, #d5ccbc);
  }

  &__avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__avatar-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ft-color-secondary, #3a2418);
    font-weight: 700;
    font-size: 14px;
  }

  &__content-wrap {
    flex: 1;
    min-width: 0;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }

  &__author-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--ft-color-secondary, #3a2418);
  }

  &__author-id {
    font-size: 12px;
    color: var(--ft-color-text-muted, #6e5547);
  }

  &__time {
    font-size: 11px;
    color: var(--ft-color-text-muted, #6e5547);
    margin-left: auto;
  }

  &__text {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--ft-color-text, #3a2418);
    word-break: break-word;
  }

  &__sub-actions {
    display: flex;
    gap: 16px;
    margin-top: 6px;

    .sub-action-item {
      font-size: 12px;
      color: var(--ft-color-text-muted, #6e5547);
      cursor: default;

      &.is-disabled {
        opacity: 0.6;
      }
    }
  }
}
</style>
