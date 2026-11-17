<script setup>
import { PRICE_UNITS } from '@/utils/priceHistory.js';
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  decideCatalogCorrection,
  fetchAdminCatalogCorrection,
  fetchAdminCatalogCorrections,
} from '@/api/correction.api.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { formatTime } from '@/utils/recordLabels.js';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';

const auth = useAuthStore();
const canReview = computed(() => auth.can('correction.review'));
const status = ref('pending');
const state = usePagedData((page, options) =>
  fetchAdminCatalogCorrections({
    page,
    size: 20,
    status: status.value || undefined,
    ...options,
  }),
);
const detail = ref(null);
const detailLoading = ref(false);
const detailError = ref('');
const note = ref('');
const deciding = ref(false);

watch(status, () => {
  state.page.value = 1;
  state.load();
});

async function open(item) {
  detailLoading.value = true;
  detailError.value = '';
  note.value = item.correction.reviewNote || '';
  try {
    detail.value = await fetchAdminCatalogCorrection(item.correction.id);
  } catch (error) {
    detailError.value = error.message || '无法读取提案';
  } finally {
    detailLoading.value = false;
  }
}

async function decide(decision) {
  if (!detail.value) return;
  deciding.value = true;
  detailError.value = '';
  try {
    const result = await decideCatalogCorrection(detail.value.correction.id, {
      decision,
      reviewNote: note.value.trim() || undefined,
      expectedRevision: detail.value.correction.revision,
    });
    detail.value = result;
    ElMessage.success(decision === 'approved' ? '已通过并应用' : '已拒绝');
    state.load();
  } catch (error) {
    detailError.value = error.message || '审核失败';
  } finally {
    deciding.value = false;
  }
}

const fieldLabel = {
  name: '名称',
  description: '介绍',
  price: '价格',
  priceUnit: '计价单位',
};
function price(value) {
  return value === null || value === undefined ? '未知' : `¥${value}`;
}
</script>

<template>
  <section class="admin-corrections">
    <h2 class="section-title">目录纠错</h2>
    <p v-if="!canReview" role="alert">
      当前账号没有纠错审核能力，请联系超级管理员。
    </p>
    <template v-else>
      <label class="admin-corrections__filter">
        状态
        <select v-model="status">
          <option value="pending">待核对</option>
          <option value="approved">已通过</option>
          <option value="rejected">未通过</option>
          <option value="">全部</option>
        </select>
      </label>

      <LoadingState v-if="state.loading.value" />
      <ErrorState
        v-else-if="state.error.value"
        :description="state.error.value.message"
        @retry="state.load"
      />
      <EmptyState
        v-else-if="!state.items.value.length"
        title="没有待处理纠错"
      />
      <ul v-else class="admin-corrections__queue">
        <li v-for="item in state.items.value" :key="item.correction.id">
          <button type="button" @click="open(item)">
            <strong>{{ item.correction.targetSummary }}</strong>
            <span>
              {{
                item.correction.changedFields
                  .map((f) => fieldLabel[f] || f)
                  .join('、')
              }}
              · {{ item.submitterName }} ·
              {{ formatTime(item.correction.createdAt) }}
            </span>
          </button>
        </li>
      </ul>
      <PaginationControls
        v-if="state.total.value > state.size.value"
        :page="state.page.value"
        :total="state.total.value"
        :size="state.size.value"
        @change="state.page.value = $event"
      />

      <section v-if="detailLoading"><LoadingState /></section>
      <p v-else-if="detailError" role="alert">{{ detailError }}</p>
      <article v-else-if="detail" class="admin-corrections__detail">
        <h3>{{ detail.correction.targetSummary }}</h3>
        <p>
          提交人：{{ detail.submitterName }}（{{ detail.submitterEmail }}） ·
          {{ formatTime(detail.correction.createdAt) }}
        </p>
        <dl>
          <template
            v-for="field in detail.correction.changedFields"
            :key="field"
          >
            <dt>{{ fieldLabel[field] || field }}</dt>
            <dd v-if="field === 'name'">
              {{ detail.correction.originalName }} →
              {{ detail.correction.proposedName }}
            </dd>
            <dd v-else-if="field === 'description'">
              {{ detail.correction.originalDescription || '（空）' }} →
              {{ detail.correction.proposedDescription || '（空）' }}
            </dd>
            <dd v-else-if="field === 'priceUnit'">
              {{ PRICE_UNITS[detail.correction.originalPriceUnit] || '未注明' }}
              →
              {{ PRICE_UNITS[detail.correction.proposedPriceUnit] || '未注明' }}
            </dd>
            <dd v-else-if="field === 'price'">
              {{ price(detail.correction.originalPrice) }} →
              {{ price(detail.correction.proposedPrice) }}
            </dd>
          </template>
          <dt>理由</dt>
          <dd>{{ detail.correction.reason }}</dd>
        </dl>
        <div v-if="detail.correction.evidenceUrls.length">
          <a
            v-for="url in detail.correction.evidenceUrls"
            :key="url"
            :href="url"
            target="_blank"
            rel="noopener"
          >
            <img :src="url" alt="纠错证据" />
          </a>
        </div>
        <p v-if="detail.correction.status !== 'pending'">
          当前状态：{{ detail.correction.status }} · 审核说明：{{
            detail.correction.reviewNote || '无'
          }}
        </p>
        <template v-else>
          <label for="correction-review-note">审核说明（可选）</label>
          <textarea
            id="correction-review-note"
            v-model="note"
            rows="3"
            maxlength="500"
          />
          <div class="admin-corrections__actions">
            <button
              type="button"
              class="button-ink is-primary"
              :disabled="deciding"
              @click="decide('approved')"
            >
              通过并应用
            </button>
            <button
              type="button"
              class="button-ink"
              :disabled="deciding"
              @click="decide('rejected')"
            >
              拒绝
            </button>
          </div>
        </template>
      </article>
    </template>
  </section>
</template>

<style scoped lang="scss">
.admin-corrections {
  &__filter {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__queue {
    display: grid;
    gap: 8px;
    padding: 0;
    list-style: none;

    button {
      display: grid;
      gap: 4px;
      width: 100%;
      padding: 10px;
      text-align: left;
      border: 1px solid var(--ft-color-secondary);
      background: var(--ft-color-surface);
      cursor: pointer;
    }

    span {
      color: var(--ft-color-text-muted);
      font-size: var(--ft-font-size-sm);
    }
  }

  &__detail {
    margin-top: 20px;
    padding: 14px;
    border: 1px solid var(--ft-color-secondary);
    background: var(--ft-color-surface);
    overflow-wrap: anywhere;

    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 6px 12px;
    }

    dt {
      color: var(--ft-color-text-muted);
    }

    dd {
      margin: 0;
    }

    img {
      width: 120px;
      height: 120px;
      object-fit: cover;
      border: 1px solid var(--ft-color-secondary);
      margin: 4px;
    }

    textarea {
      width: 100%;
      box-sizing: border-box;
      margin: 6px 0;
      padding: 8px;
    }
  }

  &__actions {
    display: flex;
    gap: 10px;
  }
}
</style>
