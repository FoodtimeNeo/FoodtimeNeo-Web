<script setup>
import { computed, ref, watch } from 'vue';
import { ElImageViewer } from 'element-plus';
import MediaImage from '@/components/base/MediaImage.vue';
import { useMediaSource } from '@/composables/useMediaSource.js';
import { mediaVariant } from '@/utils/mediaUrl.js';

const props = defineProps({
  images: {
    type: Array,
    default: () => [],
  },
  alt: {
    type: String,
    default: '帖子图片',
  },
});

const currentIndex = ref(0);
const isLightboxOpen = ref(false);
const stageRatio = computed(() => {
  const first = props.images[0];
  return first?.width > 0 && first?.height > 0
    ? `${first.width} / ${first.height}`
    : '4 / 3';
});
const { source: lightboxSource } = useMediaSource(
  () => mediaVariant(props.images[currentIndex.value]?.url, 'full'),
  isLightboxOpen,
);
const lightboxUrls = computed(() =>
  props.images.map((_, index) =>
    index === currentIndex.value && lightboxSource.value
      ? lightboxSource.value
      : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
  ),
);
const nearCurrent = (index) =>
  index === currentIndex.value ||
  (index === currentIndex.value + 1 &&
    !navigator.connection?.saveData &&
    !/2g/.test(navigator.connection?.effectiveType || ''));
watch(
  () => JSON.stringify(props.images.map(({ id, url }) => [id, url])),
  () => {
    currentIndex.value = 0;
    isLightboxOpen.value = false;
  },
);

// 触摸滑动逻辑
let startX = 0;
let deltaX = 0;

function handleTouchStart(e) {
  if (e.touches && e.touches.length > 0) {
    startX = e.touches[0].clientX;
    deltaX = 0;
  }
}

function handleTouchMove(e) {
  if (e.touches && e.touches.length > 0) {
    deltaX = e.touches[0].clientX - startX;
  }
}

function handleTouchEnd() {
  const threshold = 40; // 滑动阈值
  if (deltaX > threshold) {
    prevImage();
  } else if (deltaX < -threshold) {
    nextImage();
  }
  deltaX = 0;
}

function nextImage() {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value += 1;
  }
}

function prevImage() {
  if (currentIndex.value > 0) {
    currentIndex.value -= 1;
  }
}

function goToIndex(index) {
  currentIndex.value = index;
}

function openLightbox() {
  if (props.images.length > 0) {
    isLightboxOpen.value = true;
  }
}

function closeLightbox() {
  isLightboxOpen.value = false;
}
</script>

<template>
  <div class="community-image-viewer">
    <!-- 主轮播容器 -->
    <div
      class="community-image-viewer__stage"
      :style="{ aspectRatio: stageRatio }"
      tabindex="0"
      role="region"
      aria-label="图片轮播"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @keydown.left="prevImage"
      @keydown.right="nextImage"
      @keydown.enter.prevent="openLightbox"
      @keydown.space.prevent="openLightbox"
    >
      <div
        v-if="images.length > 0"
        class="community-image-viewer__track"
        :style="{ transform: `translateX(-${currentIndex * 100}%)` }"
      >
        <div
          v-for="(img, idx) in images"
          :key="img.id || idx"
          class="community-image-viewer__slide"
          @click="openLightbox"
        >
          <MediaImage
            v-if="nearCurrent(idx)"
            :src="img.url"
            :alt="`${alt} 第 ${idx + 1} 张`"
            class="community-image-viewer__img"
            loading="lazy"
            size="full"
            :eager="idx === currentIndex"
            fit="contain"
          />
        </div>
      </div>
      <div v-else class="community-image-viewer__empty">
        <span>暂无配图</span>
      </div>

      <span
        v-if="images.length > 1"
        class="community-image-viewer__counter"
        role="status"
        :aria-label="`第 ${currentIndex + 1} 张，共 ${images.length} 张`"
      >
        {{ currentIndex + 1 }} / {{ images.length }}
      </span>

      <!-- 桌面端左右翻页按钮 -->
      <button
        v-if="images.length > 1 && currentIndex > 0"
        type="button"
        class="community-image-viewer__nav-btn community-image-viewer__nav-btn--prev"
        aria-label="上一张图片"
        @click.stop="prevImage"
      >
        ‹
      </button>
      <button
        v-if="images.length > 1 && currentIndex < images.length - 1"
        type="button"
        class="community-image-viewer__nav-btn community-image-viewer__nav-btn--next"
        aria-label="下一张图片"
        @click.stop="nextImage"
      >
        ›
      </button>

      <!-- 单击放大提示 -->
      <div class="community-image-viewer__zoom-hint" aria-hidden="true">
        <span>点击放大</span>
      </div>
    </div>

    <!-- 底部圆点指示器（Dots，类似小红书） -->
    <div
      v-if="images.length > 1"
      class="community-image-viewer__dots"
      role="tablist"
      aria-label="图片指示点"
    >
      <button
        v-for="(_, idx) in images"
        :key="idx"
        type="button"
        class="community-image-viewer__dot"
        :class="{ 'is-active': idx === currentIndex }"
        :aria-label="`切换到第 ${idx + 1} 张`"
        :aria-selected="idx === currentIndex"
        role="tab"
        @click="goToIndex(idx)"
      ></button>
    </div>

    <ElImageViewer
      v-if="isLightboxOpen"
      :url-list="lightboxUrls"
      :initial-index="currentIndex"
      :infinite="false"
      :z-index="4000"
      teleported
      @close="closeLightbox"
      @switch="goToIndex"
    />
  </div>
