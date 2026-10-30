<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAutoHorizontalScroll } from '@/composables/useAutoHorizontalScroll.js';
import { useDragScroll } from '@/composables/useDragScroll.js';
import MediaImage from '@/components/base/MediaImage.vue';

/**
 * 首页食堂滑动窗口组件（仿照旧版滑动窗口样式）。
 * 支持鼠标抓取拖拽滚动、平滑自动横向跑马灯以及鼠标滚轮上下滑动转换为横向滚动。
 */
defineOptions({
  name: 'CanteenCarousel',
});

const props = defineProps({
  canteens: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['select']);
const router = useRouter();
const rootRef = ref(null);
const trackRef = ref(null);
const isWheeling = ref(false);

let wheelVelocity = 0;
let wheelFrameId = 0;
let snapRestoreTimer = null;

const displayItems = computed(() =>
  props.canteens.length > 1
    ? [...props.canteens, ...props.canteens]
    : props.canteens,
);

const {
  isDragging,
  wasDragged,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onPointerLeave,
  onLostPointerCapture,
} = useDragScroll(trackRef);

useAutoHorizontalScroll(trackRef, {
  pauseWhen: computed(() => isDragging.value || isWheeling.value),
  loopItemCount: computed(() => props.canteens.length),
  speed: 36,
  pauseOnHover: true,
  pauseOnTouch: true,
});

function imageFrameClass(index) {
  const classList = [
    'is-rotate-right',
    'is-rotate-left',
    'is-rotate-back',
    'is-rotate-soft',
  ];
  return classList[index % classList.length];
}

function hasRating(rating) {
  return Number.isFinite(rating) && rating >= 1 && rating <= 5;
}

function visibleChips(canteen) {
  const chips = [];
  if (hasRating(canteen.rating)) {
    chips.push(canteen.rating >= 4.5 ? '超高口碑' : '大众推荐');
  }
  if (canteen.stallsCount) {
    chips.push(`${canteen.stallsCount}个档口`);
  }
  if (canteen.avgPrice || canteen.price) {
    chips.push(`¥${canteen.avgPrice || canteen.price || 15}/人`);
  }
  return chips.length ? chips : ['校园招牌', '打卡推荐'];
}

function stopWheelAnimation() {
  if (wheelFrameId) {
    if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
      window.cancelAnimationFrame(wheelFrameId);
    }
    wheelFrameId = 0;
  }
  wheelVelocity = 0;
  if (snapRestoreTimer) {
    clearTimeout(snapRestoreTimer);
    snapRestoreTimer = null;
  }
  isWheeling.value = false;
}

function scheduleSnapRestore() {
  if (snapRestoreTimer) {
    clearTimeout(snapRestoreTimer);
  }
  snapRestoreTimer = setTimeout(() => {
    isWheeling.value = false;
    snapRestoreTimer = null;
  }, 100);
}

function applyScrollStep(track, delta) {
  const loopDistance = getLoopDistance();
  let nextScrollLeft = track.scrollLeft + delta;

  if (loopDistance > 0 && props.canteens.length > 1) {
    nextScrollLeft =
      ((nextScrollLeft % loopDistance) + loopDistance) % loopDistance;
    track.scrollLeft = nextScrollLeft;
  } else {
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const clamped = Math.max(0, Math.min(maxScroll, nextScrollLeft));
    track.scrollLeft = clamped;
    if (clamped <= 0 && delta < 0) {
      wheelVelocity = 0;
    } else if (clamped >= maxScroll && delta > 0) {
      wheelVelocity = 0;
    }
  }
}

function wheelTick() {
  const track = trackRef.value;
  if (!track) {
    stopWheelAnimation();
    return;
  }

  // 动量衰减：每帧消耗当前剩余速度的 18%
  const friction = 0.18;
  const moveDelta = wheelVelocity * friction;

  if (Math.abs(wheelVelocity) < 0.5) {
    const finalDelta = wheelVelocity;
    wheelVelocity = 0;
    wheelFrameId = 0;
    applyScrollStep(track, finalDelta);
    scheduleSnapRestore();
    return;
  }

  wheelVelocity -= moveDelta;
  applyScrollStep(track, moveDelta);

  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    wheelFrameId = window.requestAnimationFrame(wheelTick);
  } else {
    stopWheelAnimation();
  }
}

