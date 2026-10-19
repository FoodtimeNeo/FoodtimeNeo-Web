<script setup>
import { computed } from 'vue';

const props = defineProps({
  post: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['click']);

const coverImage = computed(() => {
  if (props.post.images && props.post.images.length > 0) {
    return props.post.images[0].url || '';
  }
  return '';
});

// 计算宽高比样式，防止图片加载过程布局跳动
const aspectStyle = computed(() => {
  const first = props.post.images?.[0];
  if (first && first.width && first.height) {
    const ratio = Math.max(0.65, Math.min(1.5, first.width / first.height));
    return {
      aspectRatio: `${ratio}`,
    };
  }
  return {
    aspectRatio: '3 / 4',
  };
});

function handleClick() {
  emit('click', props.post);
}
</script>

<template>
  <article
    class="community-post-card"
    tabindex="0"
    role="button"
    :aria-label="post.title"
    @click="handleClick"
    @keydown.enter="handleClick"
  >
    <div class="community-post-card__cover-wrap" :style="aspectStyle">
      <img
        v-if="coverImage"
        :src="coverImage"
        :alt="post.title"
        class="community-post-card__image"
        loading="lazy"
      />
      <div v-else class="community-post-card__image-placeholder">
        <span>🍲 美食记录</span>
      </div>

      <!-- 多图小标识（右上角） -->
      <span
        v-if="post.images && post.images.length > 1"
        class="community-post-card__multi-badge"
        aria-hidden="true"
      >
        ❐ {{ post.images.length }}
      </span>

      <!-- 待审核标识（仅非公开或自身查看时显示） -->
      <span
        v-if="post.status === 'pending'"
        class="community-post-card__pending-badge"
      >
        待审核
      </span>
    </div>

    <div class="community-post-card__body">
      <h2 class="community-post-card__title">{{ post.title }}</h2>
      <div v-if="post.author" class="community-post-card__author-info">
        <span class="community-post-card__author-name">
          @{{ post.author.name || '校园干饭人' }}
        </span>
      </div>
    </div>
  </article>
</template>

<style scoped lang="scss">
.community-post-card {
  display: flex;
  flex-direction: column;
  background: var(--zine-paper-card, #fffaf0);
  border: 1px solid var(--ft-color-border, #d5ccbc);
  border-radius: var(--ft-radius-md, 10px);
  overflow: hidden;
  box-shadow: 0 4px 10px rgb(58 36 24 / 8%);
  cursor: pointer;
  transition:
    transform var(--ft-transition-fast, 180ms ease),
    box-shadow var(--ft-transition-fast, 180ms ease);
  outline: none;
  margin-bottom: var(--ft-space-2, 16px);
  break-inside: avoid;

  &:hover,
  &:focus-visible {
    transform: translateY(-2px);
    box-shadow: 0 8px 18px rgb(58 36 24 / 14%);
    border-color: var(--ft-color-secondary-soft, #6a4b3a);
  }

  &__cover-wrap {
    position: relative;
    width: 100%;
    min-height: 120px;
    max-height: 380px;
    background: var(--ft-color-surface-ink, #f1ece2);
    overflow: hidden;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform var(--ft-transition-base, 320ms ease);
  }

  &:hover &__image {
    transform: scale(1.02);
  }

  &__image-placeholder {
    width: 100%;
    height: 100%;
    min-height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ft-color-text-muted, #6e5547);
    font-size: var(--ft-font-size-sm, 14px);
    background: var(--zine-paper-card-alt, #f7efd9);
  }

  &__multi-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 2px 7px;
    background: rgb(0 0 0 / 55%);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    border-radius: var(--ft-radius-pill, 999px);
    backdrop-filter: blur(4px);
  }

  &__pending-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 2px 8px;
    background: #e6a23c;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    border-radius: 4px;
    box-shadow: 0 2px 6px rgb(0 0 0 / 20%);
  }

  &__body {
    padding: 10px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__title {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.4;
    color: var(--ft-color-text, #3a2418);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
  }

  &__author-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: var(--ft-color-text-muted, #6e5547);
  }

  &__author-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
