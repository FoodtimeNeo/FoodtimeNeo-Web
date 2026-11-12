<script setup>
import { ref } from 'vue';
import {
  fetchMyModerationDecisions,
  fetchMyReports,
} from '@/api/safety.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { formatTime } from '@/utils/recordLabels.js';
import BackLink from '@/components/base/BackLink.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';

const tab = ref('reports');
const reports = usePagedData(fetchMyReports);
const decisions = usePagedData(fetchMyModerationDecisions);
const labels = {
  post: '食记',
  comment: '评论',
  message: '私信',
  upheld: '成立',
  not_upheld: '不成立',
  pending: '待处理',
  completed: '已完成',
  legacy: '历史记录，未提供详细结果',
};

function switchTab(value) {
  tab.value = value;
  if (value === 'reports' && !reports.items.value.length) reports.load();
  if (value === 'decisions' && !decisions.items.value.length) decisions.load();
}
</script>

<template>
  <main class="my-reports">
    <BackLink />
    <h1 class="section-title">举报与处理决定</h1>
    <div class="my-reports__tabs" role="tablist">
      <button
        type="button"
        :class="{ 'is-active': tab === 'reports' }"
        @click="switchTab('reports')"
      >
        我的举报
      </button>
      <button
        type="button"
        :class="{ 'is-active': tab === 'decisions' }"
        @click="switchTab('decisions')"
      >
        收到的决定
      </button>
    </div>

    <template v-if="tab === 'reports'">
      <LoadingState v-if="reports.loading.value" />
      <ErrorState
        v-else-if="reports.error.value"
        :description="reports.error.value.message"
        @retry="reports.load"
      />
      <EmptyState
        v-else-if="!reports.items.value.length"
        title="还没有举报记录"
      />
      <ul v-else class="my-reports__list">
        <li v-for="item in reports.items.value" :key="item.id">
          <header>
            <strong>{{ labels[item.targetType] || item.targetType }}</strong>
            <span>{{ labels[item.status] || item.status }}</span>
          </header>
          <p>举报理由：{{ item.reason }}</p>
          <blockquote>{{ item.excerpt }}</blockquote>
          <p>{{ formatTime(item.createdAt) }}</p>
          <div v-if="item.outcome" class="my-reports__decision">
            <strong
              >处理结果：{{ labels[item.outcome] || item.outcome }}</strong
            >
            <p>公开理由：{{ item.publicReason }}</p>
            <small>{{ formatTime(item.decidedAt) }}</small>
          </div>
        </li>
      </ul>
      <PaginationControls
        v-if="reports.total.value > reports.size.value"
        :page="reports.page.value"
        :total="reports.total.value"
        :size="reports.size.value"
        @change="reports.page.value = $event"
      />
    </template>

    <template v-else>
      <LoadingState v-if="decisions.loading.value" />
      <ErrorState
        v-else-if="decisions.error.value"
        :description="decisions.error.value.message"
        @retry="decisions.load"
      />
      <EmptyState
        v-else-if="!decisions.items.value.length"
        title="还没有收到的处理决定"
      />
      <ul v-else class="my-reports__list">
        <li v-for="item in decisions.items.value" :key="item.decisionId">
          <header>
            <strong>{{ labels[item.targetType] || item.targetType }}</strong>
            <span>{{ labels[item.outcome] || item.outcome }}</span>
          </header>
          <p>公开理由：{{ item.publicReason }}</p>
          <p>入箱时间：{{ formatTime(item.deliveredAt) }}</p>
          <p>申诉截止：{{ formatTime(item.appealDeadline) }}</p>
          <small
            >当前身份：{{
              item.side === 'reporter' ? '举报人' : '被举报人'
            }}</small
          >
        </li>
      </ul>
      <PaginationControls
        v-if="decisions.total.value > decisions.size.value"
        :page="decisions.page.value"
        :total="decisions.total.value"
        :size="decisions.size.value"
        @change="decisions.page.value = $event"
      />
    </template>
  </main>
</template>

<style scoped lang="scss">
.my-reports {
  width: min(calc(100% - 2 * var(--zine-page-padding)), 760px);
  margin: var(--ft-space-6) auto;

  &__tabs {
    display: flex;
    gap: 8px;
    margin: 14px 0;

    button {
      padding: 8px 12px;
      border: 1px solid var(--ft-color-secondary);
      background: transparent;
      cursor: pointer;
    }

    button.is-active {
      border-color: var(--ft-color-primary);
      background: rgb(201 52 30 / 10%);
    }
  }

  &__list {
    display: grid;
    gap: 12px;
    padding: 0;
    list-style: none;

    li {
      padding: 14px;
      border: 1px solid var(--ft-color-secondary);
      background: var(--ft-color-surface);
      overflow-wrap: anywhere;
    }

    header {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }

    blockquote {
      white-space: pre-wrap;
      color: var(--ft-color-text-muted);
    }
  }

  &__decision {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--ft-color-secondary);
  }
}
</style>
