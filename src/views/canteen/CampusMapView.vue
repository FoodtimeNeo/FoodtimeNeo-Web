<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchCanteens } from '@/api/canteen.api.js';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { useCampusLocation } from '@/composables/useCampusLocation.js';
import {
  availableMapHalls,
  clampMapTransform,
  findMapRegion,
  focusBoundsTransform,
  focusPointTransform,
  mapTransformAt,
} from '@/utils/campusMap.js';
import {
  createCampusProjection,
  distanceMeters,
  formatDistance,
  formatWalkSummary,
} from '@/utils/campusProjection.js';
import { createCampusNavigator } from '@/utils/campusNavigator.js';
import model from '@/assets/campus-map/regions.json';
import calibration from '@/assets/campus-map/calibration.json';
import graph from '@/assets/campus-map/campus-graph.json';
import image from '@/assets/campus-map/campus-map.webp';

const route = useRoute();
const router = useRouter();
const svg = ref(null);
const projection = createCampusProjection(calibration);
const navigator = createCampusNavigator(graph);
const presetNodes = navigator.presetStartNodes();

const {
  position: userFix,
  locating,
  error: locationError,
  locateOnce,
  startWatching,
  stopWatching,
} = useCampusLocation();

const initialRegion = findMapRegion(
  model.regions,
  String(route.query.hall || ''),
);
const selectedId = ref(initialRegion?.id || '');
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

const navigating = ref(
  Boolean(initialRegion && String(route.query.navigate || '') === '1'),
);
const stepsExpanded = ref(false);
const pickStartMode = ref(false);
const startMode = ref('auto'); // 'auto' | 'gps' | 'preset:<id>' | 'custom'
const presetNodeId = ref(presetNodes[0]?.id || 'gate-south');
const customStart = ref(null);
const locationNotice = ref('');

const userOnCampus = computed(() =>
  Boolean(
    userFix.value &&
    projection.isOnCampus(userFix.value.latitude, userFix.value.longitude),
  ),
);
const userPixel = computed(() => {
  if (!userOnCampus.value || !userFix.value) return null;
  return projection.toPixel(userFix.value.latitude, userFix.value.longitude);
});
const selectedDistanceSummary = computed(() => {
  if (
    !selected.value ||
    !userFix.value ||
    !Number.isFinite(selected.value.lat) ||
    !Number.isFinite(selected.value.lng)
  ) {
    return '';
  }
  const m = distanceMeters(
    userFix.value.latitude,
    userFix.value.longitude,
    selected.value.lat,
    selected.value.lng,
  );
  return formatWalkSummary(m);
});

const effectiveStartMode = computed(() => {
  if (startMode.value !== 'auto') return startMode.value;
  return userOnCampus.value ? 'gps' : `preset:${presetNodeId.value}`;
});

const routePlan = computed(() => {
  if (!navigating.value || !selected.value?.entryNodeId) return null;
  const mode = effectiveStartMode.value;
  if (mode === 'gps' && userPixel.value) {
    return navigator.routeFromPixel(
      userPixel.value.x,
      userPixel.value.y,
      '我的位置',
      selected.value.entryNodeId,
      selected.value.name,
    );
  }
  if (mode === 'custom' && customStart.value) {
    return navigator.routeFromPixel(
      customStart.value.x,
      customStart.value.y,
      '地图选点',
      selected.value.entryNodeId,
      selected.value.name,
    );
  }
  const nodeId = mode.startsWith('preset:')
    ? mode.slice('preset:'.length)
    : presetNodeId.value;
  return navigator.routeFromNode(
    nodeId,
    selected.value.entryNodeId,
    selected.value.name,
  );
});

const usingLiveGps = computed(
  () => userOnCampus.value && effectiveStartMode.value === 'gps',
);
const remainingMeters = computed(() => {
  if (!routePlan.value) return 0;
  if (!usingLiveGps.value || !userPixel.value)
    return routePlan.value.totalMeters;
  return navigator.remainingMeters(
    routePlan.value,
    userPixel.value.x,
    userPixel.value.y,
  );
});
const arrived = computed(
  () =>
    usingLiveGps.value &&
    Boolean(routePlan.value) &&
    remainingMeters.value <= 25,
);
const activeStepIdx = computed(() => {
  if (!routePlan.value?.steps?.length) return 0;
  if (!usingLiveGps.value || !userPixel.value) return 0;
  return navigator.activeStepIndex(
    routePlan.value,
    userPixel.value.x,
    userPixel.value.y,
  );
});
const externalMapUrl = computed(() => {
  if (!selected.value || !Number.isFinite(selected.value.lat)) return '';
  const name = encodeURIComponent(`北京交通大学${selected.value.name}`);
  return `https://uri.amap.com/marker?position=${selected.value.lng},${selected.value.lat}&name=${name}`;
});

