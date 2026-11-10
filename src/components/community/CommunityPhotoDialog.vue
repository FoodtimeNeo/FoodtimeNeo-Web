<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useMediaSource } from '@/composables/useMediaSource.js';
import { mediaVariant } from '@/utils/mediaUrl.js';

const props = defineProps({
  images: { type: Array, required: true },
  index: { type: Number, required: true },
  alt: { type: String, required: true },
});
const emit = defineEmits(['close', 'change']);
const dialog = ref(null);
const canvas = ref(null);
const imageArea = ref(null);
const closeButton = ref(null);
const expanded = ref(true);
const requestOriginal = ref(null);
const originalReady = ref(false);
const imageUrl = computed(() => props.images[props.index]?.url);
const previewUrl = computed(() => mediaVariant(imageUrl.value, 'thumb'));
const originalUrl = computed(() => mediaVariant(imageUrl.value, 'full'));
const canLoadOriginal = computed(
  () => Boolean(originalUrl.value) && previewUrl.value !== originalUrl.value,
);
const preview = useMediaSource(previewUrl);
const original = useMediaSource(
  originalUrl,
  () => requestOriginal.value === props.index && canLoadOriginal.value,
);
const showOriginal = computed(
  () => requestOriginal.value === props.index && originalReady.value,
);
const scale = ref(1);
const x = ref(0);
const y = ref(0);
const transform = computed(() => ({
  transform: `translate(${x.value}px, ${y.value}px) scale(${scale.value})`,
}));
let fittedAspect = 0;
const pointers = new Map();
let gesture;
let tap;
let tapTimer;
let resize;
let restoreFocus;
let previousOverflow;

function clearTap() {
  window.clearTimeout(tapTimer);
  tap = null;
}

function resetZoom() {
  scale.value = 1;
  x.value = 0;
  y.value = 0;
}

watch(
  () => props.index,
  () => {
    clearTap();
    requestOriginal.value = null;
    originalReady.value = false;
    fittedAspect = 0;
    resetZoom();
  },
  { flush: 'sync' },
);

function moveWithinCanvas() {
  if (!canvas.value || !fittedAspect || scale.value === 1) {
    x.value = 0;
    y.value = 0;
    return;
  }
  const { width, height } = canvas.value.getBoundingClientRect();
  const fitWidth = Math.min(width, imageArea.value.clientHeight * fittedAspect);
  const fitHeight = fitWidth / fittedAspect;
  const limitX = Math.max(0, (fitWidth * scale.value - width) / 2);
  const limitY = Math.max(0, (fitHeight * scale.value - height) / 2);
  x.value = Math.max(-limitX, Math.min(limitX, x.value));
  y.value = Math.max(-limitY, Math.min(limitY, y.value));
}

function zoom(next, from, to = from) {
  const rect = canvas.value.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const bounded = Math.max(1, Math.min(5, next));
  const ratio = bounded / scale.value;
  x.value = to.x - cx - (from.x - cx - x.value) * ratio;
  y.value = to.y - cy - (from.y - cy - y.value) * ratio;
  scale.value = bounded;
  moveWithinCanvas();
}

function onImageLoad(event, isOriginal) {
  const image = event.currentTarget;
  fittedAspect = image.naturalWidth / image.naturalHeight || fittedAspect;
  if (isOriginal) originalReady.value = true;
  moveWithinCanvas();
}

function loadOriginal() {
  if (requestOriginal.value === props.index) original.retry();
  else requestOriginal.value = props.index;
}

function navigate(direction) {
  const index = props.index + direction;
  if (index >= 0 && index < props.images.length) emit('change', index);
}

const point = (event) => ({ x: event.clientX, y: event.clientY });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function pinch() {
  const [a, b] = pointers.values();
  return {
    center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    span: Math.max(1, distance(a, b)),
  };
}

function onPointerDown(event) {
  if (event.button !== 0 || pointers.size >= 2) return;
  const position = point(event);
  pointers.set(event.pointerId, position);
  canvas.value.setPointerCapture?.(event.pointerId);
  if (pointers.size === 1) gesture = { start: position, moved: false };
  else {
    clearTap();
    gesture.moved = true;
    gesture.pinched = true;
  }
}

