<script setup>
import { computed, onMounted, ref } from 'vue';
import { fetchAdminDashboard } from '@/api/analytics.api.js';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';

const data = ref(null);
const loading = ref(false);
const error = ref(null);
const activeMetric = ref('users'); // 'users' | 'interactions' | 'posts' | 'online'
const hoveredIndex = ref(null);

let requestVersion = 0;

const METRIC_TABS = [
  { key: 'users', label: '新增用户', color: 'red' },
  { key: 'interactions', label: '评论互动', color: 'blue' },
  { key: 'posts', label: '社区食记', color: 'green' },
  { key: 'online', label: '在线峰值', color: 'gold' },
];

async function load() {
  const version = ++requestVersion;
  loading.value = true;
  error.value = null;
  try {
    const result = await fetchAdminDashboard({ days: 7 });
    if (version === requestVersion) {
      data.value = result;
    }
  } catch (reason) {
    if (version === requestVersion) {
      error.value = reason;
    }
  } finally {
    if (version === requestVersion) {
      loading.value = false;
    }
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(value || 0);
}

function formatPercent(value, total) {
  if (!total || total <= 0) return '0%';
  return `${Math.round(((value || 0) / total) * 100)}%`;
}

function formatDateLabel(dayStr) {
  if (!dayStr) return '';
  const parts = dayStr.split('-');
  if (parts.length === 3) {
    return `${Number(parts[1])}/${Number(parts[2])}`;
  }
  const date = new Date(dayStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatUpdatedAt(value) {
  if (!value) return '尚未更新';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '刚刚';
  }
}

// 指标卡片列表（对齐手机端 8 个核心指标）
const metricCards = computed(() => {
  if (!data.value) return [];
  const d = data.value;
  return [
    {
      label: '注册用户',
      value: d.registeredUsers,
      tone: 'red',
      desc: '累计登记用户总数',
      tag: '用户基石',
    },
    {
      label: '评论数',
      value: d.reviews,
      tone: 'blue',
      desc: '菜品真实口碑点评',
      tag: '干饭心声',
    },
    {
      label: '回复数',
      value: d.replies,
      tone: 'green',
      desc: '食客互动交流楼层',
      tag: '热闹讨论',
    },
    {
      label: '社区食记',
      value: d.posts,
      tone: 'red',
      desc: '图文动态与探店分享',
      tag: '校园风物',
    },
    {
      label: '食堂',
      value: d.halls,
      tone: 'green',
      desc: '已收录校园食堂',
      tag: '就餐场馆',
    },
    {
      label: '档口',
      value: d.stalls,
      tone: 'blue',
      desc: '营业特色窗口小摊',
      tag: '风味摊位',
    },
    {
      label: '菜品',
      value: d.dishes,
      tone: 'red',
      desc: '收录风味美味佳肴',
      tag: '菜单名录',
    },
    {
      label: '在线用户',
      value: d.onlineUsers,
      tone: 'green',
      desc: '当前活跃会话用户',
      tag: '实时在校',
    },
  ];
});

// 今日活跃（取 trend 最后一项）
const todayPoint = computed(() => {
  const trend = data.value?.trend || [];
  return (
    trend[trend.length - 1] || {
      newUsers: 0,
      newReviews: 0,
      newReplies: 0,
      newPosts: 0,
      onlinePeak: 0,
    }
  );
});

// 今日活跃明细列表
const activityRows = computed(() => {
  if (!data.value) return [];
  const d = data.value;
  const p = todayPoint.value;
  return [
    {
      name: '注册用户',
      today: p.newUsers,
      total: d.registeredUsers,
      desc: '今日新入驻干饭同学',
    },
    {
      name: '菜品评论',
      today: p.newReviews,
      total: d.reviews,
      desc: '新增菜品点评与心得',
    },
    {
      name: '互动回复',
      today: p.newReplies,
      total: d.replies,
      desc: '评论区探讨与追问',
    },
    {
      name: '社区食记',
      today: p.newPosts,
      total: d.posts,
      desc: '图文动态与探店长文',
    },
  ];
});

// 曲线图尺寸与坐标计算
const CHART_VIEWBOX_WIDTH = 720;
const CHART_VIEWBOX_HEIGHT = 250;
const PADDING = { top: 32, right: 30, bottom: 42, left: 48 };
const plotWidth = CHART_VIEWBOX_WIDTH - PADDING.left - PADDING.right;
const plotHeight = CHART_VIEWBOX_HEIGHT - PADDING.top - PADDING.bottom;

function getPointValue(pt, metricKey) {
  if (!pt) return 0;
  switch (metricKey) {
    case 'users':
      return pt.newUsers || 0;
    case 'interactions':
      return (pt.newReviews || 0) + (pt.newReplies || 0);
    case 'posts':
      return pt.newPosts || 0;
    case 'online':
      return pt.onlinePeak || 0;
    default:
      return pt.newUsers || 0;
  }
}

// 刻度最大值（自适应整十/整四倍数，保证美观的网格线）
const chartYMax = computed(() => {
  const points = data.value?.trend || [];
  if (!points.length) return 10;
  const maxObserved = Math.max(
    1,
    ...points.map((p) => getPointValue(p, activeMetric.value)),
  );
  // 计算合适标尺
  let raw = Math.ceil(maxObserved * 1.18);
  if (raw < 4) raw = 4;
  const step = Math.ceil(raw / 4);
  return step * 4;
});

// Y 轴刻度列表
const yTicks = computed(() => {
  const max = chartYMax.value;
  return [
    { value: max, y: PADDING.top },
    { value: Math.round(max * 0.75), y: PADDING.top + plotHeight * 0.25 },
    { value: Math.round(max * 0.5), y: PADDING.top + plotHeight * 0.5 },
    { value: Math.round(max * 0.25), y: PADDING.top + plotHeight * 0.75 },
    { value: 0, y: PADDING.top + plotHeight },
  ];
});

// 计算每个点的 (x, y) 坐标
const chartPoints = computed(() => {
  const list = data.value?.trend || [];
  if (!list.length) return [];
  const max = chartYMax.value;
  return list.map((item, index) => {
    const x =
      list.length === 1
        ? PADDING.left + plotWidth / 2
        : PADDING.left + (index / (list.length - 1)) * plotWidth;
    const val = getPointValue(item, activeMetric.value);
    const y = PADDING.top + plotHeight - (val / max) * plotHeight;
    return {
      x,
      y,
      val,
      day: item.day,
      dateLabel: formatDateLabel(item.day),
      raw: item,
    };
  });
});

// 平滑贝塞尔曲线路径生成
const smoothLinePath = computed(() => {
  const pts = chartPoints.value;
  if (!pts.length) return '';
  if (pts.length === 1) {
    return `M ${pts[0].x} ${pts[0].y}`;
  }
  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : pts.length - 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return path;
});

// 面积闭合填充路径
const smoothAreaPath = computed(() => {
  const line = smoothLinePath.value;
  const pts = chartPoints.value;
  if (!line || !pts.length) return '';
  const first = pts[0];
  const last = pts[pts.length - 1];
  const bottomY = PADDING.top + plotHeight;
  return `${line} L ${last.x.toFixed(2)} ${bottomY} L ${first.x.toFixed(2)} ${bottomY} Z`;
});

// 当前高亮点的详细提示信息
const activeHoveredPoint = computed(() => {
  if (hoveredIndex.value === null) return null;
  return chartPoints.value[hoveredIndex.value] || null;
});

onMounted(load);
</script>

<template>
  <main class="analytics" aria-labelledby="analytics-title">
    <!-- 页头手账风 Hero -->
    <header class="analytics__hero">
      <div class="analytics__title-group">
        <div class="badge-row">
          <span class="stamp">SUPERADMIN DASHBOARD</span>
          <span v-if="data?.isMock" class="stamp-preview">
            [MOCK 预览数据 · 待后端接入]
          </span>
        </div>
        <h2 id="analytics-title">数据看板</h2>
        <p class="subtitle">校园里的每一份热闹，都在这里慢慢长大。</p>
      </div>

      <div class="analytics__meta">
        <p class="updated">
          数据生成时间：{{ formatUpdatedAt(data?.generatedAt) }}
        </p>
        <button
          type="button"
          class="refresh-btn"
          :disabled="loading"
          aria-label="刷新数据"
          @click="load"
        >
          <span class="refresh-icon" :class="{ 'is-spinning': loading }"
            >↻</span
          >
          {{ loading ? '刷新中…' : '刷新数据' }}
        </button>
      </div>
    </header>

    <!-- 加载与错误状态 -->
    <LoadingState v-if="loading && !data" message="正在翻阅干饭数据账本…" />
    <ErrorState
      v-else-if="error && !data"
      title="数据看板加载失败"
      :description="error.message"
      @retry="load"
    />

    <template v-else-if="data">
      <!-- 顶部当前在线 Hero 卡片 -->
      <section class="overview-hero" aria-label="实时在线概览">
        <div class="overview-hero__content">
          <span class="overview-hero__label">当前在线</span>
          <strong class="overview-hero__value">
            {{ formatNumber(data.onlineUsers) }}
          </strong>
          <p class="overview-hero__sub">
            约占注册用户
            <span class="highlight-ratio">
              {{ formatPercent(data.onlineUsers, data.registeredUsers) }}
            </span>
            <span class="note">（会话有效活跃人数）</span>
          </p>
        </div>

        <div class="overview-hero__doodle" aria-hidden="true">
          <svg viewBox="0 0 100 80" class="doodle-svg">
            <path
              d="M 10 50 Q 50 15 90 50 Z"
              fill="none"
              stroke="var(--zine-stamp-red)"
              stroke-width="3"
            />
            <circle cx="50" cy="20" r="4" fill="var(--zine-stamp-red)" />
            <path
              d="M 20 54 Q 50 68 80 54"
              fill="none"
              stroke="var(--ft-color-secondary)"
              stroke-width="2"
              stroke-dasharray="3 3"
            />
            <path
              d="M 28 44 C 36 36 44 36 50 42 C 56 36 64 36 72 44"
              fill="none"
              stroke="var(--ft-color-accent)"
              stroke-width="2.5"
            />
          </svg>
          <span class="doodle-caption">干饭热度高涨中</span>
        </div>
      </section>

      <!-- 核心指标 8 卡片网格（对齐手机端） -->
      <section class="section-block" aria-labelledby="metric-grid-title">
        <div class="section-header">
          <h3 id="metric-grid-title" class="block-title">平台总览</h3>
          <span class="block-eyebrow">8 大核心运营指标</span>
        </div>

        <div class="metric-grid">
          <article
            v-for="item in metricCards"
            :key="item.label"
            class="metric-card"
            :class="`metric-card--${item.tone}`"
          >
            <div class="metric-card__header">
              <span class="metric-card__label">{{ item.label }}</span>
              <span class="metric-card__tag">{{ item.tag }}</span>
            </div>
            <strong class="metric-card__value">
              {{ formatNumber(item.value) }}
            </strong>
            <small class="metric-card__desc">{{ item.desc }}</small>
          </article>
        </div>
      </section>

      <!-- 近 7 日趋势曲线图（核心展示：用户数、评论互动、食记数） -->
      <section class="section-block" aria-labelledby="trend-title">
        <div class="panel">
          <div class="panel__header">
            <div>
              <span class="panel__eyebrow">01 / 运行走势</span>
              <h3 id="trend-title" class="panel__title">近 7 日趋势</h3>
            </div>
            <div class="panel__note-tag">最近 7 自然日连续数据</div>
          </div>

          <!-- 指标切换 Tab -->
          <div class="trend-tabs" role="tablist" aria-label="走势指标选择">
            <button
              v-for="tab in METRIC_TABS"
              :key="tab.key"
              type="button"
              role="tab"
              :aria-selected="activeMetric === tab.key"
              class="trend-tab"
              :class="[
                `trend-tab--${tab.color}`,
                { 'is-active': activeMetric === tab.key },
              ]"
              @click="activeMetric = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- 曲线图容器 -->
          <div class="chart-box">
            <svg
              class="trend-svg"
              :viewBox="`0 0 ${CHART_VIEWBOX_WIDTH} ${CHART_VIEWBOX_HEIGHT}`"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="近七日运营数据平滑曲线图"
            >
              <defs>
                <linearGradient id="chart-grad-red" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#c9341e" stop-opacity="0.32" />
                  <stop
                    offset="100%"
                    stop-color="#c9341e"
                    stop-opacity="0.02"
                  />
                </linearGradient>
                <linearGradient
                  id="chart-grad-blue"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stop-color="#3f7291" stop-opacity="0.32" />
                  <stop
                    offset="100%"
                    stop-color="#3f7291"
                    stop-opacity="0.02"
                  />
                </linearGradient>
                <linearGradient
                  id="chart-grad-green"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stop-color="#5b7a3a" stop-opacity="0.32" />
                  <stop
                    offset="100%"
                    stop-color="#5b7a3a"
                    stop-opacity="0.02"
                  />
                </linearGradient>
                <linearGradient
                  id="chart-grad-gold"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stop-color="#b88924" stop-opacity="0.32" />
                  <stop
                    offset="100%"
                    stop-color="#b88924"
                    stop-opacity="0.02"
                  />
                </linearGradient>
              </defs>

              <!-- Y 轴网格线与数值标尺 -->
              <g class="chart-grid">
                <g v-for="tick in yTicks" :key="tick.value">
                  <line
                    :x1="PADDING.left"
                    :y1="tick.y"
                    :x2="CHART_VIEWBOX_WIDTH - PADDING.right"
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
              </g>

              <!-- 坐标轴骨架线 -->
              <line
                :x1="PADDING.left"
                :y1="PADDING.top"
                :x2="PADDING.left"
                :y2="PADDING.top + plotHeight"
                class="axis-line"
              />
              <line
                :x1="PADDING.left"
                :y1="PADDING.top + plotHeight"
                :x2="CHART_VIEWBOX_WIDTH - PADDING.right"
                :y2="PADDING.top + plotHeight"
                class="axis-line"
              />

              <!-- 面积渐变填充 -->
              <path
                v-if="smoothAreaPath"
                :d="smoothAreaPath"
                :fill="`url(#chart-grad-${METRIC_TABS.find((t) => t.key === activeMetric)?.color || 'red'})`"
                class="area-path"
              />

              <!-- 平滑曲线线条 -->
              <path
                v-if="smoothLinePath"
                :d="smoothLinePath"
                class="curve-line"
                :class="`curve-line--${METRIC_TABS.find((t) => t.key === activeMetric)?.color || 'red'}`"
              />

              <!-- 数据点圆圈与常驻数值（仿手机端标在点上方） -->
              <g
                v-for="(pt, index) in chartPoints"
                :key="pt.day"
                class="chart-node"
                :class="{ 'is-hovered': hoveredIndex === index }"
                tabindex="0"
                role="button"
                :aria-label="`${pt.day}：${pt.val}`"
                @mouseenter="hoveredIndex = index"
                @focus="hoveredIndex = index"
                @mouseleave="hoveredIndex = null"
                @blur="hoveredIndex = null"
              >
                <!-- 垂直辅助线 -->
                <line
                  v-if="hoveredIndex === index"
                  :x1="pt.x"
                  :y1="PADDING.top"
                  :x2="pt.x"
                  :y2="PADDING.top + plotHeight"
                  class="cursor-line"
                />

                <!-- 点上方常驻数值标注（与手机端一致） -->
                <text
                  :x="pt.x"
                  :y="pt.y <= PADDING.top + 16 ? pt.y + 18 : pt.y - 10"
                  class="point-label"
                  text-anchor="middle"
                >
                  {{ formatNumber(pt.val) }}
                </text>

                <!-- 外圈呼吸光晕 -->
                <circle
                  :cx="pt.x"
                  :cy="pt.y"
                  r="7"
                  class="point-ring"
                  :class="`point-ring--${METRIC_TABS.find((t) => t.key === activeMetric)?.color || 'red'}`"
                />
                <!-- 核心实心圆点 -->
                <circle
                  :cx="pt.x"
                  :cy="pt.y"
                  r="4"
                  class="point-circle"
                  :class="`point-circle--${METRIC_TABS.find((t) => t.key === activeMetric)?.color || 'red'}`"
                />

                <!-- X 轴日期刻度 -->
                <text
                  :x="pt.x"
                  :y="PADDING.top + plotHeight + 20"
                  class="x-label"
                  text-anchor="middle"
                >
                  {{ pt.dateLabel }}
                </text>
              </g>
            </svg>

            <!-- 悬浮详情卡片 Tooltip -->
            <div
              v-if="activeHoveredPoint"
              class="chart-tooltip"
              :style="{
                left: `${(activeHoveredPoint.x / CHART_VIEWBOX_WIDTH) * 100}%`,
              }"
            >
              <div class="tooltip-title">{{ activeHoveredPoint.day }}</div>
              <div class="tooltip-item">
                <span class="tooltip-key">当日数值：</span>
                <strong class="tooltip-val">
                  {{ formatNumber(activeHoveredPoint.val) }}
                </strong>
              </div>
              <div class="tooltip-detail">
                <span>新用户: {{ activeHoveredPoint.raw.newUsers }}</span>
                <span>评论: {{ activeHoveredPoint.raw.newReviews }}</span>
                <span>食记: {{ activeHoveredPoint.raw.newPosts }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 今日活跃对比明细表格（对齐手机端） -->
      <section class="section-block" aria-labelledby="activity-title">
        <div class="section-header">
          <h3 id="activity-title" class="block-title">今日活跃</h3>
          <span class="block-eyebrow">今日增量 vs 历史累计</span>
        </div>

        <div class="activity-table-wrapper">
          <table class="activity-table">
            <thead>
              <tr>
                <th scope="col" class="cell-name">内容类别</th>
                <th scope="col" class="cell-today">今日新增</th>
                <th scope="col" class="cell-total">平台累计</th>
                <th scope="col" class="cell-desc">说明</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in activityRows" :key="row.name">
                <td class="cell-name">
                  <span class="row-bullet" />
                  <strong>{{ row.name }}</strong>
                </td>
                <td class="cell-today">
                  <span class="today-tag">+{{ formatNumber(row.today) }}</span>
                </td>
                <td class="cell-total">
                  {{ formatNumber(row.total) }}
                </td>
                <td class="cell-desc">
                  {{ row.desc }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.analytics {
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: 0 0 48px;
  overflow-wrap: anywhere;
}

/* 页头 Hero */
.analytics__hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 24px;
}

.badge-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.stamp {
  display: inline-block;
  padding: 2px 8px;
  border: 2px solid var(--zine-stamp-red);
  color: var(--zine-stamp-red);
  font-family: var(--ft-font-family-note);
  font-size: var(--ft-font-size-xs);
  font-weight: 700;
  letter-spacing: 0.08em;
  transform: rotate(-1.5deg);
}

.stamp-preview {
  display: inline-block;
  padding: 2px 8px;
  border: 1px dashed var(--zine-stamp-blue);
  background: var(--zine-stamp-blue-soft);
  color: var(--zine-stamp-blue);
  font-size: var(--ft-font-size-xs);
  font-weight: 700;
}

.analytics__title-group h2 {
  margin: 10px 0 0;
  color: var(--ft-color-secondary);
  font-family: var(--ft-font-family-title);
  font-size: var(--ft-font-size-xl);
  line-height: 1.15;
}

.subtitle {
  margin: 8px 0 0;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}

.analytics__meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.updated {
  margin: 0;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-xs);
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 6px 16px;
  border: 1px solid var(--ft-color-secondary);
  border-radius: 0;
  background: var(--zine-paper-card);
  box-shadow: 2px 2px 0 var(--ft-color-secondary);
  color: var(--ft-color-secondary);
  font-size: var(--ft-font-size-sm);
  font-weight: 700;
  cursor: pointer;
  transition:
    transform var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}

