<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchCanteens } from '@/api/canteen.api.js';
import { useAsyncData } from '@/composables/useAsyncData.js';
import {
  availableMapHalls,
  clampMapTransform,
  mapTransformAt,
} from '@/utils/campusMap.js';
import model from '@/assets/campus-map/regions.json';
import image from '@/assets/campus-map/campus-map.webp';

const route = useRoute();
const router = useRouter();
const svg = ref(null);
const selectedId = ref(
  model.regions.some((r) => r.id === route.query.hall) ? route.query.hall : '',
);
const selected = computed(() =>
  model.regions.find((r) => r.id === selectedId.value),
);
const {
  data: halls,
  loading,
  error,
  load,
} = useAsyncData(fetchCanteens, { initial: [] });
const destinations = computed(() =>
  availableMapHalls(selected.value, halls.value),
);
const state = reactive({ zoom: 1, x: 0, y: 0 });
const pointers = new Map();
let gesture = null;
const imageFailed = ref(false);

function position(event) {
  const matrix = svg.value?.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  );
  return { x: point.x, y: point.y };
}
function setState(value) {
  Object.assign(state, value);
}
function zoom(amount, point = { x: model.width / 2, y: model.height / 2 }) {
  setState(
    mapTransformAt(
      state,
      state.zoom * amount,
      point,
      model.width,
      model.height,
    ),
  );
}
function reset() {
  setState({ zoom: 1, x: 0, y: 0 });
}
function choose(id) {
  selectedId.value = id;
  void router.replace({ query: { ...route.query, hall: id } });
}
function down(event) {
  if (event.button !== 0 && event.pointerType === 'mouse') return;
  const point = position(event);
  pointers.set(event.pointerId, point);
  svg.value.setPointerCapture(event.pointerId);
  if (pointers.size === 1)
    gesture = {
      start: point,
      last: point,
      moved: false,
      target: event.target.dataset.region,
    };
  else {
    if (gesture) gesture.moved = true;
    gesture = { ...gesture, distance: distance(), moved: true };
  }
}
function distance() {
  const [a, b] = [...pointers.values()];
  return b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
}
function move(event) {
  if (!pointers.has(event.pointerId)) return;
  const point = position(event);
  pointers.set(event.pointerId, point);
  if (pointers.size > 1) {
    const next = distance();
    const [a, b] = [...pointers.values()];
    if (gesture?.distance > 0)
      zoom(next / gesture.distance, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    gesture = { moved: true, distance: next };
    return;
  }
  if (!gesture?.last) {
    gesture = { moved: true, last: point, start: point };
    return;
  }
  const threshold =
    (model.width / Math.max(1, svg.value.getBoundingClientRect().width)) * 6;
  if (
    Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) > threshold
  )
    gesture.moved = true;
  if (gesture.moved)
    setState(
      clampMapTransform(
        {
          ...state,
          x: state.x + point.x - gesture.last.x,
          y: state.y + point.y - gesture.last.y,
        },
        model.width,
        model.height,
      ),
    );
  gesture.last = point;
}
function up(event) {
  if (!pointers.has(event.pointerId)) return;
  pointers.delete(event.pointerId);
  if (!gesture?.moved && gesture?.target && event.type === 'pointerup')
    choose(gesture.target);
  if (svg.value.hasPointerCapture(event.pointerId))
    svg.value.releasePointerCapture(event.pointerId);
  gesture = pointers.size ? { moved: true } : null;
}
function wheel(event) {
  zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15, position(event));
}
onBeforeUnmount(() => pointers.clear());
</script>

