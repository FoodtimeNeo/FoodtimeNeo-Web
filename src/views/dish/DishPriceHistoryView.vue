<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { clearAsyncDataCache } from '@/composables/useAsyncData.js';
import { useRoute } from 'vue-router';
import { ElDialog } from 'element-plus';
import { useAuthStore } from '@/store/useAuthStore.js';
import { fetchDish } from '@/api/dish.api.js';
import {
  fetchPriceHistory,
  correctPriceHistory,
  deletePriceHistory,
} from '@/api/price-history.api.js';
import { PRICE_UNITS, priceRuns, recordedPrice } from '@/utils/priceHistory.js';
import { validatePrice } from '@/utils/submissionValidation.js';
import { formatTime } from '@/utils/recordLabels.js';
import PriceHistoryChart from '@/components/dish/PriceHistoryChart.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
const route = useRoute(),
  auth = useAuthStore();
const days = ref(0),
  data = ref(null),
  loading = ref(false),
  error = ref('');
const writing = ref(false),
  mutationError = ref(''),
  dialog = ref(null),
  shown = ref(20);
const form = reactive({ price: '', priceUnit: 'unspecified' });
let reader, writer;
const runs = computed(() => priceRuns(data.value));
const records = computed(() => [...(data.value?.records || [])].reverse());
const manage = computed(
  () => data.value?.canManage && auth.can('dish-price-history.manage'),
);
const scope = computed(() =>
  JSON.stringify([auth.user?.id, route.params, days.value]),
);
async function load() {
  reader?.abort();
  const controller = new AbortController();
  reader = controller;
  data.value = null;
  error.value = '';
  loading.value = true;
  shown.value = 20;
  const id = String(route.params.dishId);
  try {
    const dish = await fetchDish(id, { signal: controller.signal });
    if (
      dish.stallId !== route.params.stallId ||
      dish.diningHallId !== route.params.canteenId
    )
      throw new Error('菜品与当前食堂或档口不匹配');
    const result = await fetchPriceHistory(id, days.value, {
      signal: controller.signal,
    });
    if (result.dishId !== id || !Array.isArray(result.records))
      throw new Error('价格记录响应不完整');
    if (!controller.signal.aborted) data.value = result;
  } catch (failure) {
    if (!controller.signal.aborted)
      error.value = failure.message || '无法读取价格变化';
  } finally {
    if (!controller.signal.aborted) loading.value = false;
  }
}
watch(
  scope,
  () => {
    writer?.abort();
    writing.value = false;
    dialog.value = null;
    void load();
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  reader?.abort();
  writer?.abort();
});
function open(entry, action) {
  if (!manage.value || writing.value) return;
  form.price = entry.price === null ? '' : String(entry.price);
  form.priceUnit = entry.priceUnit;
  mutationError.value = '';
  dialog.value = {
    entry,
    action,
    latest: entry.id === data.value.records.at(-1)?.id,
  };
}
async function submit() {
  if (!dialog.value || writing.value || !manage.value) return;
  if (dialog.value.action === 'edit') {
    const invalid = validatePrice(form.price, { required: false });
    if (invalid) {
      mutationError.value = invalid;
      return;
    }
  }
  const target = dialog.value,
    id = data.value.dishId,
    revision = data.value.revision;
  const controller = new AbortController();
  writer = controller;
  writing.value = true;
  mutationError.value = '';
  try {
    if (target.action === 'delete')
      await deletePriceHistory(id, target.entry.id, revision, {
        signal: controller.signal,
      });
    else
      await correctPriceHistory(
        id,
        target.entry.id,
        {
          price: form.price.trim() === '' ? null : Number(form.price),
          priceUnit: form.priceUnit,
          expectedRevision: revision,
        },
        { signal: controller.signal },
      );
    if (!controller.signal.aborted) {
      clearAsyncDataCache();
      dialog.value = null;
      await load();
    }
  } catch (failure) {
    if (!controller.signal.aborted)
      mutationError.value = failure.message || '操作失败，请核对结果后重试';
  } finally {
    if (!controller.signal.aborted) writing.value = false;
  }
}
</script>
<template>
  <main class="price-history">
    <RouterLink :to="{ name: 'dishDetail', params: route.params }"
      >← 返回菜品</RouterLink
    >
    <h1 class="section-title">价格变化</h1>
    <p>系统保存的价格记录 · 北京时间。起点不代表菜品开始售卖日期。</p>
    <nav class="ranges" aria-label="价格历史时间范围">
      <button
        v-for="[value, label] in [
          [0, '全部'],
          [30, '近30天'],
          [90, '近90天'],
        ]"
        :key="value"
        type="button"
        class="button-ink"
        :class="{ 'is-primary': days === value }"
        :aria-pressed="days === value"
        :disabled="writing || loading"
        @click="days = value"
      >
        {{ label }}
      </button>
      <button
        type="button"
        class="button-ink"
        :disabled="writing || loading"
        @click="load"
      >
        刷新价格记录
      </button>
    </nav>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error" @retry="load" />
    <template v-else-if="data">
      <h2>{{ data.dishName }}</h2>
      <p class="current">
        当前 {{ recordedPrice(data.currentPrice, data.priceUnit) }}
      </p>
      <p>相邻同价合并为直线；单位变化或价格未知时断开，不跨单位比较涨跌。</p>
      <PriceHistoryChart v-for="(run, index) in runs" :key="index" :run="run" />
      <EmptyState
        v-if="!runs.length"
        title="暂无可绘制的价格"
        description="价格未知时不会按零元绘制。"
      />
      <p v-if="data.records.length === 1">
        当前仅有一条有效记录，暂无涨跌变化。
      </p>
      <h2>记录明细</h2>
      <p v-if="manage">
        更正保留原记录时间；删除后用户不再看到该值。唯一记录只能更正。
      </p>
      <ol class="records">
        <li v-for="entry in records.slice(0, shown)" :key="entry.id">
          <strong>{{ recordedPrice(entry.price, entry.priceUnit) }}</strong>
          <span
            >{{ formatTime(entry.recordedAt)
            }}{{ entry.origin === 'baseline' ? ' · 上线起点' : ''
            }}{{ entry.carriedForward ? ' · 区间前沿用' : '' }}</span
          >
          <div v-if="manage" class="row-actions">
            <button
              class="button-ink"
              type="button"
              :disabled="writing"
              @click="open(entry, 'edit')"
            >
              更正
            </button>
            <button
              class="button-ink"
              type="button"
              :disabled="writing || data.totalRecords === 1"
              @click="open(entry, 'delete')"
            >
              删除
            </button>
          </div>
        </li>
      </ol>
      <button
        v-if="shown < records.length"
        type="button"
        class="button-ink"
        @click="shown += 20"
      >
        显示更早记录
      </button>
    </template>
    <ElDialog
      class="price-history-dialog"
      :model-value="!!dialog"
      title="管理价格记录"
      width="min(92vw, 480px)"
      :close-on-click-modal="false"
      :close-on-press-escape="!writing"
      :show-close="!writing"
      @update:model-value="
        (open) => {
          if (!open && !writing) dialog = null;
        }
      "
    >
      <template v-if="dialog">
        <p>
          {{ formatTime(dialog.entry.recordedAt) }} ·
          {{ recordedPrice(dialog.entry.price, dialog.entry.priceUnit) }}
        </p>
        <p v-if="dialog.latest">
          这会同步修改菜品当前价格和单位。删除最新记录将恢复为剩余最新记录。
        </p>
        <p v-else>此操作只更正历史记录，当前价格保持原值。</p>
        <p v-if="dialog.action === 'delete'">
          确认删除这条历史值？用户将不再看到它，内部操作审计会保留。
        </p>
        <template v-else>
          <label
            >更正金额（元，留空为未知）<input
              v-model="form.price"
              inputmode="decimal"
              :disabled="writing"
          /></label>
          <label
            >计价单位<select v-model="form.priceUnit" :disabled="writing">
              <option
                v-for="(label, value) in PRICE_UNITS"
                :key="value"
                :value="value"
              >
                {{ label }}
              </option>
            </select></label
          >
          <p>原记录时间保持不变。</p>
        </template>
        <p v-if="mutationError" role="alert">{{ mutationError }}</p>
        <div class="row-actions">
          <button
            type="button"
            class="button-ink"
            :disabled="writing"
            @click="dialog = null"
          >
            取消
          </button>
          <button
            v-if="mutationError"
            type="button"
            class="button-ink"
            :disabled="writing"
            @click="
              dialog = null;
              load();
            "
          >
            刷新记录
          </button>
          <button
            type="button"
            class="button-ink is-primary"
            :disabled="writing"
            @click="submit"
          >
            {{ writing ? '保存中…' : '确认' }}
          </button>
        </div>
      </template>
    </ElDialog>
  </main>