function handlePointerDown(event) {
  stopWheelAnimation();
  onPointerDown(event);
}

function handleSelect(canteenId) {
  stopWheelAnimation();
  if (wasDragged.value || !canteenId) {
    return;
  }

  emit('select', canteenId);
  router.push({ name: 'canteenDetail', params: { canteenId } });
}

function getLoopDistance() {
  const target = trackRef.value;
  if (!target) return 0;
  const loopCount = props.canteens.length;
  if (loopCount > 1 && target.children.length >= loopCount * 2) {
    const firstItem = target.children[0];
    const secondLoopFirstItem = target.children[loopCount];
    if (firstItem && secondLoopFirstItem) {
      const distance = secondLoopFirstItem.offsetLeft - firstItem.offsetLeft;
      if (Number.isFinite(distance) && distance > 1) {
        return distance;
      }
    }
  }
  const fallbackDistance = target.scrollWidth - target.clientWidth;
  return Number.isFinite(fallbackDistance) && fallbackDistance > 1
    ? fallbackDistance
    : 0;
}

function handleWheel(event) {
  const track = trackRef.value;
  if (!track) {
    return;
  }

  // 容器没有溢出不可滚动时，不拦截，保持默认垂直滚动
  if (track.scrollWidth <= track.clientWidth) {
    return;
  }

  const absY = Math.abs(event.deltaY);
  const absX = Math.abs(event.deltaX);

  if (absY === 0) {
    return;
  }

  // 鼠标上下滚轮为主导时，阻止默认垂直滚动，转化为横向平滑动量滚动
  if (absY >= absX) {
    event.preventDefault();

    let delta = event.deltaY;
    if (event.deltaMode === 1) {
      delta *= 40;
    } else if (event.deltaMode === 2) {
      delta *= track.clientWidth;
    }

    // 激活平滑滚动状态，临时屏蔽 CSS scroll-snap 避免冲突拉扯
    isWheeling.value = true;
    if (snapRestoreTimer) {
      clearTimeout(snapRestoreTimer);
      snapRestoreTimer = null;
    }

    // 累加滚轮脉冲动量
    wheelVelocity += delta;

    // 限制单次累计最大动量峰值，防止暴力拨轮导致速度过快
    const maxVelocity = (track.clientWidth || 800) * 1.5;
    wheelVelocity = Math.max(
      -maxVelocity,
      Math.min(maxVelocity, wheelVelocity),
    );

    // 立即启动动量衰减帧动画
    if (
      !wheelFrameId &&
      typeof window !== 'undefined' &&
      window.requestAnimationFrame
    ) {
      wheelFrameId = window.requestAnimationFrame(wheelTick);
    } else if (typeof window === 'undefined' || !window.requestAnimationFrame) {
      applyScrollStep(track, delta);
    }
  }
}

onMounted(() => {
  const root = rootRef.value;
  if (root) {
    root.addEventListener('wheel', handleWheel, { passive: false });
  }
});

onUnmounted(() => {
  stopWheelAnimation();
  const root = rootRef.value;
  if (root) {
    root.removeEventListener('wheel', handleWheel);
  }
});
</script>