</template>

<style scoped lang="scss">
.community-image-viewer {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  justify-content: center;

  &__stage {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 280px;
    max-height: 600px;
    background: radial-gradient(circle at center, #faf8f5 0%, #ece7df 100%);
    border-radius: var(--ft-radius-md, 14px);
    overflow: hidden;
    cursor: zoom-in;
    touch-action: pan-y pinch-zoom;
    box-shadow: 0 6px 20px rgb(58 36 24 / 8%);
    border: 1px solid rgb(213 204 188 / 45%);
    display: flex;
    align-items: center;
  }

  &__track {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    transition: transform 320ms cubic-bezier(0.25, 1, 0.5, 1);
  }

  &__slide {
    flex: 0 0 100%;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 280px;
    max-height: 600px;
    background: transparent;
    padding: 12px;
    box-sizing: border-box;
  }

  &__img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
    user-select: none;
    -webkit-user-drag: none;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgb(0 0 0 / 6%);
    transition: transform 220ms ease;

    &:hover {
      transform: scale(1.01);
    }
  }

  &__empty {
    min-height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ft-color-text-muted, #6e5547);
    font-size: 14px;
  }

  &__nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgb(255 255 255 / 78%);
    color: #333;
    border: 1px solid rgb(255 255 255 / 60%);
    font-size: 26px;
    line-height: 36px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 14px rgb(0 0 0 / 12%);
    transition:
      background 180ms ease,
      transform 180ms ease,
      box-shadow 180ms ease;
    z-index: 2;

    &:hover {
      background: #fff;
      transform: translateY(-50%) scale(1.08);
      box-shadow: 0 6px 18px rgb(0 0 0 / 18%);
    }

    &--prev {
      left: 14px;
    }

    &--next {
      right: 14px;
    }
  }

  &__zoom-hint {
    position: absolute;
    bottom: 12px;
    right: 12px;
    padding: 4px 10px;
    background: rgb(0 0 0 / 45%);
    color: #fff;
    font-size: 11px;
    border-radius: var(--ft-radius-pill, 999px);
    pointer-events: none;
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    gap: 4px;
    transition: opacity 180ms ease;
  }

  &__counter {
    position: absolute;
    top: 12px;
    right: 12px;
    padding: 4px 10px;
    border-radius: var(--ft-radius-pill, 999px);
    background: rgb(0 0 0 / 50%);
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    pointer-events: none;
    backdrop-filter: blur(6px);
  }

  &__dots {
    display: flex;
    flex-wrap: wrap;
    width: 100%;
    min-width: 0;
    align-items: center;
    justify-content: center;
    gap: 0 8px;
    margin-top: 12px;
  }

  &__dot {
    flex: 0 0 36px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    padding: 0;
    background: transparent;
    cursor: pointer;
    &::after {
      content: '';
      display: block;
      margin: auto;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--ft-color-border, #d5ccbc);
      transition: all 240ms ease;
    }

    &.is-active {
      &::after {
        width: 18px;
        border-radius: 4px;
        background: var(--ft-color-primary, #e60026);
      }
    }
  }
}
</style>
