<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useAuthStore } from '@/store/useAuthStore.js';
import { ApiError } from '@/api/http.js';
import { fetchAdminDashboard } from '@/api/analytics.api.js';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';

const data = ref(null);
const loading = ref(false);
const error = ref(null);
const activeDays = ref(7);
const activeMetric = ref('total');
const hoveredIndex = ref(null);
const chartElement = ref(null);
const chartWidth = ref(720);
const auth = useAuthStore();
let requestVersion = 0;
let controller;
let resizeObserver;

function actorKey() {
  const user = auth.user;
  return user?.role === 'superadmin' &&
    (!user.status || user.status === 'active')
    ? `${user.id}:superadmin:${user.status || 'active'}`
    : '';
}
function reset() {
  requestVersion++;
  controller?.abort();
  controller = null;
  data.value = null;
  error.value = null;
  loading.value = false;
  hoveredIndex.value = null;
}
async function load() {
  const actor = actorKey();
  if (!actor) {
    reset();
    error.value = new ApiError('需要平台管理员权限', { status: 403 });
    return;
  }
  controller?.abort();
  controller = new AbortController();
  const version = ++requestVersion;
  loading.value = true;
  error.value = null;
  try {
    // One snapshot supplies both chart ranges and all three summary periods.
    const result = await fetchAdminDashboard(
      { days: 30 },
      { signal: controller.signal },
    );
    if (version === requestVersion && actor === actorKey()) {
      data.value = result;
      hoveredIndex.value = null;
    }
  } catch (reason) {
    if (version === requestVersion && actor === actorKey()) {
      if (reason.status === 401 || reason.status === 403) data.value = null;
      error.value = reason;
    }
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}
function foreground() {
  if (!document.hidden && !loading.value && actorKey()) load();
}
watch(
  actorKey,
  () => {
    reset();
    activeDays.value = 7;
    activeMetric.value = 'total';
    if (actorKey()) load();
    else error.value = new ApiError('需要平台管理员权限', { status: 403 });
  },
  { immediate: true, flush: 'sync' },
);
watch([activeDays, activeMetric], () => {
  hoveredIndex.value = null;
});
watch(chartElement, (element) => {
  resizeObserver?.disconnect();
  if (!element) return;
  const measure = () => {
    const width = element.getBoundingClientRect().width;
    if (width > 0) chartWidth.value = width;
  };
  measure();
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);
  }
});
onMounted(() => document.addEventListener('visibilitychange', foreground));
onBeforeUnmount(() => {
  reset();
  resizeObserver?.disconnect();
  document.removeEventListener('visibilitychange', foreground);
});

