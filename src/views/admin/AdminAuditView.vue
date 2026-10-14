<script setup>
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { fetchAuditItems, submitAudit } from '@/api/admin-audit.api.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import InkButton from '@/components/base/InkButton.vue';

const auth = useAuthStore();
const kinds = [
  { id: 'submissions', label: '菜品投稿' },
  { id: 'reviews', label: '菜品点评' },
  { id: 'rants', label: '吐槽' },
];
const kind = ref('submissions');
const items = ref([]);
const loading = ref(false);
const error = ref(null);
const selectedId = ref('');
const decision = ref('');
const reason = ref('');
const formError = ref('');
const submitting = ref(false);
const pendingItems = computed(() =>
  items.value.filter((item) => (item.status || 'pending') === 'pending'),
);
const selectedItem = computed(() =>
  pendingItems.value.find((item) => String(item.id) === selectedId.value),
);

async function load() {
  loading.value = true;
  error.value = null;
  selectedId.value = '';
  const requestedKind = kind.value;
  try {
    const data = await fetchAuditItems(requestedKind);
    if (requestedKind === kind.value)
      items.value = Array.isArray(data) ? data : [];
  } catch (caught) {
    if (requestedKind === kind.value) error.value = caught;
  } finally {
    if (requestedKind === kind.value) loading.value = false;
  }
}

function choose(item, status) {
  selectedId.value = String(item.id);
  decision.value = status;
  reason.value = '';
  formError.value = '';
}

async function confirmAudit() {
  if (submitting.value || !selectedItem.value) return;
  formError.value = '';
  const trimmedReason = reason.value.trim();
  if (!trimmedReason) {
    formError.value = '请填写审核原因或意见。';
    return;
  }
  submitting.value = true;
  try {
    await submitAudit(
      kind.value,
      selectedId.value,
      decision.value,
      trimmedReason,
      auth.user?.account || '',
    );
    ElMessage.success(decision.value === 'approved' ? '已通过' : '已驳回');
    await load();
  } catch (caught) {
    formError.value = caught.message || '审核失败，请稍后重试。';
  } finally {
    submitting.value = false;
  }
}

watch(kind, load, { immediate: true });
</script>

<template>
  <section class="admin-audit" aria-labelledby="audit-title">
    <div class="admin-audit__intro">
      <div>
        <h2 id="audit-title">待审核内容</h2>
        <p>逐条核对内容，填写意见后通过或驳回。</p>
      </div>
      <button type="button" class="admin-audit__refresh" @click="load">
        刷新列表
      </button>
    </div>

    <div class="admin-audit__tabs" role="group" aria-label="审核类型">
      <button
        v-for="option in kinds"
        :key="option.id"
        type="button"
        :aria-pressed="kind === option.id"
        @click="kind = option.id"
      >
        {{ option.label }}
      </button>
    </div>

    <LoadingState v-if="loading" message="正在读取审核列表…" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <EmptyState
      v-else-if="!pendingItems.length"
      title="目前没有待审核内容"
      description="新的投稿、点评或吐槽会出现在对应栏目。"
    />
    <ul v-else class="admin-audit__list">
      <li v-for="item in pendingItems" :key="item.id" class="admin-audit__card">
        <div class="admin-audit__card-head">
          <strong>{{
            item.dish_name || item.canteenName || '菜品点评'
          }}</strong>
          <span class="stamp">待审核</span>
        </div>
        <p v-if="kind === 'submissions'">
          {{ item.canteen_name }} · {{ item.stall_name }} · 投稿人：{{
            item.submitter_account
          }}
        </p>
        <p v-else-if="kind === 'reviews'">
          {{ item.canteen_name }} · {{ item.stall_name }} ·
          {{ item.dish_name }} · {{ item.rating }} 星
        </p>
        <p v-else>{{ item.author }} · {{ item.tag }}</p>
        <p class="admin-audit__content">
          {{ item.comment || item.content || item.description || '未填写说明' }}
        </p>
        <div class="admin-audit__actions">
          <InkButton @click="choose(item, 'approved')">通过</InkButton>
          <InkButton @click="choose(item, 'rejected')">驳回</InkButton>
        </div>
      </li>
    </ul>

    <form
      v-if="selectedItem"
      class="admin-audit__decision"
      @submit.prevent="confirmAudit"
    >
      <h3>
        {{ decision === 'approved' ? '通过' : '驳回' }}：{{
          selectedItem.dish_name || selectedItem.canteenName || '菜品点评'
        }}
      </h3>
      <label for="audit-reason">审核意见</label>
      <textarea
        id="audit-reason"
        v-model="reason"
        rows="3"
        maxlength="500"
        :disabled="submitting"
        placeholder="说明审核依据"
      />
      <p v-if="formError" role="alert">{{ formError }}</p>
      <div class="admin-audit__actions">
        <InkButton type="submit" variant="primary" :disabled="submitting">
          {{ submitting ? '处理中…' : '确认审核' }}
        </InkButton>
        <InkButton :disabled="submitting" @click="selectedId = ''"
          >取消</InkButton
        >
      </div>
    </form>
  </section>
</template>

<style scoped lang="scss">
.admin-audit {
  &__intro,
  &__card-head,
  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--ft-space-1);
  }

  &__intro h2 {
    margin: 0;
    font-family: var(--ft-font-family-title);
  }

  &__intro p,
  &__card p {
    color: var(--ft-color-text-muted);
  }

  &__refresh,
  &__tabs button {
    min-height: 44px;
    padding: 8px 12px;
    border: 1px solid var(--ft-color-text);
    background: var(--zine-paper-card);
    color: var(--ft-color-text);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  &__tabs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ft-space-1);
    margin: var(--ft-space-3) 0;

    button[aria-pressed='true'] {
      background: var(--ft-color-text);
      color: var(--zine-paper-card);
    }
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
    gap: var(--ft-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__card,
  &__decision {
    padding: var(--ft-space-2);
    border: 2px solid var(--ft-color-text);
    background: var(--zine-paper-card-alt);
    box-shadow: 4px 4px 0 var(--ft-color-text);
  }

  &__content {
    min-height: 3em;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  &__actions {
    justify-content: start;
  }

  &__decision {
    display: grid;
    gap: var(--ft-space-1);
    margin-top: var(--ft-space-3);

    h3,
    p {
      margin: 0;
    }

    p {
      color: var(--ft-color-danger);
    }

    textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--ft-color-text);
      background: var(--zine-paper-card);
      color: var(--ft-color-text);
      font: inherit;
    }
  }
}
</style>