.refresh-btn:hover:not(:disabled) {
  background: var(--ft-color-secondary);
  color: var(--zine-paper-card);
  transform: translate(-1px, -1px);
}

.refresh-btn:focus-visible {
  outline: 2px dashed var(--ft-color-primary);
  outline-offset: 3px;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-icon {
  display: inline-block;
  font-size: 15px;
  transition: transform 0.5s ease;
}

.refresh-icon.is-spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 当前在线 Hero 卡片 */
.overview-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  margin-bottom: 32px;
  border: 1px solid var(--ft-color-secondary);
  border-radius: 0;
  background: var(--zine-paper-card-alt);
  box-shadow: 4px 5px 0 rgb(58 36 24 / 14%);
}

.overview-hero__label {
  display: block;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
  font-weight: 700;
}

.overview-hero__value {
  display: block;
  margin: 6px 0;
  color: var(--ft-color-primary);
  font-family: var(--ft-font-family-title);
  font-size: 46px;
  line-height: 1.05;
}

.overview-hero__sub {
  margin: 0;
  color: var(--ft-color-accent);
  font-size: var(--ft-font-size-sm);
  font-weight: 700;
}

.highlight-ratio {
  margin-left: 4px;
  font-size: 18px;
  font-weight: 800;
}

.overview-hero__sub .note {
  margin-left: 6px;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-xs);
  font-weight: normal;
}

