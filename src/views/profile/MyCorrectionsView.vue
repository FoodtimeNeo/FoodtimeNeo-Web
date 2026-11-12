<script setup>
import { fetchMyCatalogCorrections } from '@/api/correction.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { formatTime } from '@/utils/recordLabels.js';
import BackLink from '@/components/base/BackLink.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';

const state = usePagedData((page, options) =>
  fetchMyCatalogCorrections({ page, size: 20, ...options }),
);

const statusLabel = {
  pending: '待核对',
  approved: '已通过',
  rejected: '未通过',
};
const fieldLabel = { name: '名称', description: '介绍', price: '价格' };

function price(value) {
  return value === null || value === undefined ? '价格未知' : `¥${value}`;
}
</script>

<template>
  <main class="my-corrections">
    <BackLink />
    <h1 class="section-title">我的纠错</h1>
    <p class="my-corrections__hint">
      认证用户每天最多提交 5 单；通过后目录会立即更新，未通过会保留理由。
    </p>

    <LoadingState v-if="state.loading.value" />
    <ErrorState
      v-else-if="state.error.value"
      :description="state.error.value.message"
      @retry="state.load"
    />
    <EmptyState
      v-else-if="!state.items.value.length"
      title="还没有纠错提案"
      description="在菜品详情页点击「纠错」即可提交。"
    />
    <ul v-else class="my-corrections__list">
      <li v-for="item in state.items.value" :key="item.id">
        <header>
          <strong>{{ item.targetSummary }}</strong>
          <span :class="`is-${item.status}`">{{
            statusLabel[item.status] || item.status
          }}</span>
        </header>
        <p class="my-corrections__fields">
          {{
            item.changedFields
              .map((field) => fieldLabel[field] || field)
              .join('、')
          }}
          · {{ formatTime(item.createdAt) }}
        </p>
        <dl>
          <template v-if="item.changedFields.includes('name')">
            <dt>名称</dt>
            <dd>{{ item.originalName }} → {{ item.proposedName }}</dd>
          </template>
          <template v-if="item.changedFields.includes('description')">
            <dt>介绍</dt>
            <dd>
              {{ item.originalDescription || '（空）' }} →
              {{ item.proposedDescription || '（空）' }}
            </dd>
          </template>
          <template v-if="item.changedFields.includes('price')">
            <dt>价格</dt>
            <dd>
              {{ price(item.originalPrice) }} → {{ price(item.proposedPrice) }}
            </dd>
          </template>
          <dt>理由</dt>
          <dd>{{ item.reason }}</dd>
          <template v-if="item.reviewNote">
            <dt>审核说明</dt>
            <dd>{{ item.reviewNote }}</dd>
          </template>
        </dl>
        <div v-if="item.evidenceUrls.length" class="my-corrections__evidence">
          <img
            v-for="url in item.evidenceUrls"
            :key="url"
            :src="url"
            alt="纠错证据"
          />
        </div>
      </li>
    </ul>
    <PaginationControls
      v-if="state.total.value > state.size.value"
      :page="state.page.value"
      :total="state.total.value"
      :size="state.size.value"
      @change="state.page.value = $event"
    />
  </main>
</template>

<style scoped lang="scss">
.my-corrections {
  width: min(calc(100% - 2 * var(--zine-page-padding)), 760px);
  margin: var(--ft-space-6) auto;

  &__hint {
    color: var(--ft-color-text-muted);
  }

  &__list {
    display: grid;
    gap: 14px;
    padding: 0;
    list-style: none;

    li {
      padding: 14px;
      border: 1px solid var(--ft-color-secondary);
      background: var(--ft-color-surface);
    }

    header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
  }

  &__fields {
    color: var(--ft-color-text-muted);
    font-size: var(--ft-font-size-sm);
  }

  &__evidence {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    img {
      width: 88px;
      height: 88px;
      object-fit: cover;
      border: 1px solid var(--ft-color-secondary);
    }
  }

  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 12px;
    overflow-wrap: anywhere;
  }

  dt {
    color: var(--ft-color-text-muted);
  }

  dd {
    margin: 0;
  }

  .is-pending {
    color: var(--ft-color-warning, #a86b00);
  }

  .is-approved {
    color: var(--ft-color-success, #2e7d32);
  }

  .is-rejected {
    color: var(--ft-color-danger);
  }
}
</style>
