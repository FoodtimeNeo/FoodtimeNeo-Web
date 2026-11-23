<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAutoHorizontalScroll } from '@/composables/useAutoHorizontalScroll.js';
import { useDragScroll } from '@/composables/useDragScroll.js';
import {
  getDishCoverImage,
  getCanteenCoverImage,
  getDishDisplayPrice,
  getCleanCanteenChips,
  getCleanDishIntro,
} from '@/utils/homeVisuals.js';

/**
 * 首页滑动窗口组件（支持菜品推荐与食堂档案两类卡片）。
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
  items: {
    type: Array,
    default: null,
  },
  variant: {
    type: String,
    default: 'canteen',
  },
});

const emit = defineEmits(['select']);
const router = useRouter();
const rootRef = ref(null);
const trackRef = ref(null);
const isWheeling = ref(false);

let wheelVelocity = 0;
let wheelFrameId = 0;
let wheelIdleTimer = null;
let cachedLoopDistance = 0;
let isLoopDistanceValid = false;
let measuredLoopCount = -1;
let geometryObserver = null;
let childObserver = null;

function invalidateLoopDistance() {
  isLoopDistanceValid = false;
}
const sourceItems = computed(() => props.items ?? props.canteens);
const displayItems = computed(() =>
  sourceItems.value.length > 1
    ? [...sourceItems.value, ...sourceItems.value]
    : sourceItems.value,
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
  loopItemCount: computed(() => sourceItems.value.length),
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

function getItemCoverImage(item) {
  if (props.variant === 'dish') {
    return getDishCoverImage(item);
  }
  return getCanteenCoverImage(item);
}

function getItemCleanIntro(item) {
  const raw = item.intro || item.description || '';
  return getCleanDishIntro(raw);
}

function getItemChips(item) {
  if (props.variant === 'dish') {
    const chips = [];
    if (item.canteenName) {
      chips.push(item.canteenName);
    }
    if (hasRating(item.rating)) {
      chips.push(item.rating >= 4.5 ? '超高口碑' : '大众推荐');
    }
    return chips;
  }
  if (props.variant === 'stall') {
    const chips = [];
    if (item.canteenName) {
      chips.push(item.canteenName);
    }
    if (item.reviewCount > 0) {
      chips.push(`${item.reviewCount}条评价`);
    }
    if (hasRating(item.rating)) {
      chips.push(item.rating >= 4.5 ? '超高口碑' : '大众推荐');
    }
    return chips;
  }
  return getCleanCanteenChips(item);
}

function getDishPrice(dish) {
  return getDishDisplayPrice(dish);
}

function stopWheelAnimation() {
  if (wheelFrameId) {
    if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
      window.cancelAnimationFrame(wheelFrameId);
    }
    wheelFrameId = 0;
  }
  wheelVelocity = 0;
  if (wheelIdleTimer) {
    clearTimeout(wheelIdleTimer);
    wheelIdleTimer = null;
  }
  isWheeling.value = false;
}

function scheduleWheelIdle() {
  if (wheelIdleTimer) {
    clearTimeout(wheelIdleTimer);
  }
  wheelIdleTimer = setTimeout(() => {
    isWheeling.value = false;
    wheelIdleTimer = null;
  }, 100);
}

function applyScrollStep(track, delta) {
  const loopDistance = getLoopDistance();
  let nextScrollLeft = track.scrollLeft + delta;

  if (loopDistance > 0 && sourceItems.value.length > 1) {
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
    scheduleWheelIdle();
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

function handleSelect(item) {
  stopWheelAnimation();
  if (wasDragged.value || !item?.id) {
    return;
  }

  emit('select', item.id);
  if (item.route) {
    router.push(item.route);
  } else if (props.variant === 'canteen') {
    router.push({ name: 'canteenDetail', params: { canteenId: item.id } });
  }
}

function getLoopDistance() {
  const target = trackRef.value;
  if (!target) return 0;
  const loopCount = sourceItems.value.length;
  if (isLoopDistanceValid && measuredLoopCount === loopCount) {
    return cachedLoopDistance;
  }
  measuredLoopCount = loopCount;
  isLoopDistanceValid = true;
  if (loopCount > 1 && target.children.length >= loopCount * 2) {
    const firstItem = target.children[0];
    const secondLoopFirstItem = target.children[loopCount];
    if (firstItem && secondLoopFirstItem) {
      const distance = secondLoopFirstItem.offsetLeft - firstItem.offsetLeft;
      if (Number.isFinite(distance) && distance > 1) {
        cachedLoopDistance = distance;
        return cachedLoopDistance;
      }
    }
  }
  const fallbackDistance = target.scrollWidth - target.clientWidth;
  cachedLoopDistance =
    Number.isFinite(fallbackDistance) && fallbackDistance > 1
      ? fallbackDistance
      : 0;
  return cachedLoopDistance;
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

    // 激活滚动状态，暂停自动跑马灯；松手后恢复
    isWheeling.value = true;
    if (wheelIdleTimer) {
      clearTimeout(wheelIdleTimer);
      wheelIdleTimer = null;
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
  const track = trackRef.value;
  if (track) {
    if (typeof ResizeObserver !== 'undefined') {
      geometryObserver = new ResizeObserver(invalidateLoopDistance);
      geometryObserver.observe(track);
    }
    if (typeof MutationObserver !== 'undefined') {
      childObserver = new MutationObserver(invalidateLoopDistance);
      childObserver.observe(track, { childList: true });
    }
    window.addEventListener('resize', invalidateLoopDistance);
    getLoopDistance();
  }
});

onUnmounted(() => {
  stopWheelAnimation();
  const root = rootRef.value;
  if (root) {
    root.removeEventListener('wheel', handleWheel);
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', invalidateLoopDistance);
  }
  geometryObserver?.disconnect();
  childObserver?.disconnect();
  geometryObserver = null;
  childObserver = null;
});
</script>

<template>
  <div ref="rootRef" class="canteen-carousel" data-test="canteen-carousel">
    <!-- 保留有效引导提示语 -->
    <div class="canteen-carousel__subhead">
      <span class="canteen-carousel__hint handwrite"
        >→ 划划看，发现心仪{{
          variant === 'dish' ? '菜品' : variant === 'stall' ? '档口' : '食堂'
        }}</span
      >
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
        :class="[`canteen-card--${index % 4}`, `canteen-card--${variant}`]"
        role="button"
        tabindex="0"
        @click="handleSelect(canteen)"
        @keydown.enter="handleSelect(canteen)"
      >
        <div class="canteen-card__media" :class="imageFrameClass(index)">
          <span class="canteen-card__postage" aria-hidden="true"></span>
          <span class="canteen-card__tape" aria-hidden="true"></span>
          <!-- 采用高质量美食实拍/插画作为占位图，告别“暂未上传图片”冷感文字框；食堂支持差异化配图 -->
          <img
            :src="getItemCoverImage(canteen)"
            :alt="`${canteen.name}封面图`"
            class="canteen-card__image"
            loading="lazy"
          />
        </div>

        <div class="canteen-card__content">
          <!-- 清洗后的特色描述；无意义文案如“发现更多菜品”已完全滤除 -->
          <p
            v-if="getItemCleanIntro(canteen)"
            class="canteen-card__rant handwrite"
          >
            <span class="canteen-card__rant-text">
              “{{ getItemCleanIntro(canteen) }}”
            </span>
          </p>

          <div class="canteen-card__title-row">
            <h3 class="canteen-card__name">{{ canteen.name }}</h3>
            <!-- 仅在有有效评分时展示，评分无效或为 0 时直接隐藏评分徽章，不显示“无评分” -->
            <span v-if="hasRating(canteen.rating)" class="zine-rating-stamp">
              {{ canteen.rating.toFixed(1) }}
            </span>
          </div>

          <!-- 真实业务 Chips（过滤千篇一律的无意义标签） -->
          <div v-if="getItemChips(canteen).length" class="canteen-card__chips">
            <span
              v-for="chip in getItemChips(canteen)"
              :key="`${canteen.id}-${chip}`"
              class="zine-chip"
            >
              {{ chip }}
            </span>
          </div>

          <!-- 底部真实业务信息：补充展示价格与推荐人次，彻底删掉“翻开看看 →”无意义文字 -->
          <div class="canteen-card__footer">
            <div v-if="variant === 'dish'" class="canteen-card__dish-footer">
              <span class="canteen-card__price">
                <small>¥</small>{{ getDishPrice(canteen) }}
              </span>
              <span
                v-if="canteen.reviewCount"
                class="canteen-card__social-stat"
              >
                {{ canteen.reviewCount }} 人吃过
              </span>
              <span v-else class="canteen-card__social-stat"> 人气尝鲜 </span>
            </div>
            <div v-else class="canteen-card__canteen-footer">
              <span class="canteen-card__sub-location">
                {{
                  canteen.canteenName ||
                  (canteen.stallsCount
                    ? `${canteen.stallsCount} 个档口可选`
                    : '交大风味')
                }}
              </span>
            </div>
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
    padding: 0 var(--ft-space-2, 12px);
    margin-bottom: var(--ft-space-1, 8px);
  }

  &__hint {
    color: var(--zine-stamp-red);
    font-size: 22px;
    font-family: var(--ft-font-family-note);
    transform: rotate(2deg);
    user-select: none;
  }

  &__track {
    display: flex;
    gap: 0;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 20px 24px 32px 8px;
    scrollbar-width: none;
    cursor: grab;
    touch-action: pan-x;
    user-select: none;

    &::-webkit-scrollbar {
      display: none;
    }

    &.is-dragging {
      cursor: grabbing;
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
  flex: 0 0 clamp(250px, 23vw, 275px);
  width: clamp(250px, 23vw, 275px);
  height: clamp(380px, 35vw, 415px);
  margin-right: -14px;
  border: 1px solid var(--ft-color-secondary);
  background:
    radial-gradient(circle at 80% 10%, rgb(63 114 145 / 8%) 0, transparent 24%),
    linear-gradient(
      180deg,
      var(--zine-paper-card) 0%,
      var(--ft-color-surface) 100%
    );
  box-shadow: 5px 6px 0 rgb(58 36 24 / 15%);
  display: grid;
  grid-template-rows: minmax(0, 57%) minmax(0, 43%);
  padding: 8px;
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

  .is-dragging & {
    animation-play-state: paused;
  }

  &__media {
    position: relative;
    min-height: 0;
    background: var(--zine-paper-card);
    padding: 7px 7px 12px;
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
  }

  &__tape {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%) rotate(var(--tape-rot, -1deg));
    width: 68px;
    height: 20px;
    background: rgb(var(--ft-overlay-surface-rgb) / 0.76);
    border: 1px solid rgba(58, 36, 24, 0.16);
    box-shadow: 0 1px 3px rgba(58, 36, 24, 0.08);
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
        rgb(var(--ft-overlay-surface-rgb) / 0.65) 50%,
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

  /* 收紧卡片上下多余 Padding，让信息排版更饱满精巧 */
  &__content {
    position: relative;
    min-height: 0;
    padding: 6px 4px 2px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__rant {
    margin: 0;
    color: var(--zine-stamp-red);
    font-size: 14px;
    font-family: var(--ft-font-family-note);
    line-height: 1.2;
    min-height: 20px;
  }

  &__rant-text {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
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
    font-size: clamp(18px, 1.6vw, 21px);
    font-weight: 900;
    line-height: 1.15;
    color: var(--ft-color-secondary);
    overflow-wrap: anywhere;
    text-wrap: balance;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 2px;
  }

  .zine-chip {
    display: inline-block;
    padding: 1px 6px;
    font-size: 11px;
    border: 1px solid var(--ft-color-secondary);
    background: var(--zine-paper-card);
    border-radius: 2px;
    color: var(--ft-color-text-muted);
    line-height: 1.3;
    box-shadow: 1px 1px 0 rgba(58, 36, 24, 0.1);
  }

  .zine-rating-stamp {
    display: inline-flex;
    mix-blend-mode: normal;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex: none;
    border: 1.5px solid var(--zine-stamp-red);
    color: var(--zine-stamp-red);
    font-weight: 900;
    font-size: 13px;
    font-family: var(--ft-font-family-title);
    transform: rotate(-5deg);
    border-radius: 50%;
    transition: transform 180ms cubic-bezier(0.2, 0.8, 0.4, 1.25);
  }

  &.canteen-card:hover .zine-rating-stamp {
    transform: rotate(-2deg) scale(1.08);
  }

  /* 底部真实业务信息栏，替换原无意义文案 */
  &__footer {
    margin-top: auto;
    padding-top: 4px;
    border-top: 1px dashed rgba(58, 36, 24, 0.15);
  }

  &__dish-footer {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  &__price {
    font-family: var(--ft-font-family-title);
    font-size: 17px;
    font-weight: 900;
    color: var(--ft-color-primary, #c9341e);

    small {
      font-size: 12px;
      margin-right: 1px;
      font-weight: 700;
    }
  }

  &__social-stat {
    font-size: 11px;
    color: var(--ft-color-text-muted);
    font-family: var(--ft-font-family-note);
  }

  &__canteen-footer {
    display: flex;
    justify-content: flex-start;
  }

  &__sub-location {
    font-size: 12px;
    font-weight: 700;
    color: var(--ft-color-text-muted);
    font-family: var(--ft-font-family-note);
  }
}

@media (max-width: 768px) {
  .canteen-carousel__track {
    gap: 12px;
    padding: 8px 12px 16px;
    touch-action: pan-x pan-y;
  }

  .canteen-card {
    flex-basis: min(78vw, 270px);
    width: min(78vw, 270px);
    height: auto;
    min-height: 330px;
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
  .canteen-card__tape::after {
    transform: none !important;
    transition: none !important;
    animation: none !important;
  }
}
</style>
