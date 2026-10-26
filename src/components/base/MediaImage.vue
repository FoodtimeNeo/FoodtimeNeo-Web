<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { mediaVariant } from '@/utils/mediaUrl.js';
import { useMediaSource } from '@/composables/useMediaSource.js';
const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  empty: { type: String, default: '暂未上传图片' },
  size: { type: String, default: 'thumb' },
  eager: { type: Boolean, default: false },
  fit: { type: String, default: 'cover' },
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
    :class="`media-image--${frame}`"
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
      v-else-if="failed"
      type="button"
      class="media-image__retry"
      aria-label="重新加载图片"
      @click.stop="retry"
    >
      重试
    </button>
    <span v-else-if="!src" role="img" :aria-label="empty">{{ empty }}</span>
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
  background: #fff;
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
span {
  padding: 16px;
  text-align: center;
  color: var(--ft-color-text-muted);
}
.media-image__retry {
  min-width: 44px;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--ft-color-text-muted);
  cursor: pointer;
}

@media (max-width: 768px) {
  .media-image--polaroid {
    padding: 5px 5px 16px;
    box-shadow: var(--app-mobile-shadow);
    transform: none;
  }
}
</style>