function pinStyle(region) {
  const [px, py] = region.pin || [0, 0];
  const leftPct = ((state.x + px * state.zoom) / model.width) * 100;
  const topPct = ((state.y + py * state.zoom) / model.height) * 100;
  const spread = Math.max(0, Math.min(1, (2.2 - state.zoom) / 1.2));
  let dx = 0;
  let dy = 0;
  if (spread > 0.01) {
    if (region.id === 'minghu') {
      dx = -20 * spread;
      dy = -8 * spread;
    } else if (region.id === 'yimin') {
      dx = 26 * spread;
      dy = 6 * spread;
    } else if (region.id === 'liuyuan') {
      dx = -16 * spread;
      dy = -10 * spread;
    } else if (region.id === 'xuesi') {
      dx = 18 * spread;
      dy = 12 * spread;
    }
  }
  return {
    left: `${leftPct}%`,
    top: `${topPct}%`,
    '--pin-dx': `${dx.toFixed(1)}px`,
    '--pin-dy': `${dy.toFixed(1)}px`,
  };
}

function position(event) {
  const matrix = svg.value?.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    matrix.inverse(),
  );
  return { x: point.x, y: point.y };
}
function toMapCoords(svgPoint) {
  return {
    x: Math.max(0, Math.min(model.width, (svgPoint.x - state.x) / state.zoom)),
    y: Math.max(0, Math.min(model.height, (svgPoint.y - state.y) / state.zoom)),
  };
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
function focusRegion(region) {
  if (!region?.pin) return;
  setState(
    focusPointTransform(
      { x: region.pin[0], y: region.pin[1] },
      Math.max(state.zoom, 2),
      model.width,
      model.height,
    ),
  );
}
function focusRoute(plan) {
  if (!plan?.polyline?.length) return;
  let minX = plan.startX;
  let maxX = plan.startX;
  let minY = plan.startY;
  let maxY = plan.startY;
  for (const [x, y] of plan.polyline) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (selected.value?.pin) {
    minX = Math.min(minX, selected.value.pin[0]);
    maxX = Math.max(maxX, selected.value.pin[0]);
    minY = Math.min(minY, selected.value.pin[1]);
    maxY = Math.max(maxY, selected.value.pin[1]);
  }
  setState(
    focusBoundsTransform({ minX, maxX, minY, maxY }, model.width, model.height),
  );
}
function choose(id, { shouldFocus = false } = {}) {
  selectedId.value = id;
  void router.replace({ query: { ...route.query, hall: id } });
  const region = model.regions.find((r) => r.id === id);
  if (navigating.value && routePlan.value) {
    focusRoute(routePlan.value);
  } else if (shouldFocus && region) {
    focusRegion(region);
  }
}
function startNavigation() {
  if (!selected.value) return;
  navigating.value = true;
  if (routePlan.value) focusRoute(routePlan.value);
}
function stopNavigation() {
  navigating.value = false;
  pickStartMode.value = false;
}
function selectPreset(nodeId) {
  presetNodeId.value = nodeId;
  startMode.value = `preset:${nodeId}`;
  pickStartMode.value = false;
  navigating.value = true;
  if (routePlan.value) focusRoute(routePlan.value);
}
function selectGpsStart() {
  startMode.value = 'gps';
  pickStartMode.value = false;
  navigating.value = true;
  if (routePlan.value) focusRoute(routePlan.value);
}
function enableMapPick() {
  pickStartMode.value = true;
  locationNotice.value = '请在上方地图上点击任意出发位置';
}
async function locateMe() {
  locationNotice.value = '';
  const fix = await locateOnce({ force: true });
  if (!fix) {
    locationNotice.value = locationError.value || '暂时无法获取位置';
    return;
  }
  startWatching();
  if (userPixel.value) {
    setState(
      focusPointTransform(
        userPixel.value,
        Math.max(state.zoom, 2.2),
        model.width,
        model.height,
      ),
    );
    if (navigating.value && startMode.value === 'auto') {
      startMode.value = 'gps';
      if (routePlan.value) focusRoute(routePlan.value);
    }
  } else {
    const km = (
      projection.distanceToCampusCenter(fix.latitude, fix.longitude) / 1000
    ).toFixed(1);
    locationNotice.value = `当前距学校约 ${km}km，已切换为校门起点预览校内路线`;
  }
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
  const point = position(event);
  pointers.delete(event.pointerId);
  if (!gesture?.moved && event.type === 'pointerup') {
    if (pickStartMode.value) {
      customStart.value = toMapCoords(point);
      startMode.value = 'custom';
      pickStartMode.value = false;
      locationNotice.value = '';
      navigating.value = true;
      if (routePlan.value) focusRoute(routePlan.value);
    } else if (gesture?.target) {
      choose(gesture.target);
    }
  }
  if (svg.value?.hasPointerCapture(event.pointerId))
    svg.value.releasePointerCapture(event.pointerId);
  gesture = pointers.size ? { moved: true } : null;
}
function wheel(event) {
  zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15, position(event));
}

