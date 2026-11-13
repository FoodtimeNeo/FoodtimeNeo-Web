<script setup>
import { onScopeDispose, ref, watch } from 'vue';
import { ElMessageBox } from 'element-plus';
import {
  createFeedback,
  fetchFeedback,
  exportFeedback,
  importFeedback,
} from '@/api/feedback.api.js';
import {
  feedbackTypes,
  feedbackStatuses,
  readFeedbackCsv,
  saveFeedbackCsv,
} from '@/utils/feedback.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { formatTime } from '@/utils/recordLabels.js';
import BackLink from '@/components/base/BackLink.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';

const props = defineProps({ admin: Boolean });
const auth = useAuthStore();
const archived = ref(false),
  type = ref('function'),
  content = ref('');
const busy = ref(false),
  failure = ref(''),
  message = ref(''),
  importResult = ref(null),
  csvFile = ref(null);
let requestId = crypto.randomUUID(),
  epoch = 0;
const state = usePagedData(
  (number, options) =>
    fetchFeedback(number, archived.value, props.admin, options),
  { immediate: false },
);
watch([type, content], () => {
  requestId = crypto.randomUUID();
});
watch(
  [
    () => auth.user?.id,
    () => props.admin,
    () => (props.admin ? auth.user?.role : null),
  ],
  () => {
    epoch++;
    busy.value = false;
    state.cancel();
    state.data.value = { items: [], total: 0, page: 1, size: 20 };
    content.value = '';
    csvFile.value = null;
    failure.value = '';
    message.value = '';
    importResult.value = null;
    if (state.page.value === 1) state.load();
    else state.page.value = 1;
  },
  { immediate: true },
);
onScopeDispose(() => epoch++);
watch(archived, () => {
  if (state.page.value === 1) state.load();
  else state.page.value = 1;
});