.overview-hero__doodle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.doodle-svg {
  width: 90px;
  height: 64px;
}

.doodle-caption {
  color: var(--ft-color-text-muted);
  font-family: var(--ft-font-family-note);
  font-size: 13px;
  letter-spacing: 0.05em;
}

/* 区块与卡片 */
.section-block {
  margin-bottom: 36px;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
}

.block-title {
  margin: 0;
  color: var(--ft-color-secondary);
  font-family: var(--ft-font-family-title);
  font-size: 24px;
  line-height: 1.2;
}

.block-eyebrow {
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-xs);
}

/* 8 大指标卡片网格 */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 136px;
  padding: 18px;
  border: 1px solid var(--ft-color-secondary);
  border-radius: 0;
  background: var(--zine-paper-card);
  box-shadow: 4px 5px 0 rgb(58 36 24 / 14%);
  transition:
    transform var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);
}

.metric-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 7px 0 rgb(58 36 24 / 22%);
}

.metric-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.metric-card__label {
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
  font-weight: 700;
}

.metric-card__tag {
  padding: 1px 6px;
  border: 1px dashed var(--ft-color-border);
  color: var(--ft-color-text-muted);
  font-size: 11px;
}

.metric-card__value {
  margin: 10px 0 6px;
  font-family: var(--ft-font-family-title);
  font-size: 28px;
  line-height: 1.1;
}