watch(routePlan, (plan, prev) => {
  if (plan && !prev && navigating.value) {
    focusRoute(plan);
  }
});

onMounted(() => {
  if (navigating.value && routePlan.value) {
    focusRoute(routePlan.value);
  } else if (selected.value) {
    focusRegion(selected.value);
  }
  if (userFix.value) {
    startWatching();
  }
});
onBeforeUnmount(() => {
  pointers.clear();
  stopWatching();
});
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
    <p class="campus-map__hint">
      双指/滚轮缩放 · 点选建筑地标查看食堂与校内步行路线
    </p>
    <div v-if="pickStartMode" class="campus-map__banner" role="status">
      <span>请在下方地图上点击任意出发位置</span>
      <button type="button" @click="pickStartMode = false">取消</button>
    </div>
    <p v-else-if="locationNotice" class="campus-map__notice" role="status">
      {{ locationNotice }}
    </p>
    <div class="campus-map__viewport" :class="{ 'is-picking': pickStartMode }">
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
            @keydown.enter.prevent="choose(region.id, { shouldFocus: true })"
            @keydown.space.prevent="choose(region.id, { shouldFocus: true })"
          >
            <title>{{ region.name }}</title>
          </polygon>
          <template v-if="routePlan && routePlan.polyline.length">
            <line
              v-if="routePlan.snappedFromRoad"
              class="campus-map__snap-line"
              :x1="routePlan.startX"
              :y1="routePlan.startY"
              :x2="routePlan.polyline[0][0]"
              :y2="routePlan.polyline[0][1]"
            />
            <polyline
              class="campus-map__route-casing"
              :points="routePlan.polyline.map((p) => p.join(',')).join(' ')"
            />
            <polyline
              class="campus-map__route-core"
              :points="routePlan.polyline.map((p) => p.join(',')).join(' ')"
            />
            <circle
              class="campus-map__route-start"
              :cx="routePlan.startX"
              :cy="routePlan.startY"
              :r="34 / state.zoom"
            />
          </template>
          <g v-if="userPixel" class="campus-map__user-dot">
            <circle
              class="campus-map__user-accuracy"
              :cx="userPixel.x"
              :cy="userPixel.y"
              :r="Math.max(46, Math.min(180, (userFix?.accuracy || 18) * 3.8))"
            />
            <circle
              class="campus-map__user-halo"
              :cx="userPixel.x"
              :cy="userPixel.y"
              :r="34 / state.zoom"
            />
            <circle
              class="campus-map__user-core"
              :cx="userPixel.x"
              :cy="userPixel.y"
              :r="22 / state.zoom"
            />
          </g>
        </g>
      </svg>

      <!-- 固定屏幕尺寸的地标胶囊层（任意缩放不遮挡建筑且清晰可读） -->
      <div class="campus-map__pins" aria-hidden="false">
        <button
          v-for="region in model.regions"
          :key="region.id"
          type="button"
          class="campus-map__pin"
          :class="{ 'is-selected': region.id === selectedId }"
          :style="pinStyle(region)"
          :aria-pressed="region.id === selectedId"
          @click.stop="choose(region.id)"
        >
          <span class="campus-map__pin-dot" aria-hidden="true"></span>
          <span class="campus-map__pin-label">{{ region.shortName }}</span>
        </button>
      </div>

      <div class="campus-map__controls" aria-label="地图缩放与定位">
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
        <button
          type="button"
          :class="{ 'is-located': userOnCampus }"
          :disabled="locating"
          aria-label="定位到我的位置"
          @click="locateMe"
        >
          {{ locating ? '…' : '定位' }}
        </button>
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
        @click="choose(region.id, { shouldFocus: true })"
      >
        {{ region.shortName }}
      </button>
    </nav>

    <article v-if="selected" class="campus-map__selection" aria-live="polite">
      <div class="campus-map__selection-head">
        <div>
          <h2>{{ selected.name }}</h2>
          <p v-if="selected.subtitle" class="campus-map__subtitle">
            {{ selected.subtitle }}
          </p>
        </div>
        <span v-if="selectedDistanceSummary" class="campus-map__dist-badge">
          步行 {{ selectedDistanceSummary }}
        </span>
      </div>

      <div class="campus-map__nav-actions">
        <button
          type="button"
          class="button-ink is-primary"
          @click="startNavigation"
        >
          {{ navigating ? '重新聚焦路线' : '校内步行导航' }}
        </button>
        <a
          v-if="userFix && !userOnCampus && externalMapUrl"
          class="button-ink"
          :href="externalMapUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          外部地图导航 ↗
        </a>
      </div>

      <div v-if="navigating && routePlan" class="campus-map__nav-card">
        <p v-if="arrived" class="campus-map__arrived">
          已到达 {{ selected.name }} 附近
        </p>
        <div class="campus-map__nav-summary">
          <strong>
            步行 {{ formatDistance(routePlan.totalMeters) }} · 约{{
              routePlan.walkMinutes
            }}分钟
            <template v-if="usingLiveGps && !arrived">
              （剩余 {{ formatDistance(remainingMeters) }}）
            </template>
          </strong>
          <button
            type="button"
            class="campus-map__nav-stop"
            @click="stopNavigation"
          >
            结束导航
          </button>
        </div>
        <p v-if="!userOnCampus" class="campus-map__nav-fallback">
          {{
            userFix
              ? '当前不在校园内，已切换为校内起点预览路线（可使用上方外部地图到校）。'
              : '未开启定位，已默认从校门规划路线；点击地图“定位”或下方切换起点。'
          }}
        </p>
        <div class="campus-map__start-chips" role="group" aria-label="切换起点">
          <button
            v-if="userOnCampus"
            type="button"
            :aria-pressed="effectiveStartMode === 'gps'"
            @click="selectGpsStart"
          >
            我的位置
          </button>
          <button
            v-for="preset in presetNodes"
            :key="preset.id"
            type="button"
            :aria-pressed="effectiveStartMode === `preset:${preset.id}`"
            @click="selectPreset(preset.id)"
          >
            {{ preset.name }}
          </button>
          <button
            type="button"
            :aria-pressed="effectiveStartMode === 'custom' || pickStartMode"
            @click="enableMapPick"
          >
            图上选起点
          </button>
        </div>
        <div v-if="routePlan.steps.length" class="campus-map__steps">
          <p class="campus-map__step-current">
            ▶ {{ routePlan.steps[activeStepIdx]?.instruction }}
          </p>
          <button
            v-if="routePlan.steps.length > 1"
            type="button"
            class="campus-map__steps-toggle"
            @click="stepsExpanded = !stepsExpanded"
          >
            {{
              stepsExpanded
                ? '收起完整路线步骤 ⌃'
                : `展开全部 ${routePlan.steps.length} 步指引 ⌄`
            }}
          </button>
          <ol v-if="stepsExpanded" class="campus-map__step-list">
            <li
              v-for="(step, idx) in routePlan.steps"
              :key="idx"
              :class="{ 'is-active': idx === activeStepIdx }"
            >
              {{ step.instruction }}
            </li>
          </ol>
        </div>
      </div>

      <p v-if="loading">正在读取食堂入口…</p>
      <template v-else-if="error">
        <p role="alert">食堂入口暂时无法读取，地图与步行导航仍可使用。</p>
        <button class="button-ink" type="button" @click="load">重新读取</button>
      </template>
      <div v-else-if="destinations.length" class="campus-map__destinations">
        <RouterLink
          v-for="hall in destinations"
          :key="hall.id"
          class="button-ink"
          :to="{ name: 'canteenDetail', params: { canteenId: hall.id } }"
          >{{ hall.name }} →</RouterLink
        >
      </div>
      <p v-else class="campus-map__empty-note">
        此餐厅暂未录入档口菜单，后续将陆续补充。
      </p>
    </article>

    <p class="campus-map__hint">
      北京交通大学手绘校园地图 · 2023 年版 · 校内离线步行导航
    </p>
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
.campus-map__destinations,
.campus-map__nav-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
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
  font-size: 13px;
}
.campus-map__banner,
.campus-map__notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 8px 0;
  padding: 8px 14px;
  border-radius: 12px;
  font-size: 13px;
}
.campus-map__banner {
  background: var(--zine-stamp-red-soft);
  border: 1px solid var(--ft-color-primary);
  color: var(--ft-color-primary);
  font-weight: 600;
}
.campus-map__banner button {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.campus-map__notice {
  background: var(--zine-paper-card-alt);
  border: 1px solid var(--ft-border-subtle);
  color: var(--ft-color-text-muted);
}
.campus-map__viewport {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--ft-border-subtle);
  border-radius: 16px;
  background: #b3d38a;
  box-shadow: var(--ft-shadow-card);
}
.campus-map__viewport.is-picking {
  cursor: crosshair;
}
.campus-map svg {
  display: block;
  width: 100%;
  height: auto;
  touch-action: none;
  user-select: none;
}
.campus-map polygon {
  fill: transparent;
  stroke: transparent;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
  cursor: pointer;
  transition:
    fill-opacity var(--ft-transition-fast),
    stroke var(--ft-transition-fast);
}
.campus-map polygon.is-selected,
.campus-map polygon:focus-visible {
  fill: #c9341e;
  fill-opacity: 0.14;
  stroke: rgba(201, 52, 30, 0.78);
  stroke-width: 2;
  outline: none;
}
.campus-map__snap-line {
  stroke: #1a73e8;
  stroke-width: 2.5;
  stroke-dasharray: 6 5;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
.campus-map__route-casing {
  fill: none;
  stroke: rgba(255, 255, 255, 0.94);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
.campus-map__route-core {
  fill: none;
  stroke: #d93f27;
  stroke-width: 4.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
.campus-map__route-start {
  fill: #1e8e3e;
  stroke: #ffffff;
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
  pointer-events: none;
}
.campus-map__user-dot {
  pointer-events: none;
}
.campus-map__user-accuracy {
  fill: rgba(26, 115, 232, 0.16);
  stroke: rgba(26, 115, 232, 0.35);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.campus-map__user-halo {
  fill: #ffffff;
}
.campus-map__user-core {
  fill: #1a73e8;
}
.campus-map__pins {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.campus-map__pin {
  position: absolute;
  transform: translate(
    calc(-50% + var(--pin-dx, 0px)),
    calc(-100% - 4px + var(--pin-dy, 0px))
  );
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border: 1px solid rgba(180, 155, 140, 0.7);
  border-radius: 999px;
  background: rgba(255, 253, 249, 0.96);
  color: #2b1c14;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
  pointer-events: auto;
  cursor: pointer;
  z-index: 2;
  transition:
    background var(--ft-transition-fast),
    color var(--ft-transition-fast),
    transform var(--ft-transition-fast);
}
.campus-map__pin:hover {
  border-color: var(--ft-color-primary);
  z-index: 4;
}
.campus-map__pin.is-selected {
  background: var(--ft-color-primary);
  border-color: var(--ft-color-primary);
  color: #fff8f5;
  z-index: 5;
  box-shadow: 0 3px 10px rgba(201, 52, 30, 0.36);
}
.campus-map__pin-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ft-color-primary);
  flex: none;
}
.campus-map__pin.is-selected .campus-map__pin-dot {
  background: #ffffff;
}
.campus-map__controls {
  display: flex;
  flex-direction: column;
  gap: 1px;
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 3px;
  border: 1px solid var(--ft-border-subtle);
  border-radius: 14px;
  background: rgb(var(--ft-overlay-paper-rgb) / 92%);
  backdrop-filter: blur(10px);
  box-shadow: var(--ft-shadow-card);
  z-index: 6;
}
.campus-map__controls button {
  min-width: 40px;
  min-height: 38px;
  padding: 6px 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--ft-color-text);
  font: inherit;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
}
.campus-map__controls button.is-located {
  color: #1a73e8;
}
.campus-map__controls button:hover:not(:disabled) {
  background: var(--ft-color-surface-ink);
}
.campus-map__regions {
  margin: 14px 0;
  gap: 8px;
}
.campus-map__regions button {
  min-height: 36px;
  padding: 6px 14px;
  border: 1px solid var(--ft-border-control);
  border-radius: var(--ft-radius-pill);
  background: var(--zine-paper-card-alt);
  color: var(--ft-color-text);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--ft-transition-fast),
    color var(--ft-transition-fast),
    border-color var(--ft-transition-fast);
}
.campus-map__regions button:hover {
  border-color: var(--ft-color-primary);
}
.campus-map__regions button[aria-pressed='true'] {
  border-color: var(--ft-color-primary);
  background: var(--ft-color-primary);
  color: #fff8f5;
}
.campus-map button:focus-visible {
  outline: 2px dashed var(--ft-color-primary);
  outline-offset: 2px;
}
.campus-map button:disabled {
  opacity: 0.45;
  cursor: default;
}
.campus-map__selection {
  margin: 12px 0;
  padding: 16px;
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-card);
  background: var(--zine-paper-card-alt);
  box-shadow: var(--ft-shadow-card);
  display: grid;
  gap: 12px;
}
.campus-map__selection-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.campus-map__selection h2 {
  margin: 0;
  font-size: 18px;
}
.campus-map__subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--ft-color-text-muted);
}
.campus-map__dist-badge {
  flex: none;
  padding: 4px 10px;
  border-radius: var(--ft-radius-pill);
  background: var(--zine-stamp-red-soft);
  color: var(--ft-color-primary);
  font-size: 12px;
  font-weight: 700;
}
.campus-map__nav-card {
  padding: 12px 14px;
  border: 1px solid var(--ft-border-subtle);
  border-radius: 14px;
  background: var(--zine-paper-card);
  display: grid;
  gap: 10px;
}
.campus-map__arrived {
  margin: 0;
  color: #1e8e3e;
  font-weight: 700;
  font-size: 14px;
}
.campus-map__nav-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 14px;
}
.campus-map__nav-stop {
  border: 0;
  background: transparent;
  color: var(--ft-color-text-muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.campus-map__nav-fallback {
  margin: 0;
  font-size: 12px;
  color: var(--ft-color-text-muted);
}
.campus-map__start-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.campus-map__start-chips button {
  min-height: 28px;
  padding: 3px 10px;
  border: 1px solid var(--ft-border-control);
  border-radius: 999px;
  background: var(--zine-paper-card-alt);
  color: var(--ft-color-text);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.campus-map__start-chips button[aria-pressed='true'] {
  border-color: var(--ft-color-primary);
  background: var(--ft-color-primary);
  color: #fff8f5;
  font-weight: 700;
}
.campus-map__steps {
  display: grid;
  gap: 6px;
}
.campus-map__step-current {
  margin: 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--zine-stamp-red-soft);
  color: var(--ft-color-primary);
  font-size: 13px;
  font-weight: 700;
}
.campus-map__steps-toggle {
  justify-self: start;
  border: 0;
  padding: 2px 0;
  background: transparent;
  color: var(--ft-color-text-muted);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.campus-map__step-list {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: var(--ft-color-text-muted);
}
.campus-map__step-list li.is-active {
  color: var(--ft-color-text);
  font-weight: 700;
}
.campus-map__empty-note {
  margin: 0;
  font-size: 13px;
  color: var(--ft-color-text-muted);
}
@media (max-width: 640px) {
  .campus-map__pin {
    font-size: 11px;
    padding: 2px 7px;
  }
}
</style>
