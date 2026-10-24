<script setup>
import { ref, watch } from 'vue';
import { ElImageViewer } from 'element-plus';

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
watch(
  () => props.images,
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
          <img
            :src="img.url"
            :alt="`${alt} 第 ${idx + 1} 张`"
            class="community-image-viewer__img"
            loading="lazy"
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
        <span>🔍 点击放大</span>
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
      :url-list="images.map((image) => image.url)"
      :initial-index="currentIndex"
      :infinite="false"
      :z-index="4000"
      teleported
      @close="closeLightbox"
    />
  </div>
</template>

<style scoped lang="scss">
.community-image-viewer {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-width: 0;

  &__stage {
    position: relative;
    width: 100%;
    max-height: 520px;
    background: var(--ft-color-surface-ink, #f1ece2);
    border-radius: var(--ft-radius-md, 10px);
    overflow: hidden;
    cursor: zoom-in;
    touch-action: pan-y pinch-zoom;
    box-shadow: 0 4px 12px rgb(58 36 24 / 10%);
    border: 1px solid var(--ft-color-border, #d5ccbc);
  }

  &__track {
    display: flex;
    width: 100%;
    height: 100%;
    transition: transform 320ms cubic-bezier(0.25, 1, 0.5, 1);
  }

  &__slide {
    flex: 0 0 100%;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 280px;
    max-height: 520px;
    background: #000;
  }

  &__img {
    max-width: 100%;
    max-height: 520px;
    object-fit: contain;
    display: block;
    user-select: none;
    -webkit-user-drag: none;
  }

  &__empty {
    min-height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ft-color-text-muted, #6e5547);
  }

  &__nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgb(0 0 0 / 45%);
    color: #fff;
    border: none;
    font-size: 26px;
    line-height: 34px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
    transition:
      background 180ms ease,
      transform 180ms ease;
    z-index: 2;

    &:hover {
      background: rgb(0 0 0 / 75%);
      transform: translateY(-50%) scale(1.08);
    }

    &--prev {
      left: 12px;
    }

    &--next {
      right: 12px;
    }
  }

  &__zoom-hint {
    position: absolute;
    bottom: 12px;
    right: 12px;
    padding: 3px 8px;
    background: rgb(0 0 0 / 55%);
    color: #fff;
    font-size: 11px;
    border-radius: var(--ft-radius-pill, 999px);
    pointer-events: none;
    backdrop-filter: blur(4px);
  }

  &__counter {
    position: absolute;
    top: 12px;
    right: 12px;
    padding: 4px 10px;
    border-radius: var(--ft-radius-pill, 999px);
    background: rgb(0 0 0 / 65%);
    color: #fff;
    font-size: 13px;
    pointer-events: none;
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
    flex: 0 0 44px;
    width: 44px;
    height: 44px;
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
    }
    transition: all 240ms ease;

    &.is-active {
      &::after {
        width: 18px;
        border-radius: 4px;
        background: var(--ft-color-primary, #c9341e);
      }
    }
  }
}
</style>
