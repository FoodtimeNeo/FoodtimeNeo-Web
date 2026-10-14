<script setup>
import { computed, ref, watch } from 'vue';
import { safeMediaUrl } from '@/utils/mediaUrl.js';
const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  empty: { type: String, default: '暂未上传图片' },
});
const source = computed(() => safeMediaUrl(props.src));
const failed = ref(false);
watch(source, () => {
  failed.value = false;
});
</script>
<template>
  <div class="media-image">
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
</style>
