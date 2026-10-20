<script setup>
import { ref } from 'vue';
import { fetchMyReviewReplies, deleteReviewReply } from '@/api/review.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import SubmissionRecord from '@/components/base/SubmissionRecord.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
const { items, page, size, total, loading, error, load } =
  usePagedData(fetchMyReviewReplies);
const selected = ref(null);
const writing = ref(false);
const failure = ref('');
async function remove() {
  if (writing.value || !selected.value) return;
  writing.value = true;
  failure.value = '';
  try {
    await deleteReviewReply(selected.value);
    selected.value = null;
    if (items.value.length === 1 && page.value > 1) page.value--;
    else await load();
  } catch (error) {
    failure.value = error.message || '删除失败，请重试';
  } finally {
    writing.value = false;
  }
}
</script>
<template>
  <section class="my-replies">
    <h1 class="section-title">我的回复</h1>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <EmptyState v-else-if="!items.length" title="暂无回复记录" />
    <SubmissionRecord
      v-for="row in items"
      :key="row.id"
      :row="row"
      kind="reply"
    >
      <p v-if="row.reviewDeleted">原点评已删除，整楼不再公开。</p>
      <RouterLink
        v-else
        :to="{
          name: 'dishDetail',
          params: {
            canteenId: row.diningHallId,
            stallId: row.stallId,
            dishId: row.dishId,
          },
        }"
        >查看菜品讨论</RouterLink
      >
      <button type="button" :disabled="writing" @click="selected = row.id">
        删除回复
      </button>
      <div v-if="selected === row.id">
        <p>确认删除这条回复？审核历史将保留。</p>
        <p v-if="failure" role="alert">{{ failure }}</p>
        <button type="button" :disabled="writing" @click="remove">
          确认删除
        </button>
        <button type="button" :disabled="writing" @click="selected = null">
          取消
        </button>
      </div>
    </SubmissionRecord>
    <PaginationControls
      :page="page"
      :size="size"
      :total="total"
      :disabled="loading || writing"
      @change="page = $event"
    />
  </section>
</template>
<style scoped>
.my-replies {
  max-width: 760px;
  margin: auto;
  padding: var(--ft-space-3);
}
button {
  min-height: 44px;
  margin: var(--ft-space-1);
}
[role='alert'] {
  color: var(--ft-color-danger);
}
</style>
