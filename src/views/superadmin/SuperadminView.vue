<script setup>
import { computed, ref, watch } from 'vue';
import { fetchAuditLogs, fetchDashboard } from '@/api/superadmin.api.js';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import InkButton from '@/components/base/InkButton.vue';

const metrics = [
  { key: 'user_count', label: '用户总数' },
  { key: 'active_users', label: '活跃用户' },
  { key: 'banned_users', label: '封禁用户' },
  { key: 'user_today', label: '今日新增' },
  { key: 'admin_count', label: '管理员' },
  { key: 'superadmin_count', label: '超级管理员' },
  { key: 'canteen_count', label: '食堂' },
  { key: 'stall_count', label: '档口' },
  { key: 'dish_count', label: '菜品' },
  { key: 'pending_reviews', label: '待审点评' },
  { key: 'pending_rants', label: '待审吐槽' },
  { key: 'pending_submissions', label: '待审投稿' },
  { key: 'total_reviews', label: '点评总数' },
  { key: 'total_rants', label: '吐槽总数' },
  { key: 'total_submissions', label: '投稿总数' },
  { key: 'total_invite_codes', label: '邀请码总数' },
];

const dashboard = ref(null);
const dashboardLoading = ref(false);
const dashboardError = ref(null);
const page = ref(1);
const perPage = 20;
const logs = ref([]);
const total = ref(0);
const logsLoading = ref(false);
const logsError = ref(null);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / perPage)),
);
const dashboardItems = computed(() =>
  metrics.map((metric) => ({
    ...metric,
    value: dashboard.value?.[metric.key] ?? '—',
  })),
);

async function loadDashboard() {
  dashboardLoading.value = true;
  dashboardError.value = null;
  try {
    const data = await fetchDashboard();
    dashboard.value = data && typeof data === 'object' ? data : {};
  } catch (caught) {
    dashboardError.value = caught;
  } finally {
    dashboardLoading.value = false;
  }
}

async function loadLogs() {
  const requestedPage = page.value;
  logsLoading.value = true;
  logsError.value = null;
  try {
    const data = await fetchAuditLogs(requestedPage, perPage);
    if (requestedPage !== page.value) return;
    logs.value = Array.isArray(data?.items) ? data.items : [];
    total.value = Math.max(0, Number(data?.total) || 0);
  } catch (caught) {
    if (requestedPage !== page.value) return;
    logsError.value = caught;
  } finally {
    if (requestedPage === page.value) logsLoading.value = false;
  }
}

function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}

watch(page, loadLogs, { immediate: true });
loadDashboard();
</script>

<template>
  <div class="superadmin">
    <section aria-labelledby="dashboard-title">
      <div class="superadmin__heading">
        <div>
          <h2 id="dashboard-title">数据看板</h2>
          <p>当前系统概况，数据来自超级管理员接口。</p>
        </div>
        <InkButton :disabled="dashboardLoading" @click="loadDashboard"
          >刷新数据</InkButton
        >
      </div>
      <LoadingState v-if="dashboardLoading" message="正在读取数据看板…" />
      <ErrorState
        v-else-if="dashboardError"
        :description="dashboardError.message"
        @retry="loadDashboard"
      />
      <EmptyState
        v-else-if="!dashboard || !Object.keys(dashboard).length"
        title="暂无统计数据"
        description="请稍后刷新。"
      />
      <dl v-else class="superadmin__metrics">
        <div
          v-for="metric in dashboardItems"
          :key="metric.key"
          class="superadmin__metric"
        >
          <dt>{{ metric.label }}</dt>
          <dd>{{ metric.value }}</dd>
        </div>
      </dl>
    </section>

    <section class="superadmin__logs" aria-labelledby="logs-title">
      <div class="superadmin__heading">
        <div>
          <h2 id="logs-title">操作日志</h2>
          <p>共 {{ total }} 条，按时间倒序显示。</p>
        </div>
        <InkButton :disabled="logsLoading" @click="loadLogs"
          >刷新日志</InkButton
        >
      </div>
      <LoadingState v-if="logsLoading" message="正在读取操作日志…" />
      <ErrorState
        v-else-if="logsError"
        :description="logsError.message"
        @retry="loadLogs"
      />
      <EmptyState
        v-else-if="!logs.length"
        title="暂无操作日志"
        description="角色、状态等管理操作会记录在这里。"
      />
      <ol v-else class="superadmin__log-list" :start="(page - 1) * perPage + 1">
        <li v-for="log in logs" :key="log.id" class="superadmin__log">
          <div class="superadmin__log-head">
            <strong>{{ log.action }}</strong>
            <time :datetime="log.created_at">{{
              formatTime(log.created_at)
            }}</time>
          </div>
          <p>
            操作人：{{ log.operator_account || '未知' }} · 对象：{{
              log.target_type
            }}
            {{ log.target_id }}
          </p>
          <p v-if="log.detail">{{ log.detail }}</p>
        </li>
      </ol>
      <nav class="superadmin__pagination" aria-label="日志分页">
        <InkButton :disabled="logsLoading || page <= 1" @click="page -= 1"
          >上一页</InkButton
        >
        <span>第 {{ page }} / {{ totalPages }} 页</span>
        <InkButton
          :disabled="logsLoading || page >= totalPages"
          @click="page += 1"
          >下一页</InkButton
        >
      </nav>
    </section>
  </div>
</template>

<style scoped lang="scss">
.superadmin {
  display: grid;
  gap: var(--ft-space-5);

  &__heading,
  &__log-head,
  &__pagination {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--ft-space-2);
  }

  &__heading h2 {
    margin: 0;
    font-family: var(--ft-font-family-title);
  }

  &__heading p,
  &__log p {
    color: var(--ft-color-text-muted);
  }

  &__metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
    gap: var(--ft-space-2);
    margin: var(--ft-space-3) 0 0;
  }

  &__metric,
  &__log {
    padding: var(--ft-space-2);
    border: 2px solid var(--ft-color-text);
    background: var(--zine-paper-card-alt);
    box-shadow: 4px 4px 0 var(--ft-color-text);
  }

  &__metric dt {
    color: var(--ft-color-text-muted);
  }

  &__metric dd {
    margin: var(--ft-space-1) 0 0;
    font-family: var(--ft-font-family-title);
    font-size: var(--ft-font-size-xl);
    font-weight: 700;
  }

  &__log-list {
    display: grid;
    gap: var(--ft-space-2);
    margin: var(--ft-space-3) 0;
    padding: 0;
    list-style: none;
  }

  &__log p {
    margin-bottom: 0;
    overflow-wrap: anywhere;
  }

  &__pagination {
    justify-content: flex-end;
  }
}
</style>
