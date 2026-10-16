<script setup>
import { computed, ref, watch } from 'vue';
import { safeMediaUrl } from '@/utils/mediaUrl.js';
const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  empty: { type: String, default: '暂未上传图片' },
  frame: {
    type: String,
    default: 'plain',
    validator: (value) => ['plain', 'polaroid', 'polygon'].includes(value),
  },
});
const source = computed(() => safeMediaUrl(props.src));
const failed = ref(false);
watch(source, () => {
  failed.value = false;
});
</script>
<template>
  <div class="media-image" :class="`media-image--${frame}`">
    <img
      v-if="source && !failed"
      :key="source"
      :src="source"
      :alt="alt"
      crossorigin="anonymous"
      referrerpolicy="no-referrer"
      loading="lazy"
      @error="failed = true"
    />
    <span v-else role="img" :aria-label="empty">{{ empty }}</span>
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

@media (max-width: 768px) {
  .media-image--polaroid {
    padding: 5px 5px 16px;
    box-shadow: var(--app-mobile-shadow);
    transform: none;
  }
}
</style>
