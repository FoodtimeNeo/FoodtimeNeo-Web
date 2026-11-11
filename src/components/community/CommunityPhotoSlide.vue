<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useMediaSource } from '@/composables/useMediaSource.js';
import { mediaVariant } from '@/utils/mediaUrl.js';

const props = defineProps({
  image: { type: Object, required: true },
  alt: { type: String, required: true },
  active: Boolean,
  settling: Boolean,
  transform: { type: Object, default: () => ({}) },
});
const emit = defineEmits(['dimensions']);
const previewElement = ref(null);
const requested = ref(false);
const ready = ref(false);
const previewUrl = computed(() => mediaVariant(props.image.url, 'thumb'));
const originalUrl = computed(() => mediaVariant(props.image.url, 'full'));
const canLoadOriginal = computed(
  () => Boolean(originalUrl.value) && previewUrl.value !== originalUrl.value,
);
const preview = useMediaSource(previewUrl);
// Keep an already decoded original through the slide-out, but cancel unfinished requests.
const original = useMediaSource(originalUrl, requested);
const showOriginal = computed(
  () => requested.value && ready.value && Boolean(original.source.value),
);
const state = computed(() => ({
  previewSource: preview.source.value,
  previewLoading: preview.loading.value,
  previewFailed: preview.failed.value,
  originalFailed: original.failed.value,
  originalRequested: requested.value,
  canLoadOriginal: canLoadOriginal.value,
  showOriginal: showOriginal.value,
}));

function dimensions(image) {
  if (props.active && image?.naturalWidth)
    emit('dimensions', {
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
}
function loaded(event, full) {
  if (full) ready.value = true;
  dimensions(event.currentTarget);
}
function loadOriginal() {
  if (!canLoadOriginal.value) return;
  if (requested.value) original.retry();
  else requested.value = true;
}
watch(
  [() => props.active, () => props.settling],
  async ([active, settling]) => {
    if (!active && (!settling || !ready.value)) {
      requested.value = false;
      ready.value = false;
    }
    if (active) {
      await nextTick();
      dimensions(previewElement.value);
    }
  },
);
defineExpose({ state, loadOriginal, retryPreview: preview.retry });
</script>

<template>
  <img
    v-if="preview.source.value && !preview.failed.value"
    v-show="!showOriginal"
    ref="previewElement"
    :src="preview.source.value"
    :alt="alt"
    :style="active ? transform : undefined"
    draggable="false"
    crossorigin="anonymous"
    referrerpolicy="no-referrer"
    @load="loaded($event, false)"
    @error="preview.failed.value = true"
  />
  <img
    v-if="requested && original.source.value && !original.failed.value"
    v-show="showOriginal"
    :src="original.source.value"
    :alt="alt"
    :style="active ? transform : undefined"
    draggable="false"
    crossorigin="anonymous"
    referrerpolicy="no-referrer"
    @load="loaded($event, true)"
    @error="original.failed.value = true"
  />
</template>

<style scoped>
img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}
</style>
