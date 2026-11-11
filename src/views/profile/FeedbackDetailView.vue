<script setup>
import { onScopeDispose, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  fetchFeedbackDetail,
  fetchFeedbackReplies,
  replyToFeedback,
} from '@/api/feedback.api.js';
import { feedbackTypes, feedbackStatuses } from '@/utils/feedback.js';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import { formatTime } from '@/utils/recordLabels.js';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';

const props = defineProps({ admin: Boolean });
const route = useRoute(),
  auth = useAuthStore();
const detail = useAsyncData(
  (options) =>
    fetchFeedbackDetail(route.params.feedbackId, props.admin, options),
  { immediate: false },
);
const replies = usePagedData(
  (number, options) =>
    fetchFeedbackReplies(route.params.feedbackId, number, props.admin, options),
  { immediate: false },
);
const reply = ref(''),
  completed = ref(false),
  busy = ref(false),
  failure = ref(''),
  message = ref('');
let requestId = crypto.randomUUID(),
  epoch = 0;
watch([reply, completed], () => {
  requestId = crypto.randomUUID();
});
watch(
  [
    () => route.params.feedbackId,
    () => props.admin,
    () => auth.user?.id,
    () => (props.admin ? auth.user?.role : null),
  ],
  () => {
    epoch++;
    busy.value = false;
    reply.value = '';
    completed.value = false;
    failure.value = '';
    message.value = '';
    detail.cancel();
    replies.cancel();
    detail.data.value = null;
    replies.data.value = { items: [], total: 0, page: 1, size: 20 };
    detail.load();
    if (replies.page.value === 1) replies.load();
    else replies.page.value = 1;
  },
  { immediate: true },
);
onScopeDispose(() => epoch++);
async function submit() {
  if (busy.value || !detail.data.value) return;
  if (!reply.value.trim() && !completed.value) {
    failure.value = '请填写回复或勾选已完成';
    return;
  }
  const ticket = epoch,
    id = route.params.feedbackId;
  const input = {
    reply: reply.value,
    status: completed.value ? 'completed' : null,
    clientRequestId: requestId,
  };
  busy.value = true;
  failure.value = '';
  message.value = '';
  try {
    const row = await replyToFeedback(id, input);
    if (ticket !== epoch) return;
    detail.data.value = row;
    reply.value = '';
    completed.value = false;
    message.value = '处理结果已保存';
    if (replies.page.value === 1) await replies.load();
    else replies.page.value = 1;
  } catch (error) {
    if (ticket === epoch) failure.value = error.message || '保存失败，请重试';
  } finally {
    if (ticket === epoch) busy.value = false;
  }
}
</script>
<template>
  <section class="feedback-detail">
    <RouterLink :to="{ name: admin ? 'adminFeedback' : 'myFeedback' }"
      >← 返回反馈记录</RouterLink
    >
    <h1 class="section-title">反馈详情</h1>
    <LoadingState v-if="detail.loading.value" />
    <ErrorState
      v-else-if="detail.error.value"
      :description="detail.error.value.message"
      @retry="detail.load"
    />
    <template v-else-if="detail.data.value">
      <p>
        <strong>{{ feedbackTypes[detail.data.value.type] }}</strong> ·
        {{ feedbackStatuses[detail.data.value.status] }}
      </p>
      <p v-if="admin">提交人：{{ detail.data.value.userDisplayName }}</p>
      <time>{{ formatTime(detail.data.value.createdAt) }}</time>
      <p class="feedback-detail__content">{{ detail.data.value.content }}</p>
      <p v-if="failure" role="alert">{{ failure }}</p>
      <p v-if="message" role="status">{{ message }}</p>
      <form
        v-if="admin && detail.data.value.status !== 'completed'"
        @submit.prevent="submit"
      >
        <label
          >回复内容<textarea
            v-model="reply"
            rows="5"
            maxlength="5000"
            :disabled="busy"
          />
        </label>
        <label
          ><input
            v-model="completed"
            type="checkbox"
            :disabled="busy"
          />标为已完成，移入归档并从下次导出中排除</label
        >
        <button class="button-ink" :disabled="busy">
          {{ busy ? '保存中…' : '保存回复与状态' }}
        </button>
      </form>
      <h2>回复历史</h2>
      <LoadingState v-if="replies.loading.value" />
      <ErrorState
        v-else-if="replies.error.value"
        :description="replies.error.value.message"
        @retry="replies.load"
      />
      <p v-else-if="!replies.items.value.length">暂无管理员回复</p>
      <ol v-else>
        <li v-for="item in replies.items.value" :key="item.id">
          <time>{{ formatTime(item.createdAt) }}</time>
          <p class="feedback-detail__content">{{ item.content }}</p>
        </li>
      </ol>
      <PaginationControls
        v-if="
          replies.total.value > replies.size.value || replies.page.value > 1
        "
        :page="replies.page.value"
        :total="replies.total.value"
        :size="replies.size.value"
        :disabled="busy || replies.loading.value"
        @change="replies.page.value = $event"
      />
    </template>
  </section>
</template>
<style scoped>
.feedback-detail {
  max-width: 850px;
  padding: var(--ft-space-3);
  margin: auto;
  overflow-wrap: anywhere;
}
.feedback-detail__content {
  white-space: pre-wrap;
}
form {
  display: grid;
  gap: 12px;
  padding: 16px;
  background: var(--zine-paper-card);
  border: 1px solid var(--ft-color-border);
}
label {
  display: block;
}
textarea {
  display: block;
  width: 100%;
  box-sizing: border-box;
  font: inherit;
  background: var(--zine-paper-card);
  color: var(--ft-color-text);
  padding: 10px;
}
li {
  padding: 12px 0;
  border-bottom: 1px solid var(--ft-color-border);
}
</style>
