<script setup>
import { ref } from 'vue';
import { usePagedData } from '@/composables/usePagedData.js';
import {
  fetchMyVenueReviews,
  deleteVenueReview,
  deleteVenueReply,
} from '@/api/venue-review.api.js';
import { formatTime } from '@/utils/recordLabels.js';
import BackLink from '@/components/base/BackLink.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import LoadingState from '@/components/base/LoadingState.vue';
const kind = ref(''),
  replies = ref(false),
  selected = ref(null),
  busy = ref(false),
  actionError = ref('');
const { items, page, total, size, loading, error, load } = usePagedData(
  (number, options) =>
    fetchMyVenueReviews(
      number,
      kind.value || undefined,
      replies.value,
      options,
    ),
);
function filter() {
  selected.value = null;
  if (page.value !== 1) page.value = 1;
  else load();
}
async function remove() {
  if (busy.value || !selected.value) return;
  busy.value = true;
  actionError.value = '';
  try {
    if (replies.value) await deleteVenueReply(selected.value.id);
    else await deleteVenueReview(selected.value.id);
    selected.value = null;
    await load();
  } catch (e) {
    actionError.value = e.message;
  } finally {
    busy.value = false;
  }
}
const labels = {
  pending: '审核中 · 仅自己可见',
  approved: '已通过',
  rejected: '未通过 · 仅自己可见',
  invalidated: '已失效',
};
</script>
<template>
  <main class="venue-page">
    <BackLink />
    <h1 class="section-title">我的餐厅与档口点评</h1>
    <div class="venue-page__toolbar">
      <label
        >对象
        <select v-model="kind" :disabled="loading || busy" @change="filter">
          <option value="">全部</option>
          <option value="hall">餐厅</option>
          <option value="stall">档口</option>
        </select></label
      ><label
        ><input
          v-model="replies"
          type="checkbox"
          :disabled="loading || busy"
          @change="filter"
        />
        查看我的回复</label
      >
    </div>
    <LoadingState v-if="loading" />
    <p v-if="error" role="alert">
      {{ error.message }} <button type="button" @click="load">重试</button>
    </p>
    <p v-if="!loading && !items.length">暂无记录。</p>
    <article
      v-for="row in items"
      :key="row.submissionId || row.id"
      class="venue-review"
    >
      <header>
        <RouterLink
          :to="{
            name: 'venueReviews',
            params: { type: row.targetType, targetId: row.targetId },
          }"
          >{{ row.name }}</RouterLink
        ><span>{{ labels[row.status] || row.status }}</span>
      </header>
      <p v-if="row.rating">{{ row.rating }} / 5 分</p>
      <p class="venue-review__content">{{ row.content }}</p>
      <p v-if="row.reviewReason">审核说明：{{ row.reviewReason }}</p>
      <time>{{ formatTime(row.createdAt) }}</time
      ><RouterLink
        v-if="!replies && row.status !== 'pending'"
        class="review-action"
        :to="{
          name: 'venueReviewCreate',
          params: { type: row.targetType, targetId: row.targetId },
          query: { edit: '1' },
        }"
        >修改评价</RouterLink
      ><button
        v-if="replies || row.status === 'approved'"
        class="review-action"
        type="button"
        @click="selected = row"
      >
        删除
      </button>
    </article>
    <div v-if="selected" role="group" aria-label="确认删除记录">
      <p>确认删除？</p>
      <p v-if="actionError" role="alert">{{ actionError }}</p>
      <button type="button" :disabled="busy" @click="selected = null">
        取消</button
      ><button type="button" :disabled="busy" @click="remove">确认删除</button>
    </div>
    <PaginationControls
      v-if="total > size"
      :page="page"
      :total="total"
      :size="size"
      :disabled="loading || busy"
      @change="page = $event"
    />
  </main>
</template>
<style src="@/assets/styles/venue-reviews.css"></style>
