<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '@/store/useAuthStore.js';
import * as api from '@/api/venue-review.api.js';
import { formatTime } from '@/utils/recordLabels.js';
import CommentLikeButton from '@/components/dish/CommentLikeButton.vue';
const props = defineProps({ review: { type: Object, required: true } }),
  emit = defineEmits(['changed']);
const auth = useAuthStore(),
  owner = auth.user?.id;
const expanded = ref(false),
  loaded = ref(false),
  loading = ref(false),
  posting = ref(false),
  rows = ref([]),
  privateRows = ref([]),
  total = ref(props.review.replyCount || 0),
  next = ref(null),
  mineNext = ref(null),
  hasMore = ref(false),
  mineMore = ref(false),
  text = ref(''),
  target = ref(null),
  error = ref(''),
  editing = ref(false),
  notice = ref(''),
  selectedDelete = ref(null),
  deleteReason = ref(''),
  removing = ref(false);
const canWrite = computed(
  () => auth.user?.id === owner && auth.role !== 'visitor',
);
let alive = true,
  timer,
  deadline = 0,
  operation = null,
  reloadQueued = false;
const controller = new AbortController();
const current = () => alive && auth.user?.id === owner;
function merge(list) {
  return Array.from(new Map(list.map((r) => [r.id, r])).values());
}
async function load(more = false, ownMore = false) {
  if (loading.value) {
    if (!more && !ownMore) reloadQueued = true;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const [pub, own] = await Promise.allSettled([
      api.fetchVenueReplies(
        props.review.id,
        more ? next.value || '' : '',
        false,
        { signal: controller.signal },
      ),
      api.fetchVenueReplies(
        props.review.id,
        ownMore ? mineNext.value || '' : '',
        true,
        { signal: controller.signal },
      ),
    ]);
    if (!current()) return;
    if (pub.status === 'fulfilled') {
      rows.value = merge([...(more ? rows.value : []), ...pub.value.items]);
      total.value = pub.value.total;
      next.value = pub.value.nextCursor;
      hasMore.value = pub.value.hasMore;
      loaded.value = true;
    } else error.value = pub.reason.message || '回复加载失败';
    if (own.status === 'fulfilled') {
      privateRows.value = merge([
        ...(ownMore ? privateRows.value : []),
        ...own.value.items,
      ]);
      mineNext.value = own.value.nextCursor;
      mineMore.value = own.value.hasMore;
    } else error.value = own.reason.message || '本人回复状态读取失败';
    schedule();
  } catch (e) {
    if (current()) error.value = e.message || '回复加载失败';
  } finally {
    if (current()) {
      loading.value = false;
      if (reloadQueued) {
        reloadQueued = false;
        load();
      }
    }
  }
}
function toggle() {
  expanded.value = !expanded.value;
  if (expanded.value && !loaded.value) load();
  if (!expanded.value) {
    clearTimeout(timer);
    timer = null;
  } else schedule();
}
function schedule() {
  if (
    timer ||
    !expanded.value ||
    document.hidden ||
    !current() ||
    !privateRows.value.some((r) => r.status === 'pending')
  )
    return;
  if (!deadline) deadline = Date.now() + 30000;
  if (Date.now() >= deadline) return;
  timer = setTimeout(async () => {
    timer = null;
    let changed = false;
    const pending = privateRows.value.filter((r) => r.status === 'pending');
    for (const row of pending) {
      if (!current() || document.hidden || !expanded.value) return;
      try {
        const state = await api.fetchVenueReplyStatus(row.id, {
          signal: controller.signal,
        });
        if (!current()) return;
        if (state.status !== 'pending') {
          changed = true;
          privateRows.value = privateRows.value
            .map((r) => (r.id === row.id ? state : r))
            .filter((r) => r.status !== 'approved');
        }
      } catch (e) {
        if (current()) error.value = e.message || '审核状态暂未更新';
        return;
      }
    }
    if (changed) {
      await load();
      emit('changed');
    }
    schedule();
  }, 2000);
}
function choose(row = null) {
  target.value = row;
  editing.value = true;
  error.value = '';
}
async function submit() {
  if (posting.value || !canWrite.value) return;
  const content = text.value.trim();
  if (!content || [...content].length > 500) {
    error.value = '请输入1–500字的回复';
    return;
  }
  const payload = { content, replyToId: target.value?.id || null },
    signature = JSON.stringify(payload);
  if (!operation || operation.signature !== signature)
    operation = { signature, id: crypto.randomUUID() };
  posting.value = true;
  error.value = '';
  try {
    const created = await api.submitVenueReply(props.review.id, {
      ...payload,
      clientRequestId: operation.id,
    });
    if (!current()) return;
    if (created.status === 'pending')
      privateRows.value = merge([...privateRows.value, created]);
    text.value = '';
    target.value = null;
    operation = null;
    editing.value = false;
    notice.value = '已提交，通过前仅自己可见';
    deadline = 0;
    expanded.value = true;
    await load();
    schedule();
    emit('changed');
  } catch (e) {
    if (current()) error.value = e.message || '提交失败，请确认本人记录后重试';
  } finally {
    if (current()) posting.value = false;
  }
}
async function remove() {
  if (removing.value || !selectedDelete.value) return;
  const { row, admin } = selectedDelete.value;
  if (admin && !deleteReason.value.trim()) {
    error.value = '下架须填写原因';
    return;
  }
  removing.value = true;
  try {
    if (admin)
      await api.removeVenueAsAdmin(row.id, deleteReason.value.trim(), true);
    else await api.deleteVenueReply(row.id);
    if (!current()) return;
    selectedDelete.value = null;
    await load();
    emit('changed');
  } catch (e) {
    if (current()) error.value = e.message || '删除失败';
  } finally {
    if (current()) removing.value = false;
  }
}
function visibility() {
  clearTimeout(timer);
  timer = null;
  if (!document.hidden && expanded.value) {
    deadline = 0;
    load();
  }
}
onMounted(() => document.addEventListener('visibilitychange', visibility));
onBeforeUnmount(() => {
  alive = false;
  controller.abort();
  clearTimeout(timer);
  document.removeEventListener('visibilitychange', visibility);
});
</script>
<template>
  <section class="venue-replies" aria-label="评论回复">
    <div class="venue-replies__toolbar">
      <slot name="actions" /><button
        class="review-action"
        type="button"
        :aria-expanded="expanded"
        @click="toggle"
      >
        {{ expanded ? '收起回复' : '回复' }} · {{ total }}
      </button>
    </div>
    <div v-show="expanded" class="venue-replies__body">
      <div class="venue-replies__toolbar">
        <strong>回复 {{ total }}</strong
        ><button
          class="review-action"
          type="button"
          :disabled="loading"
          @click="
            deadline = 0;
            load();
          "
        >
          刷新
        </button>
      </div>
      <p v-if="notice" role="status">{{ notice }}</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <p v-if="loading" role="status">正在读取回复…</p>
      <div v-for="row in rows" :key="row.id" class="venue-replies__row">
        <strong>{{ row.userDisplayName }}</strong
        ><span v-if="row.replyToId">
          回复
          {{
            row.replyToDeleted
              ? '已删除的回复'
              : row.replyToUserDisplayName || '同学'
          }}</span
        >
        <p>{{ row.content }}</p>
        <div class="venue-replies__toolbar">
          <time>{{ formatTime(row.createdAt) }}</time
          ><CommentLikeButton
            :target="row"
            :save="(liked) => api.likeVenueReply(row.id, liked)"
          /><button
            v-if="canWrite"
            class="review-action"
            type="button"
            @click="choose(row)"
          >
            回复这条</button
          ><button
            v-if="row.ownedByMe"
            class="review-action"
            type="button"
            @click="selectedDelete = { row, admin: false }"
          >
            删除</button
          ><button
            v-if="auth.isAdmin"
            class="review-action"
            type="button"
            @click="
              selectedDelete = { row, admin: true };
              deleteReason = '';
            "
          >
            下架
          </button>
        </div>
      </div>
      <button
        v-if="hasMore"
        class="review-action"
        type="button"
        :disabled="loading"
        @click="load(true)"
      >
        更多公开回复
      </button>
      <div
        v-for="row in privateRows"
        :key="`private:${row.id}`"
        class="venue-replies__row venue-replies__private"
        data-private-reply
      >
        <strong>{{ row.userDisplayName }} · 我</strong
        ><span v-if="row.replyToId">
          回复
          {{
            row.replyToDeleted
              ? '已删除的回复'
              : row.replyToUserDisplayName || '同学'
          }}</span
        >
        <p>{{ row.content }}</p>
        <p class="venue-page__muted">
          {{ row.status === 'pending' ? '审核中' : '未通过' }} · 仅自己可见
        </p>
        <p v-if="row.reviewReason">审核说明：{{ row.reviewReason }}</p>
        <time>{{ formatTime(row.createdAt) }}</time
        ><button
          class="review-action"
          type="button"
          @click="selectedDelete = { row, admin: false }"
        >
          删除
        </button>
      </div>
      <button
        v-if="mineMore"
        class="review-action"
        type="button"
        :disabled="loading"
        @click="load(false, true)"
      >
        更多我的待审回复
      </button>
      <p v-if="loaded && !rows.length && !privateRows.length">
        暂无回复，来聊聊吧。
      </p>
      <template v-if="canWrite"
        ><button
          v-if="!editing"
          class="review-action"
          type="button"
          @click="choose()"
        >
          写下你的回复…
        </button>
        <form v-else @submit.prevent="submit">
          <p v-if="target">
            回复 {{ target.userDisplayName }}
            <button class="review-action" type="button" @click="target = null">
              取消回复对象
            </button>
          </p>
          <label :for="`venue-reply-${review.id}`">回复内容（最多500字）</label
          ><textarea
            :id="`venue-reply-${review.id}`"
            v-model="text"
            :disabled="posting"
            rows="3"
          />
          <div class="venue-replies__toolbar">
            <button
              class="button-ink is-primary"
              type="submit"
              :disabled="posting"
            >
              {{ posting ? '提交中…' : '提交回复' }}</button
            ><button
              class="review-action"
              type="button"
              :disabled="posting"
              @click="editing = false"
            >
              收起编辑
            </button>
          </div>
        </form></template
      >
      <div v-if="selectedDelete" role="group" aria-label="确认删除回复">
        <p>确认{{ selectedDelete.admin ? '下架' : '删除' }}这条回复？</p>
        <label v-if="selectedDelete.admin"
          >原因（必填）<textarea
            v-model="deleteReason"
            maxlength="500"
          /></label
        ><button
          type="button"
          :disabled="removing"
          @click="selectedDelete = null"
        >
          取消</button
        ><button type="button" :disabled="removing" @click="remove">
          确认删除
        </button>
      </div>
    </div>
  </section>
</template>