const METRIC_TABS = [
  { key: 'total', label: '用户总量', color: 'red', unit: '人' },
  { key: 'users', label: '新增用户', color: 'red', unit: '人' },
  { key: 'interactions', label: '评论互动', color: 'blue', unit: '条' },
  { key: 'posts', label: '社区食记', color: 'green', unit: '篇' },
  { key: 'online', label: '日活用户', color: 'gold', unit: '人' },
];
const metric = computed(() =>
  METRIC_TABS.find((item) => item.key === activeMetric.value),
);
const trend = computed(() => data.value?.trend.slice(-activeDays.value) || []);
const todayPoint = computed(() => data.value?.trend.at(-1));
const dateRange = computed(() =>
  trend.value.length
    ? `${trend.value[0].day.replaceAll('-', '/')} — ${trend.value.at(-1).day.replaceAll('-', '/')} · 北京时间，含今日`
    : '',
);
const formatNumber = (value) => new Intl.NumberFormat('zh-CN').format(value);
function formatPercent(value, total) {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : '0%';
}
function formatDateLabel(day) {
  const parts = day.split('-');
  return `${Number(parts[1])}/${Number(parts[2])}`;
}
function formatUpdatedAt(value) {
  if (!value) return '尚未更新';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
const metricCards = computed(() => {
  if (!data.value) return [];
  const d = data.value;
  return [
    { label: '有效用户', value: d.registeredUsers, desc: '当前启用账号' },
    { label: '正式点评', value: d.reviews, desc: '正式发布的菜品点评' },
    { label: '正式回复', value: d.replies, desc: '菜品点评回复' },
    { label: '已发布食记', value: d.posts, desc: '审核通过且未删除' },
    { label: '食堂', value: d.halls, desc: '当前有效食堂' },
    { label: '档口', value: d.stalls, desc: '当前有效档口' },
    { label: '菜品', value: d.dishes, desc: '当前有效菜品' },
    { label: '在线用户', value: d.onlineUsers, desc: '最近 5 分钟活跃用户' },
  ];
});
const PERIODS = [
  { days: 1, label: '今日' },
  { days: 7, label: '近 7 日' },
  { days: 30, label: '近 30 日' },
];
const activityRows = computed(() => {
  if (!data.value) return [];
  return [
    { name: '注册用户', key: 'newUsers' },
    { name: '菜品点评', key: 'newReviews' },
    { name: '互动回复', key: 'newReplies' },
    { name: '社区食记', key: 'newPosts' },
  ].map((row) => ({
    ...row,
    values: PERIODS.map((period) =>
      data.value.trend
        .slice(-period.days)
        .reduce((sum, point) => sum + point[row.key], 0),
    ),
  }));
});
function getPointValue(point) {
  switch (activeMetric.value) {
    case 'total':
      return point.totalUsers;
    case 'users':
      return point.newUsers;
    case 'interactions':
      return point.newReviews + point.newReplies;
    case 'posts':
      return point.newPosts;
    case 'online':
      return point.onlinePeak;
  }
}

const HEIGHT = 260;
const PADDING = { top: 34, right: 16, bottom: 44, left: 64 };
const plotWidth = computed(() =>
  Math.max(1, chartWidth.value - PADDING.left - PADDING.right),
);
const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
const chartScale = computed(() => {
  const values = trend.value.map(getPointValue);
  const high = Math.max(0, ...values);
  const low =
    activeMetric.value === 'total' && values.length ? Math.min(...values) : 0;
  const step = Math.max(1, Math.ceil(((high - low) * 1.2) / 4));
  const min =
    activeMetric.value === 'total'
      ? Math.max(0, Math.floor((low - step) / step) * step)
      : 0;
  const tickStep = Math.max(1, Math.ceil(((high - min) * 1.1) / 4));
  return { min, step: tickStep, max: min + tickStep * 4 };
});
const yTicks = computed(() =>
  Array.from({ length: 5 }, (_, index) => ({
    value: chartScale.value.max - chartScale.value.step * index,
    y: PADDING.top + (plotHeight * index) / 4,
  })),
);
const xTickIndices = computed(() => {
  const count = chartWidth.value < 500 ? 3 : activeDays.value === 7 ? 7 : 6;
  return Array.from({ length: count }, (_, index) =>
    Math.round((index * (trend.value.length - 1)) / (count - 1)),
  );
});
const chartPoints = computed(() =>
  trend.value.map((point, index) => {
    const val = getPointValue(point);
    return {
      day: point.day,
      val,
      x: PADDING.left + (index / (trend.value.length - 1)) * plotWidth.value,
      y:
        PADDING.top +
        ((chartScale.value.max - val) /
          (chartScale.value.max - chartScale.value.min)) *
          plotHeight,
    };
  }),
);
const smoothLinePath = computed(() => {
  const pts = chartPoints.value;
  if (!pts.length) return '';
  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let index = 0; index < pts.length - 1; index++) {
    const p0 = pts[Math.max(0, index - 1)],
      p1 = pts[index],
      p2 = pts[index + 1],
      p3 = pts[Math.min(pts.length - 1, index + 2)];
    const clampY = (value) =>
      Math.max(Math.min(p1.y, p2.y), Math.min(Math.max(p1.y, p2.y), value));
    path += ` C ${p1.x + (p2.x - p0.x) / 6} ${clampY(p1.y + (p2.y - p0.y) / 6)}, ${p2.x - (p3.x - p1.x) / 6} ${clampY(p2.y - (p3.y - p1.y) / 6)}, ${p2.x} ${p2.y}`;
  }
  return path;
});
const smoothAreaPath = computed(() => {
  const pts = chartPoints.value;
  if (!pts.length) return '';
  return `${smoothLinePath.value} L ${pts.at(-1).x} ${PADDING.top + plotHeight} L ${pts[0].x} ${PADDING.top + plotHeight} Z`;
});
const selectedPoint = computed(
  () => chartPoints.value[hoveredIndex.value] || chartPoints.value.at(-1),
);
</script>

