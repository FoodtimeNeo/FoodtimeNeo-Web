<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import {
  axisAmount,
  PRICE_UNITS,
  recordedPrice,
  stepCoordinates,
} from '@/utils/priceHistory.js';
import { formatTime } from '@/utils/recordLabels.js';
const props = defineProps({ run: { type: Object, required: true } });
const host = ref(null),
  width = ref(360),
  selected = ref(0);
const axisSize = ref(14);
const geometry = computed(() =>
  stepCoordinates(props.run, width.value, 260, axisSize.value),
);
const current = computed(() => geometry.value.points[selected.value]);
let observer;
watch(
  () => props.run,
  () => {
    selected.value = 0;
  },
);
onMounted(() => {
  axisSize.value = Math.max(
    14,
    parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.875,
  );
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(([entry]) => {
      width.value = Math.max(200, entry.contentRect.width);
    });
    observer.observe(host.value);
  }
});
onBeforeUnmount(() => observer?.disconnect());
function choose(event) {
  const box = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - box.left) * width.value) / box.width;
  let best = 0;
  geometry.value.points.forEach((point, i) => {
    if (Math.abs(point.x - x) <= Math.abs(geometry.value.points[best].x - x))
      best = i;
  });
  selected.value = best;
}
function move(delta) {
  selected.value = Math.max(
    0,
    Math.min(geometry.value.points.length - 1, selected.value + delta),
  );
}
const date = (time) =>
  new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
  }).format(time);
</script>
<template>
  <section ref="host" class="price-chart">
    <h2>
      价格（元{{
        run.unit === 'unspecified'
          ? '，单位未注明'
          : '/' + PRICE_UNITS[run.unit]
      }}）
    </h2>
    <svg
      :viewBox="`0 0 ${width} 260`"
      role="group"
      tabindex="0"
      aria-label="价格阶梯折线图，点击选择记录，左右方向键切换记录"
      @click="choose"
      @keydown.left.prevent="move(-1)"
      @keydown.right.prevent="move(1)"
    >
      <g v-for="fraction in [0, 0.5, 1]" :key="fraction">
        <line
          :x1="geometry.left"
          :x2="geometry.right"
          :y1="geometry.bottom - fraction * (geometry.bottom - geometry.top)"
          :y2="geometry.bottom - fraction * (geometry.bottom - geometry.top)"
          class="grid"
        />
        <text
          :x="geometry.left - 8"
          :y="geometry.bottom - fraction * (geometry.bottom - geometry.top) + 5"
          text-anchor="end"
        >
          {{ axisAmount(geometry.maximum * fraction) }}
        </text>
      </g>
      <path :d="geometry.path" class="trend" />
      <circle
        v-for="point in geometry.points"
        :key="point.entry.id"
        :cx="point.x"
        :cy="point.y"
        r="4"
        class="dot"
      />
      <circle
        v-if="current"
        :cx="current.x"
        :cy="current.y"
        r="7"
        class="selected"
      />
      <text :x="geometry.left" y="248">{{ date(run.start) }}</text>
      <text :x="geometry.right" y="248" text-anchor="end">
        {{ date(run.end) }}
      </text>
    </svg>
    <p v-if="current" aria-live="polite">
      {{ formatTime(current.entry.recordedAt) }} ·
      {{ recordedPrice(current.price, run.unit)
      }}{{ current.entry.carriedForward ? '（沿用区间开始前的记录）' : '' }}
    </p>
  </section>
</template>
<style scoped lang="scss">
.price-chart {
  min-width: 0;
  background: var(--zine-paper-card);
  padding: 12px;
  border: 1px solid var(--ft-color-border);
  border-radius: 12px;
}
h2 {
  font-size: 1rem;
  margin: 0;
}
svg {
  display: block;
  width: 100%;
  height: 260px;
  cursor: crosshair;
}
text {
  font-size: max(14px, 0.875rem);
  fill: var(--ft-color-text);
}
.grid {
  stroke: var(--ft-color-border);
  stroke-dasharray: 3 5;
  stroke-width: 1;
}
.trend {
  fill: none;
  stroke: var(--ft-color-primary);
  stroke-width: 2.5;
}
.dot {
  fill: var(--ft-color-primary);
}
.selected {
  fill: var(--zine-paper-card);
  stroke: var(--ft-color-primary);
  stroke-width: 3;
}
p {
  min-height: 3em;
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
