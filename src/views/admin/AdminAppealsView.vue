<script setup>
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import {
  fetchAdminAppeal,
  fetchAdminAppeals,
  resolveAppeal,
  startAppealReview,
} from '@/api/safety.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { formatTime } from '@/utils/recordLabels.js';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';

const status = ref('submitted');
const state = usePagedData((page, options) =>
  fetchAdminAppeals(status.value, page, options),
);
const detail = ref(null);
const loadingDetail = ref(false);
const error = ref('');
const note = ref('');
const outcome = ref('upheld');
const acting = ref(false);
const labels = {
  submitted: '已提交',
  under_review: '复核中',
  resolved: '已复核',
  upheld: '成立',
  rejected: '不成立',
  reporter: '举报人',
  target: '被举报人',
};

watch(status, () => {
  state.page.value = 1;
  state.load();
});

async function open(row) {
  loadingDetail.value = true;
  error.value = '';
  note.value = row.publicReason || '';
  outcome.value = row.outcome || 'upheld';
  try {
    detail.value = await fetchAdminAppeal(row.id);
  } catch (failure) {
    error.value = failure.message || '无法读取申诉';
  } finally {
    loadingDetail.value = false;
  }
}

async function start() {
  if (!detail.value) return;
  acting.value = true;
  error.value = '';
  try {
    detail.value = await startAppealReview(
      detail.value.id,
      detail.value.revision,
    );
    ElMessage.success('已开始复核');
    state.load();
  } catch (failure) {
    error.value = failure.message || '操作失败';
  } finally {
    acting.value = false;
  }
}

async function resolve() {
  if (!detail.value) return;
  if (!note.value.trim()) {
    error.value = '请填写公开理由';
    return;
  }
  acting.value = true;
  error.value = '';
  try {
    detail.value = await resolveAppeal(detail.value.id, {
      outcome: outcome.value,
      publicReason: note.value.trim(),
      expectedRevision: detail.value.revision,
    });
    ElMessage.success('复核结论已保存');
    state.load();
  } catch (failure) {
    error.value = failure.message || '操作失败';
  } finally {
    acting.value = false;
  }
}
</script>

<template>
  <section class="appeals-admin">
    <h2 class="section-title">申诉复核</h2>
    <p>仅具备 appeal.review 的超管可处理；复核结论会通知决定双方。</p>
    <label class="appeals-admin__filter">
      状态
      <select v-model="status">
        <option value="submitted">已提交</option>
        <option value="under_review">复核中</option>
        <option value="resolved">已复核</option>
        <option value="">全部</option>
      </select>
    </label>

    <LoadingState v-if="state.loading.value" />
    <ErrorState
      v-else-if="state.error.value"
      :description="state.error.value.message"
      @retry="state.load"
    />
    <EmptyState v-else-if="!state.items.value.length" title="没有申诉" />
    <ul v-else class="appeals-admin__queue">
      <li v-for="item in state.items.value" :key="item.id">
        <button type="button" @click="open(item)">
          <strong>{{ labels[item.side] || item.side }}申诉</strong>
          <span>
            {{ labels[item.status] || item.status }} ·
            {{ formatTime(item.createdAt) }}
          </span>
          <span>{{ item.content.slice(0, 80) }}</span>
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

    <p v-if="error" role="alert">{{ error }}</p>
    <LoadingState v-if="loadingDetail" />
    <article v-else-if="detail" class="appeals-admin__detail">
      <h3>
        {{ detail.appellantName }} · {{ labels[detail.side] || detail.side }}
      </h3>
      <p>决定：{{ detail.decisionId }}</p>
      <p>当前状态：{{ labels[detail.status] || detail.status }}</p>
      <p>申诉内容：{{ detail.content }}</p>
      <p v-if="detail.publicReason">公开理由：{{ detail.publicReason }}</p>
      <p v-if="detail.internalNote">内部备注：{{ detail.internalNote }}</p>
      <div v-if="detail.evidenceUrls.length">
        <a
          v-for="url in detail.evidenceUrls"
          :key="url"
          :href="url"
          target="_blank"
          rel="noopener"
        >
          <img :src="url" alt="申诉证据" />
        </a>
      </div>
      <div v-if="detail.status === 'submitted'">
        <button
          type="button"
          class="button-ink"
          :disabled="acting"
          @click="start"
        >
          开始复核
        </button>
      </div>
      <div
        v-else-if="detail.status !== 'resolved'"
        class="appeals-admin__resolve"
      >
        <label>
          结论
          <select v-model="outcome">
            <option value="upheld">申诉成立</option>
            <option value="rejected">申诉不成立</option>
          </select>
        </label>
        <label>
          公开理由
          <textarea v-model="note" rows="3" maxlength="500"></textarea>
        </label>
        <button
          type="button"
          class="button-ink is-primary"
          :disabled="acting"
          @click="resolve"
        >
          保存复核结论
        </button>
      </div>
    </article>
  </section>
</template>

<style scoped lang="scss">
.appeals-admin {
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

    img {
      width: 120px;
      height: 120px;
      object-fit: cover;
      border: 1px solid var(--ft-color-secondary);
      margin: 4px;
    }
  }

  &__resolve {
    display: grid;
    gap: 8px;
    margin-top: 12px;

    label {
      display: grid;
      gap: 4px;
    }

    textarea {
      box-sizing: border-box;
      width: 100%;
      padding: 6px 8px;
    }
  }
}
</style>