<template>
  <main class="analytics" aria-labelledby="analytics-title">
    <header class="analytics__hero">
      <div>
        <span class="stamp">SUPERADMIN DASHBOARD</span>
        <h2 id="analytics-title">数据看板</h2>
      </div>
      <div class="analytics__meta">
        <p class="updated">
          数据生成时间：{{ formatUpdatedAt(data?.generatedAt) }}（北京时间）
        </p>
        <button
          type="button"
          class="refresh-btn"
          :disabled="loading"
          @click="load"
        >
          {{ loading ? '刷新中…' : '刷新数据' }}
        </button>
      </div>
    </header>
    <LoadingState v-if="loading && !data" message="正在翻阅干饭数据账本…" />
    <ErrorState
      v-else-if="error && !data"
      title="数据看板加载失败"
      :description="error.message"
      @retry="load"
    />
    <template v-else-if="data">
      <div v-if="error" class="snapshot-warning" role="alert">
        刷新失败，显示上次数据：{{ error.message }}
        <button type="button" :disabled="loading" @click="load">重试</button>
      </div>
      <section class="overview-hero" aria-label="用户规模与实时在线">
        <article class="overview-card">
          <div class="section-header">
            <span>总用户量</span><span class="muted">截至当前累计</span>
          </div>
          <strong class="overview-hero__value" data-total-users>{{
            formatNumber(data.totalUsers)
          }}</strong>
          <p class="muted">全部已注册账号，含停用账号</p>
        </article>
        <article class="overview-card overview-card--online">
          <div class="section-header">
            <span>当前在线</span><span class="muted">实时</span>
          </div>
          <strong class="overview-hero__value">{{
            formatNumber(data.onlineUsers)
          }}</strong>
          <p class="muted">
            最近 5 分钟活跃用户 · 占有效用户
            {{ formatPercent(data.onlineUsers, data.registeredUsers) }}
          </p>
        </article>
      </section>
      <section class="section-block" aria-labelledby="metric-grid-title">
        <div class="section-header">
          <h3 id="metric-grid-title">平台总览</h3>
          <span class="muted">当前累计 / 实时数据</span>
        </div>
        <div class="metric-grid">
          <article
            v-for="item in metricCards"
            :key="item.label"
            class="metric-card"
          >
            <span class="metric-card__label">{{ item.label }}</span>
            <strong class="metric-card__value">{{
              formatNumber(item.value)
            }}</strong>
            <small class="muted">{{ item.desc }}</small>
          </article>
        </div>
      </section>
      <section class="section-block" aria-labelledby="trend-title">
        <div class="section-header period-header">
          <div>
            <h3>运营数据</h3>
            <p class="muted" aria-live="polite">{{ dateRange }}</p>
          </div>
          <div class="range-switch" role="group" aria-label="统计周期">
            <button
              v-for="days in [7, 30]"
              :key="days"
              type="button"
              :aria-pressed="activeDays === days"
              @click="activeDays = days"
            >
              近 {{ days }} 日
            </button>
          </div>
        </div>
        <div class="panel">
          <div class="section-header">
            <div>
              <span class="muted">01 / 运行走势</span>
              <h3 id="trend-title">近 {{ activeDays }} 日趋势</h3>
            </div>
            <span class="muted">每日一个数据点 · {{ activeDays }} 天</span>
          </div>
          <div class="trend-tabs" role="group" aria-label="走势指标选择">
            <button
              v-for="tab in METRIC_TABS"
              :key="tab.key"
              type="button"
              class="trend-tab"
              :class="{ 'is-active': activeMetric === tab.key }"
              :aria-pressed="activeMetric === tab.key"
              @click="activeMetric = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>
          <div ref="chartElement" class="chart-box">
            <svg
              class="trend-svg"
              :viewBox="`0 0 ${chartWidth} ${HEIGHT}`"
              role="group"
              :aria-label="`近${activeDays}日${metric.label}趋势`"
            >
              <title>近 {{ activeDays }} 日{{ metric.label }}趋势</title>
              <desc>按北京时间统计，可聚焦或点击每日数据点查看具体数值。</desc>
              <text :x="PADDING.left" y="17" class="axis-title">
                {{ metric.label }}（{{ metric.unit }}）
              </text>
              <g v-for="tick in yTicks" :key="tick.value">
                <line
                  :x1="PADDING.left"
                  :y1="tick.y"
                  :x2="chartWidth - PADDING.right"
                  :y2="tick.y"
                  class="grid-line"
                />
                <text
                  :x="PADDING.left - 8"
                  :y="tick.y + 4"
                  class="tick-label"
                  text-anchor="end"
                >
                  {{ formatNumber(tick.value) }}
                </text>
              </g>
              <path
                :d="smoothAreaPath"
                class="area-path"
                :class="`area-path--${metric.color}`"
              />
              <path
                :d="smoothLinePath"
                class="curve-line"
                :class="`curve-line--${metric.color}`"
              />
              <g
                v-for="(pt, index) in chartPoints"
                :key="pt.day"
                class="chart-node"
                tabindex="0"
                role="button"
                :aria-label="`${pt.day} ${metric.label}：${formatNumber(pt.val)} ${metric.unit}`"
                @mouseenter="hoveredIndex = index"
                @focus="hoveredIndex = index"
                @click="hoveredIndex = index"
                @keydown.enter.prevent="hoveredIndex = index"
                @keydown.space.prevent="hoveredIndex = index"
              >
                <rect
                  :x="pt.x - Math.min(22, plotWidth / (activeDays - 1) / 2)"
                  :y="PADDING.top"
                  :width="Math.min(44, plotWidth / (activeDays - 1))"
                  :height="plotHeight"
                  fill="transparent"
                />
                <text
                  v-if="
                    (activeDays === 7 && chartWidth >= 500) ||
                    hoveredIndex === index
                  "
                  :x="pt.x"
                  :y="pt.y < PADDING.top + 16 ? pt.y + 18 : pt.y - 10"
                  class="point-label"
                  :text-anchor="
                    index === 0
                      ? 'start'
                      : index === chartPoints.length - 1
                        ? 'end'
                        : 'middle'
                  "
                >
                  {{ formatNumber(pt.val) }}
                </text>
                <circle
                  :cx="pt.x"
                  :cy="pt.y"
                  :r="hoveredIndex === index ? 5 : activeDays === 7 ? 4 : 2.5"
                  class="point-circle"
                  :class="`point-circle--${metric.color}`"
                />
              </g>
              <text
                v-for="index in xTickIndices"
                :key="index"
                :x="chartPoints[index]?.x"
                :y="HEIGHT - 24"
                class="x-label"
                :text-anchor="
                  index === 0
                    ? 'start'
                    : index === chartPoints.length - 1
                      ? 'end'
                      : 'middle'
                "
              >
                {{ formatDateLabel(chartPoints[index].day) }}
              </text>
              <text
                :x="chartWidth - PADDING.right"
                :y="HEIGHT - 3"
                class="axis-title"
                text-anchor="end"
              >
                日期（月/日）
              </text>
            </svg>
          </div>
          <p class="chart-caption" aria-live="polite">
            {{ selectedPoint.day.replaceAll('-', '/') }} · {{ metric.label }}
            {{ formatNumber(selectedPoint.val) }} {{ metric.unit }}
          </p>
        </div>
        <p class="analytics-definition muted">
          今日数据截至本次统计时间；点评互动为投稿与回复之和，日活为当日行为去重人数。新增记录含待审等状态，累计点评与食记仅统计正式发布内容。
        </p>
      </section>
      <section class="section-block" aria-labelledby="activity-title">
        <div class="section-header">
          <h3 id="activity-title">新增汇总</h3>
          <span class="muted">截至 {{ todayPoint.day }}，按北京时间统计</span>
        </div>
        <div class="activity-table-wrapper">
          <table
            class="activity-table"
            aria-label="今日、近7日与近30日新增数据汇总"
          >
            <thead>
              <tr>
                <th scope="col">内容类别</th>
                <th v-for="period in PERIODS" :key="period.days" scope="col">
                  <span class="period-label">{{ period.label }}</span
                  >新增
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in activityRows" :key="row.key">
                <th scope="row">{{ row.name }}</th>
                <td v-for="(value, index) in row.values" :key="index">
                  +{{ formatNumber(value) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped src="./SuperadminAnalyticsView.css"></style>