function onPointerMove(event) {
  const previous = pointers.get(event.pointerId);
  if (!previous) return;
  const before = pointers.size === 2 ? pinch() : null;
  const position = point(event);
  pointers.set(event.pointerId, position);
  if (before) {
    const after = pinch();
    zoom(scale.value * (after.span / before.span), before.center, after.center);
    return;
  }
  if (distance(position, gesture.start) > 10) {
    gesture.moved = true;
    clearTap();
  }
  if (scale.value > 1 && gesture.moved) {
    x.value += position.x - previous.x;
    y.value += position.y - previous.y;
    moveWithinCanvas();
  }
}

function onPointerUp(event) {
  if (!pointers.delete(event.pointerId) || pointers.size) return;
  const position = point(event);
  const dx = position.x - gesture.start.x;
  const dy = position.y - gesture.start.y;
  if (gesture.moved) {
    if (
      !gesture.pinched &&
      scale.value === 1 &&
      Math.abs(dx) > 44 &&
      Math.abs(dx) > Math.abs(dy) * 1.3
    )
      navigate(dx < 0 ? 1 : -1);
    return;
  }
  if (tap && distance(tap, position) < 36) {
    clearTap();
    if (scale.value > 1) resetZoom();
    else zoom(2.5, position);
    return;
  }
  clearTap();
  tap = position;
  tapTimer = window.setTimeout(() => emit('close'), 300);
}

function onPointerCancel() {
  pointers.clear();
  clearTap();
}

