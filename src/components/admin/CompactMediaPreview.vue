<script setup>
import { computed, ref } from 'vue';
import { ElImageViewer } from 'element-plus';
import MediaImage from '@/components/base/MediaImage.vue';
import { useMediaSource } from '@/composables/useMediaSource.js';
import { mediaVariant } from '@/utils/mediaUrl.js';

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, required: true },
});
const open = ref(false);
const { source, failed, loading, retry } = useMediaSource(
  () => mediaVariant(props.src, 'full'),
  open,
);
const urls = computed(() => (source.value ? [source.value] : []));
</script>

<template>
  <button
    type="button"
    class="compact-media"
    :aria-label="`查看完整${alt}`"
    @click="open = true"
  >
    <MediaImage
      :src="src"
      :alt="alt"
      fit="contain"
      :retryable="false"
      compact
    />
    <span>查看大图</span>
  </button>
  <p v-if="open && loading" role="status">大图加载中…</p>
  <div v-if="open && failed" role="alert">
    大图加载失败。<button type="button" @click="retry">重试加载大图</button
    ><button type="button" @click="open = false">取消</button>
  </div>
  <ElImageViewer
    v-if="open && urls.length"
    :url-list="urls"
    :infinite="false"
    :z-index="4000"
    teleported
    @close="open = false"
  />
</template>

<style scoped>
.compact-media {
  display: block;
  width: 80px;
  margin: 6px 0;
  padding: 0;
  border: 1px solid var(--ft-color-border);
  background: var(--zine-paper-card-alt);
  color: var(--ft-color-text);
  cursor: zoom-in;
  font: inherit;
  font-size: var(--ft-font-size-xs);
}
.compact-media :deep(img),
.compact-media :deep(.media-image) {
  display: block;
  width: 78px;
  height: 64px;
  min-height: 0;
  object-fit: contain;
}
.compact-media:focus-visible {
  outline: 2px solid var(--ft-color-primary);
  outline-offset: 3px;
}
</style>