<template>
  <div ref="rootRef" class="canteen-carousel" data-test="canteen-carousel">
    <div class="canteen-carousel__subhead">
      <img
        src="@/assets/images/decoration02/A/illustrations/A_chopsticks-lineart.png"
        alt=""
        class="canteen-carousel__decor-chopsticks"
        aria-hidden="true"
      />
    </div>

    <div
      ref="trackRef"
      class="canteen-carousel__track"
      :class="{ 'is-dragging': isDragging, 'is-wheeling': isWheeling }"
      @pointerdown="handlePointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
      @pointerleave="onPointerLeave"
      @lostpointercapture="onLostPointerCapture"
    >
      <article
        v-for="(canteen, index) in displayItems"
        :key="`${canteen.id}-${index}`"
        class="canteen-card"
        :class="`canteen-card--${index % 4}`"
        role="button"
        tabindex="0"
        @click="handleSelect(canteen.id)"
        @keydown.enter="handleSelect(canteen.id)"
      >
        <div class="canteen-card__media" :class="imageFrameClass(index)">
          <span class="canteen-card__postage" aria-hidden="true"></span>
          <span class="canteen-card__tape" aria-hidden="true"></span>
          <MediaImage
            :src="canteen.coverImageUrl || ''"
            :alt="`${canteen.name}封面图`"
            loading="lazy"
            class="canteen-card__image"
          />
        </div>

        <div class="canteen-card__content">
          <p
            v-if="canteen.intro || canteen.description"
            class="canteen-card__rant handwrite"
          >
            <span class="canteen-card__rant-text">
              “{{ canteen.intro || canteen.description }}”
            </span>
          </p>

          <div class="canteen-card__title-row">
            <h3 class="canteen-card__name">{{ canteen.name }}</h3>
            <span
              class="zine-rating-stamp"
              :class="{ 'is-unrated': !hasRating(canteen.rating) }"
            >
              {{
                hasRating(canteen.rating) ? canteen.rating.toFixed(1) : '无评分'
              }}
            </span>
          </div>

          <div class="canteen-card__chips">
            <span
              v-for="chip in visibleChips(canteen)"
              :key="`${canteen.id}-${chip}`"
              class="zine-chip"
            >
              {{ chip }}
            </span>
          </div>

          <div class="canteen-card__footer">
            <span class="canteen-card__more handwrite">翻开看看 →</span>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped lang="scss">
.canteen-carousel {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  margin-top: var(--ft-space-2, 16px);

  &__subhead {
    display: flex;
    justify-content: flex-end;
    margin-bottom: var(--ft-space-1, 8px);
  }

  &__decor-chopsticks {
    width: 32px;
    height: auto;
    opacity: 0.82;
    transform: rotate(15deg);
    pointer-events: none;
    filter: drop-shadow(1px 2px 0 rgba(58, 36, 24, 0.08));
  }

  &__track {
    display: flex;
    gap: 0;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 24px 28px 36px 8px;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
    cursor: grab;
    touch-action: pan-x;
    user-select: none;
    will-change: scroll-position;

    &::-webkit-scrollbar {
      display: none;
    }

    &.is-dragging {
      cursor: grabbing;
    }

    &.is-wheeling {
      scroll-snap-type: none !important;
      scroll-behavior: auto !important;
    }
  }
}

@keyframes cardBob0 {
  0%,
  100% {
    transform: translateY(0px) rotate(0.8deg);
  }
  50% {
    transform: translateY(-8px) rotate(1.2deg);
  }
}

@keyframes cardBob1 {
  0%,
  100% {
    transform: translateY(16px) rotate(-1.2deg);
  }
  50% {
    transform: translateY(8px) rotate(-1.6deg);
  }
}

@keyframes cardBob2 {
  0%,
  100% {
    transform: translateY(-8px) rotate(0.6deg);
  }
  50% {
    transform: translateY(-16px) rotate(0.2deg);
  }
}

@keyframes cardBob3 {
  0%,
  100% {
    transform: translateY(10px) rotate(-0.9deg);
  }
  50% {
    transform: translateY(2px) rotate(-1.3deg);
  }
}

@keyframes tapeSheen {
  0%,
  55% {
    transform: translateX(-150%) skewX(-20deg);
  }
  100% {
    transform: translateX(300%) skewX(-20deg);
  }
}