function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('close');
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    navigate(event.key === 'ArrowLeft' ? -1 : 1);
  } else if (['+', '=', '-'].includes(event.key)) {
    const rect = canvas.value.getBoundingClientRect();
    zoom(scale.value * (event.key === '-' ? 1 / 1.5 : 1.5), {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }
}

onMounted(() => {
  restoreFocus = document.activeElement;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  dialog.value.showModal();
  closeButton.value.focus();
  if (typeof ResizeObserver !== 'undefined') {
    resize = new ResizeObserver(moveWithinCanvas);
    resize.observe(canvas.value);
  }
});
onBeforeUnmount(() => {
  clearTap();
  resize?.disconnect();
  dialog.value?.close();
  document.body.style.overflow = previousOverflow;
  if (restoreFocus?.isConnected) restoreFocus.focus({ preventScroll: true });
});
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="photo-dialog"
      :class="{ 'photo-dialog--context': $slots.default }"
      aria-label="全屏看图"
      @cancel.prevent="emit('close')"
      @keydown.stop="onKeydown"
    >
      <div
        ref="canvas"
        class="photo-dialog__canvas"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @wheel.prevent="
          zoom(scale * Math.exp(-$event.deltaY * 0.002), point($event))
        "
      >
        <div ref="imageArea" class="photo-dialog__image-area">
          <img
            v-if="preview.source.value && !preview.failed.value"
            v-show="!showOriginal"
            :key="preview.source.value"
            :src="preview.source.value"
            :alt="`${alt} 第 ${index + 1} 张`"
            :style="transform"
            draggable="false"
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
            @load="onImageLoad($event, false)"
            @error="preview.failed.value = true"
          />
          <img
            v-if="
              requestOriginal === index &&
              original.source.value &&
              !original.failed.value
            "
            v-show="showOriginal"
            :key="original.source.value"
            :src="original.source.value"
            :alt="`${alt} 第 ${index + 1} 张`"
            :style="transform"
            draggable="false"
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
            @load="onImageLoad($event, true)"
            @error="original.failed.value = true"
          />
        </div>
      </div>
      <div
        v-if="!showOriginal && !preview.source.value"
        class="photo-dialog__loading"
        role="status"
      >
        {{ preview.loading.value ? '图片加载中…' : '' }}
      </div>
      <button
        v-if="preview.failed.value && !showOriginal"
        class="photo-dialog__retry"
        type="button"
        @click="preview.retry"
      >
        重试缩略图
      </button>
      <header class="photo-dialog__top">
        <button
          ref="closeButton"
          type="button"
          aria-label="关闭看图"
          class="photo-dialog__round"
          @click="emit('close')"
        >
          ×
        </button>
        <div class="photo-dialog__original">
          <button
            v-if="canLoadOriginal"
            type="button"
            :disabled="
              showOriginal ||
              (requestOriginal === index && !original.failed.value)
            "
            @click="loadOriginal"
          >
            {{
              showOriginal
                ? '已加载原图'
                : original.failed.value
                  ? '重试加载原图'
                  : requestOriginal === index
                    ? '原图加载中…'
                    : '加载原图'
            }}
          </button>
        </div>
        <span class="photo-dialog__count" aria-live="polite"
          >{{ index + 1 }}/{{ images.length }}</span
        >
      </header>
      <button
        v-if="index > 0"
        class="photo-dialog__round photo-dialog__prev"
        type="button"
        aria-label="上一张"
        @click="navigate(-1)"
      >
        ‹
      </button>
      <button
        v-if="index + 1 < images.length"
        class="photo-dialog__round photo-dialog__next"
        type="button"
        aria-label="下一张"
        @click="navigate(1)"
      >
        ›
      </button>
      <footer
        v-if="$slots.default"
        class="photo-dialog__footer"
        :class="{ 'is-expanded': expanded }"
      >
        <div v-show="expanded" class="photo-dialog__details">
          <slot :close="() => emit('close')" />
        </div>
        <button
          class="photo-dialog__round photo-dialog__toggle"
          type="button"
          :aria-label="expanded ? '收起帖子信息' : '展开帖子信息'"
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            :class="{ 'is-up': !expanded }"
          >
            <path
              d="m5 9 7 7 7-7"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </footer>
    </dialog>
  </Teleport>
</template>

<style scoped>
.photo-dialog {
  position: fixed;
  inset: 0;
  margin: 0;
  padding: 0;
  border: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  overflow: hidden;
  background: #000;
  color: #fff;
}
.photo-dialog::backdrop {
  background: #000;
}
.photo-dialog__canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  touch-action: none;
  user-select: none;
}
.photo-dialog__image-area {
  position: absolute;
  inset: min(58px, 20%) 0;
  pointer-events: none;
}
.photo-dialog--context .photo-dialog__image-area {
  inset-block: min(166px, 20%);
}
.photo-dialog__canvas img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}
.photo-dialog__top {
  position: absolute;
  inset: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  padding: calc(8px + env(safe-area-inset-top))
    max(12px, env(safe-area-inset-right)) 8px
    max(12px, env(safe-area-inset-left));
  background: linear-gradient(#000c, transparent);
  pointer-events: none;
}
.photo-dialog button {
  color: inherit;
  border: 0;
  cursor: pointer;
  font: inherit;
  min-height: 44px;
  pointer-events: auto;
}
.photo-dialog button:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.photo-dialog button:disabled {
  opacity: 0.85;
  cursor: default;
}
.photo-dialog__round {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  padding: 0;
  border-radius: 50%;
  background: #252525db;
  justify-self: start;
}
.photo-dialog button.photo-dialog__round {
  font-size: 27px;
  line-height: 1;
}
.photo-dialog__original button,
.photo-dialog__count,
.photo-dialog__retry {
  border-radius: 999px;
  background: #313131e8;
  padding: 5px 15px;
}
.photo-dialog__count {
  justify-self: end;
  font-variant-numeric: tabular-nums;
}
.photo-dialog__prev,
.photo-dialog__next {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}
.photo-dialog__prev {
  left: max(8px, env(safe-area-inset-left));
}
.photo-dialog__next {
  right: max(8px, env(safe-area-inset-right));
}
.photo-dialog__loading,
.photo-dialog__retry {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.photo-dialog__loading {
  pointer-events: none;
}
.photo-dialog__footer {
  position: absolute;
  inset: auto 0 0;
  padding: 12px max(16px, env(safe-area-inset-right))
    calc(10px + env(safe-area-inset-bottom))
    max(16px, env(safe-area-inset-left));
  pointer-events: none;
}
.photo-dialog__footer.is-expanded {
  background: linear-gradient(transparent, #000 38%);
}
.photo-dialog__details {
  padding-top: 8px;
}
.photo-dialog__toggle {
  position: absolute;
  right: max(16px, env(safe-area-inset-right));
  bottom: calc(10px + env(safe-area-inset-bottom));
}
.is-expanded .photo-dialog__toggle {
  top: 14px;
  bottom: auto;
}
.photo-dialog__toggle .is-up {
  transform: rotate(180deg);
}
</style>
