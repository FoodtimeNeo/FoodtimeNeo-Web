<script setup>
import { computed } from 'vue';
import MediaImage from '@/components/base/MediaImage.vue';
import SearchHighlight from '@/components/base/SearchHighlight.vue';

const props = defineProps({
  keyword: { type: String, default: '' },
  venueTag: { type: String, default: '' },
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

const textExcerpt = computed(() => {
  const raw = String(props.post.content || '').trim();
  if (!raw) return '';
  return raw.length > 72 ? `${raw.slice(0, 72)}…` : raw;
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
    @keydown.space.prevent="handleClick"
  >
    <div class="community-post-card__cover-wrap" :style="aspectStyle">
      <MediaImage
        v-if="coverImage"
        :src="coverImage"
        :alt="post.title"
        class="community-post-card__image"
        loading="lazy"
      />
      <div v-else class="community-post-card__image-placeholder">
        <p v-if="textExcerpt" class="community-post-card__note-excerpt">
          {{ textExcerpt }}
        </p>
        <span v-else>🍲 美食记录</span>
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
        v-if="post.status === 'pending' || post.status === 'rejected'"
        class="community-post-card__pending-badge"
      >
        {{ post.status === 'pending' ? '待审核' : '未通过' }}
      </span>
    </div>

    <div class="community-post-card__body">
      <h2 class="community-post-card__title">
        <SearchHighlight :text="post.title" :keyword="keyword" />
      </h2>
      <p v-if="venueTag" class="community-post-card__venue">
        {{ venueTag }}
      </p>
      <div v-if="post.author" class="community-post-card__author-info">
        <span class="community-post-card__author-name">
          @{{ post.author.name || '校园干饭人' }}
        </span>
        <span
          v-if="typeof post.likeCount === 'number' && post.likeCount > 0"
          class="community-post-card__likes"
        >
          ♡ {{ post.likeCount }}
        </span>
      </div>
    </div>
  </article>
</template>

<style scoped lang="scss">
.community-post-card {
  display: flex;
  flex-direction: column;
  background: var(--zine-paper-card);
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-card);
  overflow: hidden;
  box-shadow: var(--ft-shadow-card);
  cursor: pointer;
  transition:
    transform var(--ft-transition-fast, 180ms ease),
    box-shadow var(--ft-transition-fast, 180ms ease),
    border-color var(--ft-transition-fast, 180ms ease);
  outline: none;
  margin-bottom: var(--ft-space-2, 16px);
  break-inside: avoid;

  &:hover,
  &:focus-visible {
    transform: translateY(-2px);
    box-shadow: var(--ft-shadow-card-hover);
    border-color: var(--ft-border-control);
  }

  &__cover-wrap {
    position: relative;
    width: 100%;
    min-height: 120px;
    max-height: 380px;
    background: var(--ft-color-surface-ink);
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
    transform: scale(1.03);
  }

  &__image-placeholder {
    width: 100%;
    height: 100%;
    min-height: 136px;
    padding: 16px 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ft-color-text-muted, #6e5547);
    font-size: var(--ft-font-size-sm, 14px);
    background: linear-gradient(
      145deg,
      var(--zine-paper-card-alt),
      var(--ft-color-bg-soft)
    );
  }

  &__note-excerpt {
    margin: 0;
    color: var(--ft-color-text);
    font-size: 13px;
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__multi-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    padding: 2px 8px;
    border-radius: var(--ft-radius-pill);
    background: rgb(28 20 15 / 72%);
    backdrop-filter: blur(4px);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
  }

  &__pending-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 2px 8px;
    border-radius: var(--ft-radius-pill);
    background: var(--ft-color-primary);
    color: #fff8f5;
    font-size: 11px;
    font-weight: 700;
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

  &__venue {
    margin: 0;
    display: inline-flex;
    align-self: flex-start;
    max-width: 100%;
    padding: 2px 8px;
    border-radius: var(--ft-radius-pill);
    background: var(--zine-paper-card-alt);
    color: var(--ft-color-text-muted);
    font-size: 11px;
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__author-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    font-size: 12px;
    color: var(--ft-color-text-muted, #6e5547);
  }

  &__author-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__likes {
    flex: none;
    font-size: 11px;
    color: var(--ft-color-text-muted);
  }
}

@media (prefers-reduced-motion: reduce) {
  .community-post-card,
  .community-post-card__image {
    transition: none;
  }

  .community-post-card:hover,
  .community-post-card:focus-visible,
  .community-post-card:hover .community-post-card__image {
    transform: none;
  }
}
</style>