.canteen-card {
  position: relative;
  flex: 0 0 clamp(260px, 24vw, 285px);
  width: clamp(260px, 24vw, 285px);
  height: clamp(415px, 38vw, 450px);
  margin-right: -16px;
  border: 1px solid var(--ft-color-secondary);
  background:
    radial-gradient(circle at 80% 10%, rgb(63 114 145 / 8%) 0, transparent 24%),
    linear-gradient(180deg, var(--zine-paper-card) 0%, #f8efd9 100%);
  box-shadow: 5px 6px 0 rgb(58 36 24 / 15%);
  display: grid;
  grid-template-rows: minmax(0, 56%) minmax(0, 44%);
  padding: 9px;
  scroll-snap-align: start;
  cursor: pointer;
  will-change: transform;
  transition:
    transform var(--ft-transition-fast, 180ms cubic-bezier(0.16, 1, 0.3, 1)),
    box-shadow var(--ft-transition-fast, 180ms cubic-bezier(0.16, 1, 0.3, 1));

  &:hover {
    box-shadow: 8px 12px 0 rgb(58 36 24 / 22%);
    z-index: 5;
    animation-play-state: paused;
  }

  &--0 {
    --tape-rot: -1.2deg;
    transform: translateY(0px) rotate(0.8deg);
    animation: cardBob0 3s ease-in-out infinite;

    &:hover {
      transform: translateY(-8px) rotate(0.8deg) scale(1.02);
    }
  }

  &--1 {
    --tape-rot: 1.5deg;
    transform: translateY(16px) rotate(-1.2deg);
    animation: cardBob1 3s ease-in-out 0.75s infinite;

    &:hover {
      transform: translateY(8px) rotate(-1.2deg) scale(1.02);
    }
  }

  &--2 {
    --tape-rot: -0.8deg;
    transform: translateY(-8px) rotate(0.6deg);
    animation: cardBob2 3s ease-in-out 1.5s infinite;

    &:hover {
      transform: translateY(-16px) rotate(0.6deg) scale(1.02);
    }
  }

  &--3 {
    --tape-rot: 1deg;
    transform: translateY(10px) rotate(-0.9deg);
    animation: cardBob3 3s ease-in-out 2.25s infinite;

    &:hover {
      transform: translateY(2px) rotate(-0.9deg) scale(1.02);
    }
  }

  // 抓取拖拽时暂停浮动，避免坐标冲突
  .is-dragging & {
    animation-play-state: paused;
  }

  &__media {
    position: relative;
    min-height: 0;
    background: #fff;
    padding: 8px 8px 14px;
    box-shadow: 2px 2px 0 rgb(58 36 24 / 16%);
    transform-origin: center;
    transition: transform
      var(--ft-transition-fast, 180ms cubic-bezier(0.16, 1, 0.3, 1));

    &.is-rotate-left {
      transform: rotate(-1.2deg);
    }

    &.is-rotate-right {
      transform: rotate(1.2deg);
    }

    &.is-rotate-soft {
      transform: rotate(-0.5deg);
    }

    &.is-rotate-back {
      transform: rotate(0.5deg);
    }
  }

  &__postage {
    position: absolute;
    inset: 0;
    background: var(--zine-decor-postage) center / 100% 100% no-repeat;
    pointer-events: none;
    z-index: 1;
    opacity: 0.6;
    mix-blend-mode: multiply;
  }

  &__tape {
    position: absolute;
    top: -11px;
    left: 50%;
    transform: translateX(-50%) rotate(var(--tape-rot, -1deg));
    width: 74px;
    height: 22px;
    background: rgba(255, 255, 255, 0.76);
    border: 1px solid rgba(58, 36, 24, 0.16);
    box-shadow: 0 1px 3px rgba(58, 36, 24, 0.08);
    backdrop-filter: blur(1.5px);
    z-index: 2;
    pointer-events: none;
    overflow: hidden;
    border-radius: 1px;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      width: 40%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.65) 50%,
        transparent 100%
      );
      transform: translateX(-150%) skewX(-20deg);
      animation: tapeSheen 3.6s cubic-bezier(0.65, 0, 0.35, 1) infinite;
    }
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }

  &__content {
    position: relative;
    min-height: 0;
    padding: 10px 4px 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__rant {
    margin: 0;
    color: var(--zine-stamp-red);
    font-size: 15px;
    font-family: var(--ft-font-family-note);
    line-height: 1.25;
    min-height: 38px;
  }

  &__rant-text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }

  &__title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  &__name {
    margin: 0;
    font-family: var(--ft-font-family-title);
    font-size: clamp(20px, 1.8vw, 22px);
    font-weight: 900;
    line-height: 1.1;
    color: var(--ft-color-secondary);
    overflow-wrap: anywhere;
    text-wrap: balance;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .zine-chip {
    display: inline-block;
    padding: 1px 6px;
    font-size: 11px;
    border: 1px solid var(--ft-color-secondary);
    background: #fff;
    border-radius: 2px;
    color: var(--ft-color-text-muted);
    line-height: 1.3;
    box-shadow: 1px 1px 0 rgba(58, 36, 24, 0.1);
  }

  .zine-rating-stamp {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex: none;
    border: 1.5px solid var(--zine-stamp-red);
    color: var(--zine-stamp-red);
    font-weight: 900;
    font-size: 14px;
    font-family: var(--ft-font-family-title);
    transform: rotate(-5deg);
    border-radius: 50%;
    transition: transform 180ms cubic-bezier(0.2, 0.8, 0.4, 1.25);

    &.is-unrated {
      width: auto;
      min-width: 34px;
      height: 22px;
      padding: 0 7px;
      border-radius: 999px;
      font-size: 12px;
      white-space: nowrap;
      transform: rotate(-3deg);
    }
  }

  &.canteen-card:hover .zine-rating-stamp {
    transform: rotate(-2deg) scale(1.08);
  }

  &__footer {
    margin-top: auto;
    display: flex;
    justify-content: flex-end;
    padding-bottom: 2px;
  }

  &__more {
    font-size: 15px;
    color: var(--zine-stamp-blue);
    font-family: var(--ft-font-family-note);
    transition: transform 160ms ease;
  }

  &.canteen-card:hover &__more {
    transform: translateX(3px);
  }
}