<template>
  <section class="campus-map">
    <header class="campus-map__header">
      <h1 class="section-title">食堂地图</h1>
      <div class="campus-map__tools">
        <RouterLink class="button-ink" :to="{ name: 'canteenList' }"
          >食堂列表</RouterLink
        >
        <RouterLink class="button-ink" :to="{ name: 'dishSearch' }"
          >搜菜</RouterLink
        >
      </div>
    </header>
    <p class="campus-map__hint">双指缩放 · 点选食堂</p>
    <div class="campus-map__viewport">
      <svg
        ref="svg"
        :viewBox="`0 0 ${model.width} ${model.height}`"
        role="group"
        aria-label="校园食堂地图"
        @pointerdown="down"
        @pointermove="move"
        @pointerup="up"
        @pointercancel="up"
        @lostpointercapture="up"
        @wheel.prevent="wheel"
      >
        <g :transform="`translate(${state.x} ${state.y}) scale(${state.zoom})`">
          <image
            :href="image"
            :width="model.width"
            :height="model.height"
            @error="imageFailed = true"
          />
          <polygon
            v-for="region in model.regions"
            :key="region.id"
            :data-region="region.id"
            :points="region.polygon.map((p) => p.join(',')).join(' ')"
            :class="{ 'is-selected': region.id === selectedId }"
            role="button"
            tabindex="0"
            :aria-label="region.name"
            :aria-pressed="region.id === selectedId"
            @keydown.enter.prevent="choose(region.id)"
            @keydown.space.prevent="choose(region.id)"
          >
            <title>{{ region.name }}</title>
          </polygon>
        </g>
      </svg>
      <div class="campus-map__controls" aria-label="地图缩放">
        <button
          type="button"
          aria-label="放大地图"
          :disabled="state.zoom >= 6"
          @click="zoom(1.5)"
        >
          ＋
        </button>
        <button
          type="button"
          aria-label="缩小地图"
          :disabled="state.zoom <= 1"
          @click="zoom(1 / 1.5)"
        >
          −
        </button>
        <button type="button" @click="reset">全图</button>
      </div>
    </div>
    <p v-if="imageFailed" role="alert">
      地图图片读取失败，可继续通过下方名称选择食堂。
    </p>
    <nav class="campus-map__regions" aria-label="选择食堂">
      <button
        v-for="region in model.regions"
        :key="region.id"
        type="button"
        :aria-pressed="selectedId === region.id"
        @click="choose(region.id)"
      >
        {{ region.name }}
      </button>
    </nav>
    <article v-if="selected" class="campus-map__selection" aria-live="polite">
      <h2>{{ selected.name }}</h2>
      <p v-if="loading">正在读取食堂入口…</p>
      <template v-else-if="error"
        ><p role="alert">食堂入口暂时无法读取，地图仍可使用。</p>
        <button class="button-ink" type="button" @click="load">
          重新读取
        </button></template
      >
      <div v-else-if="destinations.length" class="campus-map__destinations">
        <RouterLink
          v-for="hall in destinations"
          :key="hall.id"
          class="button-ink"
          :to="{ name: 'canteenDetail', params: { canteenId: hall.id } }"
          >{{ hall.name }}</RouterLink
        >
      </div>
      <p v-else>此区域暂无可用的食堂详情入口。</p>
    </article>
    <p class="campus-map__hint">校园示意图 · 2023 年版</p>
  </section>
</template>

<style scoped>
.campus-map {
  padding: var(--ft-space-2);
  max-width: 1100px;
  margin: auto;
  overflow-wrap: anywhere;
}
.campus-map__header,
.campus-map__tools,
.campus-map__regions,
.campus-map__destinations {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.campus-map__header {
  justify-content: space-between;
}
.campus-map__header h1 {
  margin: 0;
}
.campus-map__hint {
  color: var(--ft-color-text-muted);
  line-height: 1.6;
  font-size: 14px;
}
.campus-map__viewport {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--ft-color-border);
  border-radius: 14px;
  background: #b3d38a;
}
.campus-map svg {
  display: block;
  width: 100%;
  height: auto;
  touch-action: none;
  user-select: none;
}
.campus-map polygon {
  fill: #c9341e;
  fill-opacity: 0.12;
  stroke: #a82917;
  stroke-width: 5;
  vector-effect: non-scaling-stroke;
  cursor: pointer;
}
.campus-map polygon.is-selected,
.campus-map polygon:focus-visible {
  fill-opacity: 0.4;
  stroke-width: 7;
  stroke: #3a2418;
  outline: none;
}
.campus-map__controls {
  display: flex;
  gap: 8px;
  position: absolute;
  right: 10px;
  bottom: 10px;
}
.campus-map button {
  min-width: 44px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--ft-color-secondary);
  border-radius: 10px;
  background: var(--ft-color-bg-soft);
  color: var(--ft-color-text);
  font: inherit;
  cursor: pointer;
}
.campus-map__regions {
  margin: 16px 0;
}
.campus-map__regions button[aria-pressed='true'] {
  background: var(--ft-color-primary);
  color: white;
}
.campus-map button:focus-visible {
  outline: 3px solid var(--ft-color-accent);
  outline-offset: 3px;
}
.campus-map button:disabled {
  opacity: 0.45;
  cursor: default;
}
.campus-map__selection {
  border-top: 1px dashed var(--ft-color-border);
  padding: 12px 0;
}
.campus-map__selection h2 {
  margin: 0 0 12px;
  font-size: 20px;
}
</style>