async function perform(work) {
  if (busy.value) return;
  const ticket = epoch;
  busy.value = true;
  failure.value = '';
  message.value = '';
  importResult.value = null;
  try {
    await work(() => ticket === epoch);
  } catch (error) {
    if (ticket === epoch && !['cancel', 'close'].includes(error))
      failure.value = error?.message || '操作失败，请重试';
  } finally {
    if (ticket === epoch) busy.value = false;
  }
}
function submit() {
  if (!content.value.trim()) {
    failure.value = '请填写反馈内容';
    return;
  }
  const input = {
    type: type.value,
    content: content.value,
    clientRequestId: requestId,
  };
  perform(async (current) => {
    await createFeedback(input);
    if (!current()) return;
    content.value = '';
    message.value = '反馈已提交，可在下方查看处理进度';
    archived.value = false;
    if (state.page.value === 1) await state.load();
    else state.page.value = 1;
  });
}
function download() {
  perform(async (current) => {
    const file = await exportFeedback();
    if (!current()) return;
    saveFeedbackCsv(file);
    message.value = `已导出 ${file.count} 条未完成反馈，包含的待处理记录已标为处理中`;
    await state.load();
  });
}
function upload() {
  const file = csvFile.value;
  perform(async (current) => {
    const csv = await readFeedbackCsv(file);
    if (!current()) return;
    await ElMessageBox.confirm(
      `导入“${file.name}”中的回复和处理状态？已完成记录将跳过。`,
      '批量导入',
      { confirmButtonText: '导入', cancelButtonText: '取消' },
    );
    if (!current()) return;
    const result = await importFeedback(csv);
    if (!current()) return;
    importResult.value = result;
    message.value = `已更新 ${result.updated} 条，跳过 ${result.skipped} 条`;
    await state.load();
  });
}
</script>
<template>
  <section class="feedback-page">
    <BackLink v-if="!admin" />
    <h1 class="section-title">{{ admin ? '建议与反馈管理' : '建议与反馈' }}</h1>
    <p v-if="!admin">
      当前账号每天可提交
      {{ auth.role === 'visitor' ? 2 : 5 }} 条反馈；同设备每天合计 10 条。每天
      UTC+8 00:00 重置。
    </p>
    <form v-if="!admin" class="feedback-page__form" @submit.prevent="submit">
      <label
        >反馈类型<select v-model="type" :disabled="busy">
          <option v-for="(label, key) in feedbackTypes" :key="key" :value="key">
            {{ label }}
          </option>
        </select></label
      >
      <label
        >反馈内容<textarea
          v-model="content"
          rows="6"
          maxlength="5000"
          :disabled="busy"
          placeholder="请描述遇到的问题或你的建议，请勿填写密码等敏感信息。"
        />
      </label>
      <span>{{ content.length }} / 5000</span>
      <button class="button-ink" :disabled="busy">
        {{ busy ? '提交中…' : '提交反馈' }}
      </button>
    </form>
    <div v-else class="feedback-page__tools">
      <button class="button-ink" :disabled="busy" @click="download">
        导出未完成反馈（CSV）
      </button>
      <p>
        保留“反馈编号、反馈类型、反馈内容”，新增“回复、处理状态”两列。处理状态填写待处理、处理中或已完成；空白表示不修改。处理中由导出自动设置。请保存为
        CSV UTF-8。
      </p>
      <label
        >选择回复表格<input
          type="file"
          accept=".csv,text/csv"
          :disabled="busy"
          @change="csvFile = $event.target.files?.[0] || null"
      /></label>
      <button class="button-ink" :disabled="busy || !csvFile" @click="upload">
        导入回复与状态
      </button>
    </div>
    <p v-if="failure" role="alert">{{ failure }}</p>
    <p v-if="message" role="status">{{ message }}</p>
    <ul v-if="importResult?.issues?.length" aria-label="导入提示">
      <li v-for="(issue, index) in importResult.issues" :key="index">
        第 {{ issue.row }} 条记录：{{ issue.message }}
      </li>
    </ul>
    <nav class="feedback-page__tabs" aria-label="反馈记录分类">
      <button
        class="button-ink"
        :aria-pressed="!archived"
        :disabled="busy || state.loading.value"
        @click="archived = false"
      >
        未完成
      </button>
      <button
        class="button-ink"
        :aria-pressed="archived"
        :disabled="busy || state.loading.value"
        @click="archived = true"
      >
        已完成
      </button>
      <button
        class="button-ink"
        :disabled="busy || state.loading.value"
        @click="state.load"
      >
        刷新
      </button>
    </nav>
    <LoadingState v-if="state.loading.value" />
    <ErrorState
      v-else-if="state.error.value"
      :description="state.error.value.message"
      @retry="state.load"
    />
    <p v-else-if="!state.items.value.length">
      {{ archived ? '暂无已完成反馈' : '暂无未完成反馈' }}
    </p>
    <ul v-else class="feedback-page__records">
      <li v-for="row in state.items.value" :key="row.id">
        <div class="feedback-page__meta">
          <strong>{{ feedbackTypes[row.type] }}</strong
          ><span>{{ feedbackStatuses[row.status] }}</span
          ><time>{{ formatTime(row.createdAt) }}</time>
        </div>
        <p v-if="admin">提交人：{{ row.userDisplayName }}</p>
        <p class="feedback-page__content">{{ row.content }}</p>
        <p v-if="row.latestReply" class="feedback-page__content">
          最新回复：{{ row.latestReply }}
        </p>
        <RouterLink
          :to="{
            name: admin ? 'adminFeedbackDetail' : 'myFeedbackDetail',
            params: { feedbackId: row.id },
          }"
          >查看详情与回复历史 →</RouterLink
        >
      </li>
    </ul>
    <PaginationControls
      v-if="state.page.value > 1 || state.total.value > state.size.value"
      :page="state.page.value"
      :total="state.total.value"
      :size="state.size.value"
      :disabled="busy || state.loading.value"
      @change="state.page.value = $event"
    />
  </section>
</template>
<style scoped>
.feedback-page {
  max-width: 850px;
  margin: auto;
  padding: var(--ft-space-3);
  overflow-wrap: anywhere;
}
.feedback-page__form,
.feedback-page__tools {
  display: grid;
  gap: 12px;
  padding: 16px;
  margin: 16px 0;
  border: 1px solid var(--ft-color-border);
  background: var(--zine-paper-card);
}
label {
  display: grid;
  gap: 8px;
}
select,
textarea,
input {
  max-width: 100%;
  min-width: 0;
  font: inherit;
}
select,
textarea {
  padding: 10px;
  background: var(--zine-paper-card);
  color: var(--ft-color-text);
  border: 1px solid var(--ft-color-border);
}
.feedback-page__tabs,
.feedback-page__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 16px 0;
}
.feedback-page__tabs [aria-pressed='true'] {
  background: var(--ft-color-text);
  color: var(--zine-paper-card);
}
.feedback-page__records {
  list-style: none;
  padding: 0;
}
.feedback-page__records li {
  padding: 12px 0 20px;
  border-bottom: 1px solid var(--ft-color-border);
}
.feedback-page__content {
  white-space: pre-wrap;
}
</style>