@media (max-width: 768px) {
  .canteen-carousel__track {
    gap: 12px;
    padding: 8px 12px 16px;
    scroll-snap-type: x mandatory;
    touch-action: pan-x pan-y;
  }

  .canteen-card {
    flex-basis: min(78vw, 280px);
    width: min(78vw, 280px);
    height: auto;
    min-height: 340px;
    margin-right: 0;
    grid-template-rows: auto minmax(0, 1fr);
    padding: 8px;
    box-shadow: var(--app-mobile-shadow);
    transform: none;

    &--0,
    &--1,
    &--2,
    &--3,
    &__media,
    &__media.is-rotate-left,
    &__media.is-rotate-right,
    &__media.is-rotate-soft,
    &__media.is-rotate-back {
      transform: none;
    }

    &__media {
      aspect-ratio: 16 / 10;
      padding: 6px 6px 10px;
    }

    &__tape {
      display: none;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .canteen-card,
  .canteen-card--0,
  .canteen-card--1,
  .canteen-card--2,
  .canteen-card--3,
  .canteen-card:hover,
  .canteen-card--0:hover,
  .canteen-card--1:hover,
  .canteen-card--2:hover,
  .canteen-card--3:hover,
  .canteen-card__media,
  .canteen-card.canteen-card:hover .canteen-card__media,
  .canteen-card .zine-rating-stamp,
  .canteen-card.canteen-card:hover .zine-rating-stamp,
  .canteen-card__more,
  .canteen-card.canteen-card:hover .canteen-card__more,
  .canteen-card__tape::after {
    transform: none !important;
    transition: none !important;
    animation: none !important;
  }
}
</style>
