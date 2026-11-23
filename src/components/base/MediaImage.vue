<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import foodBowl from '@/assets/food/bowl.svg';
import { mediaVariant } from '@/utils/mediaUrl.js';
import { useMediaSource } from '@/composables/useMediaSource.js';
const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  empty: { type: String, default: '暂未上传图片' },
  size: { type: String, default: 'thumb' },
  eager: { type: Boolean, default: false },
  fit: { type: String, default: 'cover' },
  compact: { type: Boolean, default: false },
  retryable: { type: Boolean, default: true },
  frame: {
    type: String,
    default: 'plain',
    validator: (value) => ['plain', 'polaroid', 'polygon'].includes(value),
  },
});
const frameElement = ref(null);
const visible = ref(props.eager);
const { source, failed, loading, retry } = useMediaSource(
  () => mediaVariant(props.src, props.size),
  visible,
);
let observer;
onMounted(() => {
  if (props.eager || typeof IntersectionObserver === 'undefined')
    visible.value = true;
  else {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          visible.value = true;
          observer.disconnect();
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(frameElement.value);
  }
});
onBeforeUnmount(() => observer?.disconnect());
</script>
<template>
  <div
    ref="frameElement"
    class="media-image"
    :class="[`media-image--${frame}`, { 'media-image--compact': compact }]"
    :aria-busy="loading"
  >
    <img
      v-if="source && !failed"
      :key="source"
      :src="source"
      :alt="alt"
      crossorigin="anonymous"
      referrerpolicy="no-referrer"
      loading="lazy"
      decoding="async"
      :style="{ objectFit: fit }"
      @error="failed = true"
    />
    <button
      v-else-if="failed && retryable"
      type="button"
      class="media-image__retry"
      aria-label="重新加载图片"
      @click.stop="retry"
    >
      重试
    </button>
    <span
      v-else-if="!src"
      class="media-image__empty"
      role="img"
      :aria-label="empty"
    >
      <img
        v-if="!compact"
        class="media-image__illustration"
        :src="foodBowl"
        alt=""
        aria-hidden="true"
      />
      <span>{{ empty }}</span>
    </span>
  </div>
</template>
<style scoped>
.media-image {
  width: 100%;
  height: 100%;
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--zine-paper-card-alt);
  overflow: hidden;
}

.media-image--polaroid {
  padding: 7px 7px 24px;
  background: var(--zine-paper-card);
  box-shadow: 4px 5px 0 rgb(58 36 24 / 22%);
  transform: rotate(var(--zine-rotate-left));
}

.media-image--polygon {
  clip-path: polygon(1% 3%, 100% 0, 98% 97%, 3% 100%);
}
img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.media-image__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  max-width: 100%;
  max-height: 100%;
  padding: 12px;
  text-align: center;
  color: var(--ft-color-text-muted);
}
.media-image__empty .media-image__illustration {
  width: min(120px, 100%);
  height: min(80px, 60%);
  flex: 0 1 80px;
  min-height: 0;
  object-fit: contain;
}
.media-image--compact .media-image__empty {
  padding: 4px;
}
.media-image__retry {
  min-width: 44px;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--ft-color-text-muted);
  cursor: pointer;
}
.media-image--compact {
  min-height: 0;
}

@media (max-width: 768px) {
  .media-image--polaroid {
    padding: 5px 5px 16px;
    box-shadow: var(--app-mobile-shadow);
    transform: none;
  }
}
</style>