.metric-card--red .metric-card__value {
  color: var(--zine-stamp-red);
}

.metric-card--blue .metric-card__value {
  color: var(--zine-stamp-blue);
}

.metric-card--green .metric-card__value {
  color: var(--ft-color-accent);
}

.metric-card__desc {
  color: var(--ft-color-text-muted);
  font-size: 12px;
}

/* 趋势图面板 */
.panel {
  padding: 24px;
  border: 1px solid var(--ft-color-secondary);
  border-radius: 0;
  background: var(--zine-paper-card);
  box-shadow: 4px 5px 0 rgb(58 36 24 / 14%);
}

.panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.panel__eyebrow {
  color: var(--zine-stamp-red);
  font-family: var(--ft-font-family-note);
  font-size: var(--ft-font-size-sm);
  font-weight: 700;
}

.panel__title {
  margin: 4px 0 0;
  color: var(--ft-color-secondary);
  font-family: var(--ft-font-family-title);
  font-size: 24px;
}

.panel__note-tag {
  padding: 3px 8px;
  border: 1px dashed var(--ft-color-secondary);
  background: var(--zine-paper-card-alt);
  color: var(--ft-color-text-muted);
  font-size: 12px;
}

/* 走势指标切换 Tab */
.trend-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  padding: 4px;
  border: 1px solid var(--ft-color-border);
  background: var(--zine-paper-card-alt);
}

