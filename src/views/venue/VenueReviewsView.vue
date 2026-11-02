<script setup>
import {
  computed,
  onMounted,
  onBeforeUnmount,
  reactive,
  ref,
  watch,
  nextTick,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/store/useAuthStore.js';
import * as api from '@/api/venue-review.api.js';
import { venueDraft } from '@/utils/venueDrafts.js';
import { formatTime } from '@/utils/recordLabels.js';
import StarRatingInput from '@/components/review/StarRatingInput.vue';
import CommentLikeButton from '@/components/dish/CommentLikeButton.vue';
import VenueReplySection from '@/components/venue/VenueReplySection.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
const route = useRoute(),
  router = useRouter(),
  auth = useAuthStore();
const type = String(route.params.type),
  targetId = String(route.params.targetId),
  owner = auth.user?.id;
const writingPage = computed(() => route.name === 'venueReviewCreate');
const form = reactive(venueDraft(owner, type, targetId));
const target = ref(null),
  items = ref([]),
  privateRow = ref(form.submitted || null),
  published = ref(null),
  rating = ref('all');
const next = ref(null),
  hasMore = ref(false),
  total = ref(0),
  loading = ref(false),
  writing = ref(false),
  error = ref(''),
  privateError = ref(''),
  message = ref('');
const selectedDelete = ref(null),
  deleteReason = ref(''),
  errorElement = ref(null),
  busyDelete = ref(false);
const canWrite = computed(() => !!auth.user && auth.role !== 'visitor');
let active = true,
  epoch = 0,
  timer,
  deadline = 0,
  reloadQueued = false;
const controller = new AbortController();
function alive(ticket) {
  return active && ticket === epoch && auth.user?.id === owner;
}
function draftSave() {
  Object.assign(venueDraft(owner, type, targetId), form);
}
watch(() => [form.rating, form.content], draftSave);
async function load(more = false) {
  if (loading.value) {
    if (!more) reloadQueued = true;
    return;
  }
  const ticket = epoch;
  loading.value = true;
  error.value = '';
  try {
    const [meta, list, mine] = await Promise.allSettled([
      api.fetchVenueRating(type, targetId, { signal: controller.signal }),
      api.fetchVenueReviews(
        type,
        targetId,
        more ? next.value || '' : '',
        rating.value,
        { signal: controller.signal },
      ),
      api.fetchOwnVenueReview(type, targetId, { signal: controller.signal }),
    ]);
    if (!alive(ticket)) return;
    if (meta.status === 'fulfilled') target.value = meta.value;
    else error.value = meta.reason.message || '评分加载失败';
    if (list.status === 'fulfilled') {
      items.value = Array.from(
        new Map(
          [...(more ? items.value : []), ...list.value.items].map((r) => [
            r.id,
            r,
          ]),
        ).values(),
      );
      total.value = list.value.total;
      next.value = list.value.nextCursor;
      hasMore.value = list.value.hasMore;
    } else error.value = list.reason.message || '点评加载失败';
    if (mine.status === 'fulfilled') {
      privateError.value = '';
      published.value = mine.value.publicVersion;
      privateRow.value = mine.value.privateSubmission;
      form.submitted = null;
      draftSave();
      const previous =
        privateRow.value?.status === 'rejected'
          ? privateRow.value
          : published.value;
      if (writingPage.value && !form.content && previous) {
        form.rating = previous.rating;
        form.content = previous.content;
      }
      if (privateRow.value?.status === 'pending') schedule();
    } else
      privateError.value = mine.reason.message || '本人审核状态暂时无法读取';
  } catch (e) {
    if (alive(ticket) && e.code !== 'CANCELLED')
      error.value = e.message || '点评加载失败';
  } finally {
    if (alive(ticket)) {
      loading.value = false;
      if (reloadQueued) {
        reloadQueued = false;
        load();
      }
    }
  }
}
function schedule() {
  if (timer || document.hidden || !active) return;
  if (!deadline) deadline = Date.now() + 30000;
  if (Date.now() >= deadline) return;
  timer = setTimeout(async () => {
    timer = null;
    const row = privateRow.value,
      ticket = epoch;
    if (!row || row.status !== 'pending' || document.hidden) return;
    try {
      const state = await api.fetchVenueStatus(row.submissionId, {
        signal: controller.signal,
      });
      if (!alive(ticket)) return;
      if (state.status !== 'pending') {
        deadline = 0;
        await load();
        return;
      }
    } catch (e) {
      if (alive(ticket)) privateError.value = e.message || '审核状态暂未更新';
      return;
    }
    schedule();
  }, 2000);
}
function visibility() {
  clearTimeout(timer);
  timer = null;
  if (!document.hidden) {
    deadline = 0;
    load();
  }
}
async function filter(value) {
  if (loading.value || rating.value === value) return;
  rating.value = value;
  next.value = null;
  await load();
}
async function submit() {
  if (writing.value || !canWrite.value || !target.value) return;
  error.value =
    !Number.isInteger(form.rating) || form.rating < 1 || form.rating > 5
      ? '请选择1–5星评分'
      : !form.content.trim()
        ? '请填写文字点评'
        : [...form.content.trim()].length > 500
          ? '文字点评不能超过500字'
          : '';
  if (error.value) {
    await nextTick();
    errorElement.value?.focus();
    return;
  }
  const payload = { rating: form.rating, content: form.content.trim() },
    signature = JSON.stringify(payload);
  if (!form.operation || form.operation.signature !== signature)
    form.operation = { signature, id: crypto.randomUUID() };
  draftSave();
  writing.value = true;
  const ticket = epoch;
  try {
    const created = await api.submitVenueReview(type, targetId, {
      ...payload,
      clientRequestId: form.operation.id,
    });
    if (!alive(ticket)) return;
    privateRow.value = created;
    form.submitted = created.status === 'pending' ? created : null;
    form.content = '';
    form.rating = 0;
    form.operation = null;
    draftSave();
    await router.replace({ name: 'venueReviews', params: { type, targetId } });
  } catch (e) {
    if (alive(ticket))
      error.value = e.message || '提交失败，请先确认本人审核记录后重试';
  } finally {
    if (alive(ticket)) writing.value = false;
  }
}
function chooseDelete(row, admin = false) {
  selectedDelete.value = { row, admin };
  deleteReason.value = '';
  error.value = '';
}
async function remove() {
  if (busyDelete.value || !selectedDelete.value) return;
  const { row, admin } = selectedDelete.value;
  if (admin && !deleteReason.value.trim()) {
    error.value = '下架须填写原因';
    return;
  }
  busyDelete.value = true;
  const ticket = epoch;
  try {
    if (admin) await api.removeVenueAsAdmin(row.id, deleteReason.value.trim());
    else await api.deleteVenueReview(row.id);
    if (!alive(ticket)) return;
    selectedDelete.value = null;
    message.value = '点评已删除';
    await load();
  } catch (e) {
    if (alive(ticket)) error.value = e.message || '删除失败';
  } finally {
    if (alive(ticket)) busyDelete.value = false;
  }
}
function detailLink() {
  return target.value?.stallId
    ? {
        name: 'stallDetail',
        params: {
          canteenId: target.value.diningHallId,
          stallId: target.value.stallId,
        },
      }
    : {
        name: 'canteenDetail',
        params: { canteenId: target.value?.diningHallId || targetId },
      };
}
onMounted(() => {
  load();
  document.addEventListener('visibilitychange', visibility);
});
onBeforeUnmount(() => {
  active = false;
  epoch++;
  controller.abort();
  clearTimeout(timer);
  document.removeEventListener('visibilitychange', visibility);
});
watch(
  () => auth.user?.id,
  (id) => {
    if (id !== owner) {
      epoch++;
      controller.abort();
      clearTimeout(timer);
      items.value = [];
      privateRow.value = null;
      published.value = null;
    }
  },
);
</script>
<template>
  <main class="venue-page">
    <RouterLink
      v-if="target"
      class="venue-page__back"
      :to="
        writingPage
          ? { name: 'venueReviews', params: { type, targetId } }
          : detailLink()
      "
      >←
      {{
        writingPage ? '返回点评' : '返回' + (type === 'hall' ? '餐厅' : '档口')
      }}</RouterLink
    >
    <h1 class="section-title">
      {{ writingPage ? '写点评' : `${target?.name || '用餐体验'} · 点评` }}
    </h1>
    <p v-if="target">
      {{ target.name }} · {{ type === 'hall' ? '餐厅' : '档口' }}整体体验
    </p>
    <LoadingState v-if="!target && loading" />
    <ErrorState v-if="error && !target" :description="error" @retry="load()" />
    <template v-if="target">
      <div class="venue-page__summary">
        <span v-if="target.averageScore !== null" class="zine-rating-stamp">{{
          Number(target.averageScore).toFixed(1)
        }}</span
        ><span v-else>暂无评分</span
        ><span>{{ target.reviewCount }} 条评价 · 满分 5 分</span>
      </div>
      <p v-if="!canWrite" class="venue-page__notice">
        访客可以浏览，绑定学校邮箱后可参与评价。
      </p>
      <template v-if="writingPage">
        <p v-if="privateRow?.status === 'pending'" class="venue-page__notice">
          已有待审核评价，请等待审核完成。<RouterLink
            :to="{ name: 'venueReviews', params: { type, targetId } }"
            >查看自己的待审内容</RouterLink
          >
        </p>
        <form v-else class="venue-page__form" @submit.prevent="submit">
          <p v-if="published" class="venue-page__notice">
            修改需重新审核，通过前原评价继续公开。
          </p>
          <StarRatingInput
            v-model="form.rating"
            :disabled="writing || !canWrite"
          />
          <label for="venue-content">文字点评（必填）</label>
          <textarea
            id="venue-content"
            v-model="form.content"
            rows="6"
            :disabled="writing || !canWrite"
            placeholder="分享真实用餐体验，最多500字"
          />
          <p class="venue-page__muted">
            {{ [...form.content].length }} / 500 · 提交后进入 AI 或人工审核
          </p>
          <p v-if="error" ref="errorElement" tabindex="-1" role="alert">
            {{ error }}
          </p>
          <button
            class="button-ink is-primary"
            type="submit"
            :disabled="writing || !canWrite"
          >
            {{ writing ? '提交中…' : '提交评价' }}
          </button>
        </form>
      </template>
      <template v-else>
        <div class="venue-page__toolbar">
          <RouterLink
            v-if="canWrite && !privateRow?.status?.includes('pending')"
            class="button-ink"
            :to="{
              name: 'venueReviewCreate',
              params: { type, targetId },
              query: published ? { edit: '1' } : {},
            }"
            >{{ published ? '修改我的评价' : '写点评' }}</RouterLink
          ><RouterLink :to="{ name: 'myVenueReviews' }"
            >我的餐厅与档口点评</RouterLink
          ><button
            class="review-action"
            type="button"
            :disabled="loading"
            @click="load()"
          >
            刷新
          </button>
        </div>
        <p v-if="message" role="status">{{ message }}</p>
        <p v-if="privateError" role="alert">
          {{ privateError }}
          <button class="review-action" type="button" @click="load()">
            重试本人状态
          </button>
        </p>
        <h2 class="section-title">
          同学们的<span class="zine-highlight">评论</span>
        </h2>
        <article
          v-if="privateRow"
          class="venue-review venue-review--private"
          data-private-review
        >
          <header>
            <strong>{{ auth.displayName }} · 我</strong
            ><span class="zine-rating-stamp">{{
              Number(privateRow.rating).toFixed(1)
            }}</span>
          </header>
          <p class="venue-review__content">{{ privateRow.content }}</p>
          <p class="venue-page__muted">
            {{ privateRow.status === 'pending' ? '审核中' : '未通过' }} ·
            仅自己可见
          </p>
          <p v-if="published" class="venue-page__muted">
            这是本次修改，原评价继续公开。
          </p>
          <p v-if="privateRow.reviewReason">
            审核说明：{{ privateRow.reviewReason }}
          </p>
          <time>{{ formatTime(privateRow.createdAt) }}</time>
          <p class="venue-page__muted">不计入公开人数、均分和筛选结果</p>
          <RouterLink
            v-if="privateRow.status === 'rejected'"
            :to="{ name: 'venueReviewCreate', params: { type, targetId } }"
            >修改后重提</RouterLink
          >
        </article>
        <div class="venue-page__toolbar" aria-label="公开评价评分筛选">
          <button
            v-for="[value, label] in [
              ['all', '全部'],
              ['5', '5 分'],
              ['4', '4 分'],
              ['1-3', '1–3 分'],
            ]"
            :key="value"
            type="button"
            class="button-ink"
            :aria-pressed="rating === value"
            :disabled="loading"
            @click="filter(value)"
          >
            {{ label }}</button
          ><span class="venue-page__muted">已公开 · 最新发布优先</span>
        </div>
        <p v-if="error" role="alert">
          {{ error }}
          <button class="review-action" type="button" @click="load()">
            重试
          </button>
        </p>
        <LoadingState v-if="loading && !items.length" />
        <p v-else-if="!items.length">暂无符合条件的已公开评价。</p>
        <article
          v-for="row in items"
          :key="row.id"
          class="venue-review"
          data-public-review
        >
          <header>
            <strong
              >{{ row.userDisplayName
              }}{{ row.ownedByMe ? ' · 我' : '' }}</strong
            ><span class="zine-rating-stamp">{{
              Number(row.rating).toFixed(1)
            }}</span>
          </header>
          <p class="venue-review__content">{{ row.content }}</p>
          <VenueReplySection :review="row" @changed="load()"
            ><template #actions
              ><time>{{ formatTime(row.createdAt) }}</time
              ><CommentLikeButton
                :target="row"
                :save="(liked) => api.likeVenueReview(row.id, liked)"
              /><button
                v-if="row.ownedByMe"
                class="review-action"
                type="button"
                @click="chooseDelete(row)"
              >
                删除</button
              ><button
                v-if="auth.isAdmin"
                class="review-action"
                type="button"
                @click="chooseDelete(row, true)"
              >
                下架
              </button></template
            ></VenueReplySection
          >
        </article>
        <p class="venue-page__muted">共 {{ total }} 条符合条件的公开评价</p>
        <button
          v-if="hasMore"
          class="button-ink"
          type="button"
          :disabled="loading"
          @click="load(true)"
        >
          加载更多
        </button>
        <div
          v-if="selectedDelete"
          class="venue-page__notice"
          role="group"
          aria-label="确认删除点评"
        >
          <p>确认{{ selectedDelete.admin ? '下架' : '删除' }}这条点评？</p>
          <label v-if="selectedDelete.admin"
            >原因（必填）<textarea
              v-model="deleteReason"
              maxlength="500"
            /></label
          ><button
            type="button"
            :disabled="busyDelete"
            @click="selectedDelete = null"
          >
            取消</button
          ><button type="button" :disabled="busyDelete" @click="remove">
            {{ busyDelete ? '处理中…' : '确认删除' }}
          </button>
        </div>
      </template>
    </template>
  </main>
</template>
<style src="@/assets/styles/venue-reviews.css"></style>