</template>
<style scoped lang="scss">
.price-history {
  max-width: 900px;
  margin: auto;
  padding: 16px;
  display: grid;
  gap: 16px;
  overflow-wrap: anywhere;
}
.price-history > * {
  min-width: 0;
}
.ranges,
.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
button,
input,
select {
  min-height: 44px;
}
.records {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}
.records li {
  display: grid;
  gap: 8px;
  border-bottom: 1px dashed var(--ft-color-border);
  padding-bottom: 12px;
}
.current {
  font-size: 1.25rem;
  font-weight: 700;
}
label {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

:global(.el-dialog.price-history-dialog) {
  font-size: max(16px, 1rem);
  --el-font-size-base: max(16px, 1rem);
  --el-dialog-content-font-size: max(16px, 1rem);
  --el-dialog-title-font-size: max(18px, 1.125rem);
  max-height: calc(100dvh - 32px);
  margin: 16px auto;
  display: flex;
  flex-direction: column;
}
:global(.price-history-dialog .el-dialog__body) {
  font-size: max(16px, 1rem);
  min-height: 0;
  overflow-y: auto;
}
:global(.price-history-dialog .el-dialog__title) {
  font-size: max(18px, 1.125rem);
}
:global(.price-history-dialog input),
:global(.price-history-dialog select),
:global(.price-history-dialog .row-actions button) {
  font: inherit;
}
</style>