.trend-tab {
  flex: 1;
  min-height: 38px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--ft-color-secondary);
  font-size: var(--ft-font-size-sm);
  font-weight: 700;
  cursor: pointer;
  transition: all var(--ft-transition-fast);
}

.trend-tab:hover {
  background: rgb(58 36 24 / 6%);
}

.trend-tab:focus-visible {
  outline: 2px dashed var(--ft-color-primary);
  outline-offset: 2px;
}

.trend-tab.is-active {
  background: var(--zine-paper-card);
  border-color: var(--ft-color-secondary);
  box-shadow: 2px 2px 0 var(--ft-color-secondary);
}

.trend-tab--red.is-active {
  color: var(--zine-stamp-red);
}

.trend-tab--blue.is-active {
  color: var(--zine-stamp-blue);
}

.trend-tab--green.is-active {
  color: var(--ft-color-accent);
}

.trend-tab--gold.is-active {
  color: #b88924;
}

/* 曲线图容器与 SVG */
.chart-box {
  position: relative;
  width: 100%;
}

.trend-svg {
  display: block;
  width: 100%;
  height: auto;
  min-height: 220px;
}

.grid-line {
  stroke: var(--ft-color-border);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.axis-line {
  stroke: var(--ft-color-secondary);
  stroke-width: 1.5;
}

.tick-label {
  fill: var(--ft-color-text-muted);
  font-size: 11px;
  font-family: var(--ft-font-family);
}

.curve-line {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke 0.3s ease;
}

.curve-line--red {
  stroke: var(--zine-stamp-red);
}

.curve-line--blue {
  stroke: var(--zine-stamp-blue);
}

.curve-line--green {
  stroke: var(--ft-color-accent);
}

.curve-line--gold {
  stroke: #b88924;
}

.chart-node {
  cursor: pointer;
  outline: none;
}

.point-label {
  fill: var(--ft-color-secondary);
  font-family: var(--ft-font-family-title);
  font-size: 11px;
  font-weight: 700;
}

.point-ring {
  fill: transparent;
  stroke-width: 2;
  transition:
    r 0.2s ease,
    opacity 0.2s ease;
  opacity: 0.5;
}

.chart-node:hover .point-ring,
.chart-node:focus .point-ring {
  r: 10;
  opacity: 1;
}

.point-circle {
  transition: r 0.2s ease;
}

.chart-node:hover .point-circle,
.chart-node:focus .point-circle {
  r: 5;
}

.point-circle--red,
.point-ring--red {
  fill: var(--zine-stamp-red);
  stroke: var(--zine-stamp-red);
}

.point-circle--blue,
.point-ring--blue {
  fill: var(--zine-stamp-blue);
  stroke: var(--zine-stamp-blue);
}

.point-circle--green,
.point-ring--green {
  fill: var(--ft-color-accent);
  stroke: var(--ft-color-accent);
}

.point-circle--gold,
.point-ring--gold {
  fill: #b88924;
  stroke: #b88924;
}

.cursor-line {
  stroke: var(--ft-color-secondary);
  stroke-width: 1;
  stroke-dasharray: 3 3;
  opacity: 0.75;
}

.x-label {
  fill: var(--ft-color-text-muted);
  font-size: 11px;
}

/* Tooltip */
.chart-tooltip {
  position: absolute;
  top: 10px;
  transform: translateX(-50%);
  min-width: 140px;
  padding: 8px 12px;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  box-shadow: 3px 3px 0 var(--ft-color-secondary);
  pointer-events: none;
  z-index: 10;
}

.tooltip-title {
  color: var(--ft-color-text-muted);
  font-size: 11px;
  font-weight: 700;
  border-bottom: 1px dashed var(--ft-color-border);
  padding-bottom: 4px;
  margin-bottom: 4px;
}

.tooltip-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.tooltip-key {
  color: var(--ft-color-secondary);
  font-size: 12px;
}

.tooltip-val {
  color: var(--zine-stamp-red);
  font-weight: 800;
  font-size: 13px;
}

.tooltip-detail {
  display: flex;
  gap: 8px;
  color: var(--ft-color-text-muted);
  font-size: 10px;
}

/* 今日活跃表格 */
.activity-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  box-shadow: 4px 5px 0 rgb(58 36 24 / 14%);
}

