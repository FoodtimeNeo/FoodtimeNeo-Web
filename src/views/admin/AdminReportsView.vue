<script setup>
import { ref } from 'vue';
import { fetchReports, reviewReport } from '@/api/safety.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';

const state = usePagedData(fetchReports);
const reviewing = ref('');
const reviewError = ref('');
const labels = { post: '食记', comment: '评论', message: '私信' };

async function review(report) {
  if (reviewing.value) return;
  reviewing.value = report.id;
  reviewError.value = '';
  try {
    await reviewReport(report.id);
    if (state.items.value.length === 1 && state.page.value > 1)
      state.page.value--;
    else await state.load();
  } catch (failure) {
    reviewError.value = failure.message || '处理失败，请重试';
  } finally {
    reviewing.value = '';
  }
}
</script>

<template>
  <main class="reports">
    <h1 class="section-title">举报处理</h1>
    <p>仅平台管理员可查看。私信举报只包含当事人所选的消息。</p>
    <LoadingState v-if="state.loading.value" />
    <ErrorState
      v-else-if="state.error.value"
      :description="state.error.value.message"
      @retry="state.load"
    />
    <template v-else>
      <p v-if="reviewError" role="alert">{{ reviewError }}</p>
      <p v-if="!state.items.value.length">当前没有待处理举报。</p>
      <ul v-else>
        <li v-for="row in state.items.value" :key="row.id">
          <h2>{{ labels[row.targetType] }}</h2>
          <p>举报原因：{{ row.reason }}</p>
          <blockquote>{{ row.excerpt }}</blockquote>
          <p>被举报用户：{{ row.targetUserId }}</p>
          <RouterLink
            v-if="row.postId"
            :to="{
              name: 'communityDetail',
              params: { postId: row.postId },
              query:
                row.targetType === 'comment' ? { comment: row.targetId } : {},
            }"
          >
            查看原帖
          </RouterLink>
          <button
            class="button-ink"
            :disabled="!!reviewing"
            @click="review(row)"
          >
            标为已处理
          </button>
        </li>
      </ul>
      <PaginationControls
        v-if="state.page.value > 1 || state.total.value > state.size.value"
        :page="state.page.value"
        :total="state.total.value"
        :size="state.size.value"
        @change="state.page.value = $event"
      />
    </template>
  </main>
</template>

<style scoped>
.reports ul {
  list-style: none;
  padding: 0;
}
.reports li {
  padding: 16px 0;
  border-bottom: 1px solid var(--ft-color-text);
  overflow-wrap: anywhere;
}
.reports blockquote {
  white-space: pre-wrap;
}
.reports li a {
  margin-right: 12px;
}
</style>