.activity-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.activity-table th,
.activity-table td {
  padding: 14px 18px;
  border-bottom: 1px dashed var(--ft-color-border);
}

.activity-table th {
  background: var(--zine-paper-card-alt);
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-xs);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.activity-table tbody tr:last-child td {
  border-bottom: none;
}

.activity-table tbody tr:hover {
  background: rgb(58 36 24 / 2%);
}

.cell-name {
  width: 22%;
  color: var(--ft-color-secondary);
  font-size: var(--ft-font-size-sm);
}

.row-bullet {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 8px;
  background: var(--zine-stamp-red);
  vertical-align: middle;
}

.cell-today {
  width: 20%;
}

.today-tag {
  display: inline-block;
  padding: 2px 10px;
  border: 1px solid var(--zine-stamp-red);
  background: var(--zine-stamp-red-soft);
  color: var(--zine-stamp-red);
  font-family: var(--ft-font-family-title);
  font-size: var(--ft-font-size-sm);
  font-weight: 700;
}

.cell-total {
  width: 22%;
  color: var(--ft-color-secondary);
  font-family: var(--ft-font-family-title);
  font-size: 17px;
  font-weight: 700;
}

.cell-desc {
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-xs);
}

/* 响应式适配 */
@media (max-width: 980px) {
  .metric-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .analytics {
    padding: 0 0 32px;
  }

  .analytics__hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .overview-hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
  }

  .overview-hero__doodle {
    display: none;
  }

  .trend-tabs {
    flex-wrap: wrap;
  }

  .trend-tab {
    flex: 1 1 45%;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .cell-desc {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .refresh-btn,
  .metric-card,
  .trend-tab,
  .point-ring,
  .point-circle,
  .curve-line {
    transition: none !important;
  }
  .refresh-icon.is-spinning {
    animation: none !important;
  }
}
</style>
