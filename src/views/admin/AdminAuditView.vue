<script setup>
import { ref, watch } from 'vue';
import {
  fetchCommunityAudit,
  fetchCommunityAuditDetail,
  submitCommunityAudit,
  removeCommunityAsAdmin,
} from '@/api/community.api.js';
import CommunityImageViewer from '@/components/community/CommunityImageViewer.vue';
import { fetchAuditItems, submitAudit } from '@/api/admin-audit.api.js';
import { removeReviewReplyAsAdmin } from '@/api/review.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { formatTime, statusLabels } from '@/utils/recordLabels.js';
import { formatPrice } from '@/utils/mediaUrl.js';
import { validatePrice } from '@/utils/submissionValidation.js';
import MediaImage from '@/components/base/MediaImage.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import AiVerdict from '@/components/base/AiVerdict.vue';
const status = ref('pending');
const channel = ref('catalog'),
  details = ref(null),
  detailLoading = ref(false);
const communityType = (row) =>
  row.type === 'community-post' ? 'posts' : 'comments';
const labels = {
  review: '点评',
  dish: '菜品',
  stall: '档口',
  photo: '图片',
  'dish-review-reply': '点评回复',
  'community-post': '社区食记',
  'community-comment': '社区评论／回复',
};
const { items, page, total, size, loading, error, load } = usePagedData(
  (page, options) =>
    channel.value === 'catalog'
      ? fetchAuditItems(status.value, page, options)
      : fetchCommunityAudit(channel.value, status.value, page, options),
);
const selected = ref(null);
const reason = ref('');
const price = ref('');
const writing = ref(false);
const failure = ref('');
const notice = ref('');
watch([status, channel], () => {
  details.value = null;
  selected.value = null;
  notice.value = '';
  if (page.value !== 1) page.value = 1;
  else load();
});
async function choose(row, action) {
  details.value = null;
  selected.value = { ...row, action };
  reason.value = '';
  price.value = row.price === null ? '' : String(row.price ?? '');
  failure.value = '';
  notice.value = '';
  if (row.type.startsWith('community-')) {
    detailLoading.value = true;
    try {
      const result = await fetchCommunityAuditDetail(
        communityType(row),
        row.id,
      );
      if (selected.value?.id === row.id && selected.value?.type === row.type)
        details.value = result;
    } catch (e) {
      failure.value = e.message || '完整审核内容加载失败';
    } finally {
      detailLoading.value = false;
    }
  }
}
async function submit() {
  if (writing.value || !selected.value) return;
  const row = selected.value;
  if (
    row.type.startsWith('community-') &&
    (detailLoading.value || !details.value)
  ) {
    failure.value = '请先加载完整内容再审核';
    return;
  }
  failure.value = '';
  if (['reject', 'remove'].includes(row.action) && !reason.value.trim()) {
    failure.value =
      row.action === 'remove' ? '删除须填写原因' : '驳回须填写审核原因';
    return;
  }
  if (
    row.type === 'dish' &&
    row.action === 'approve' &&
    validatePrice(price.value, { required: true })
  ) {
    failure.value = validatePrice(price.value, { required: true });
    return;
  }
  writing.value = true;
  try {
    if (row.type.startsWith('community-')) {
      if (row.action === 'remove')
        await removeCommunityAsAdmin(
          communityType(row),
          row.id,
          reason.value.trim(),
        );
      else
        await submitCommunityAudit(communityType(row), row.id, {
          action: row.action,
          reason: reason.value.trim() || null,
        });
    } else if (row.action === 'remove')
      await removeReviewReplyAsAdmin(row.id, reason.value.trim());
    else
      await submitAudit(row.type, row.id, {
        action: row.action,
        reason: reason.value.trim() || null,
        ...(row.type === 'dish' && row.action === 'approve'
          ? { price: Number(price.value) }
          : {}),
      });
    selected.value = null;
    notice.value =
      row.action === 'remove'
        ? '内容已下架'
        : row.action === 'approve'
          ? '审核已通过'
          : '已驳回';
    if (items.value.length === 1 && page.value > 1) page.value--;
    else await load();
  } catch (error) {
    failure.value = error.message || '审核失败，请确认结果后再试';
  } finally {
    writing.value = false;
  }
}
</script>
<template>
  <section class="audit">
    <h2 class="section-title">内容审核</h2>
    <label
      >审核状态<select v-model="status" :disabled="writing">
        <option
          v-for="key in ['pending', 'approved', 'rejected']"
          :key="key"
          :value="key"
        >
          {{ statusLabels[key] }}
        </option>
      </select></label
    >
    <label
      >审核范围<select v-model="channel" :disabled="writing">
        <option value="catalog">菜品与点评</option>
        <option value="posts">社区食记</option>
        <option value="comments">社区评论与回复</option>
      </select></label
    >
    <p v-if="notice" role="status">{{ notice }}</p>
    <LoadingState v-if="loading" /><ErrorState
      v-else-if="error"
      :description="error.message"
      @retry="load"
    /><EmptyState v-else-if="!items.length" title="暂无审核记录" />
    <template v-else>
      <article v-for="row in items" :key="row.type + row.id">
        <h3>{{ labels[row.type] }} · {{ row.name || row.id }}</h3>
        <p>{{ statusLabels[row.status] }}</p>
        <p>ID：{{ row.id }}</p>
        <p>投稿者：{{ row.userDisplayName || row.userId }}</p>
        <p>提交时间：{{ formatTime(row.createdAt) }}</p>
        <p v-if="row.rating">评分：{{ row.rating }} / 5</p>
        <p v-if="row.content" class="text">{{ row.content }}</p>
        <p v-if="row.type === 'dish'">{{ formatPrice(row.price) }}</p>
        <MediaImage
          v-if="row.imageUrl"
          :src="row.imageUrl"
          alt="待审核图片"
          class="photo"
        />
        <AiVerdict
          v-if="
            [
              'review',
              'photo',
              'dish-review-reply',
              'community-post',
              'community-comment',
            ].includes(row.type)
          "
          :risk-level="row.aiRiskLevel"
          :confidence="row.aiConfidence"
          :labels="row.aiLabels"
          :reason="row.aiReason"
          :checked-at="row.aiCheckedAt"
        />
        <p v-if="row.reason" class="text">审核说明：{{ row.reason }}</p>
        <div
          v-if="
            row.status === 'pending' ||
            ([
              'dish-review-reply',
              'community-post',
              'community-comment',
            ].includes(row.type) &&
              row.status === 'approved')
          "
        >
          <form
            v-if="selected?.id === row.id && selected?.type === row.type"
            @submit.prevent="submit"
          >
            <template v-if="row.type.startsWith('community-')">
              <p v-if="detailLoading" role="status">完整内容加载中…</p>
              <section
                v-if="details"
                class="community-review-context"
                aria-label="完整社区审核内容"
              >
                <h4>{{ details.post.title }}</h4>
                <p class="text">{{ details.post.content }}</p>
                <CommunityImageViewer
                  :images="details.post.images"
                  :alt="details.post.title"
                />
                <template v-if="details.comment">
                  <blockquote v-if="details.rootComment">
                    一级评论：{{
                      details.rootComment.deleted
                        ? '已删除'
                        : details.rootComment.content
                    }}
                  </blockquote>
                  <blockquote v-if="details.replyToComment">
                    实际回复对象：{{ details.replyToComment.userDisplayName }} ·
                    {{
                      details.replyToComment.deleted
                        ? '已删除'
                        : details.replyToComment.content
                    }}
                  </blockquote>
                  <h4>
                    本次待审核{{
                      details.comment.rootCommentId ? '回复' : '评论'
                    }}
                  </h4>
                  <p class="text">{{ details.comment.content }}</p>
                </template>
              </section>
              <button
                v-else-if="!detailLoading"
                type="button"
                @click="choose(row, selected.action)"
              >
                重试加载完整内容
              </button>
            </template>
            <strong
              >{{
                selected.action === 'remove'
                  ? '删除'
                  : selected.action === 'approve'
                    ? '通过'
                    : '驳回'
              }}这条{{ labels[row.type] }}投稿</strong
            >
            <label v-if="row.type === 'dish' && selected.action === 'approve'"
              >正式价格<input
                v-model="price"
                inputmode="decimal"
                :disabled="writing"
            /></label>
            <label
              >审核说明{{
                selected.action !== 'approve' ? '（必填）' : '（选填）'
              }}<textarea
                v-model="reason"
                :disabled="writing"
                rows="3"
                maxlength="500"
              />
            </label>
            <p v-if="failure" role="alert">{{ failure }}</p>
            <div>
              <button
                type="button"
                :disabled="writing"
                @click="selected = null"
              >
                取消</button
              ><button
                type="submit"
                :disabled="
                  writing ||
                  detailLoading ||
                  (row.type.startsWith('community-') && !details)
                "
              >
                {{
                  writing
                    ? '处理中…'
                    : selected.action === 'remove'
                      ? '确认删除'
                      : '确认审核'
                }}
              </button>
            </div>
          </form>
          <div v-else-if="row.status === 'pending'">
            <button :disabled="writing" @click="choose(row, 'approve')">
              通过</button
            ><button :disabled="writing" @click="choose(row, 'reject')">
              驳回
            </button>
          </div>
          <button v-else :disabled="writing" @click="choose(row, 'remove')">
            {{
              row.type.startsWith('community-')
                ? '下架违规社区内容'
                : '删除违规回复'
            }}
          </button>
        </div>
      </article>
    </template>
    <PaginationControls
      :page="page"
      :total="total"
      :size="size"
      :disabled="loading || writing"
      @change="
        selected = null;
        page = $event;
      "
    />
  </section>
</template>
<style scoped>
.audit {
  max-width: 1000px;
  margin: auto;
  overflow-wrap: anywhere;
}
.audit > .section-title {
  margin-bottom: 14px;
}
.audit > label {
  display: inline-grid;
  gap: 6px;
  min-width: min(100%, 260px);
  margin-bottom: 12px;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}
.audit > label::before {
  content: '审核筛选';
  color: var(--zine-stamp-red);
  font-family: var(--zine-handwriting-font);
  font-size: 18px;
}
article {
  padding: 20px;
  margin: 20px 0;
  background: var(--zine-paper-card);
  border: 1px solid var(--ft-color-secondary);
  box-shadow: 4px 5px 0 rgb(58 36 24 / 14%);
  clip-path: none;
}
article:nth-of-type(even) {
  transform: none;
}
article:nth-of-type(odd) {
  transform: none;
}
article > p {
  margin: 8px 0;
  color: var(--ft-color-text-muted);
}
h3 {
  font-family: var(--ft-font-family-title);
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.08;
  color: var(--ft-color-secondary);
}
.text {
  white-space: pre-wrap;
}
.photo {
  width: min(100%, 480px);
  height: 270px;
  margin: 16px 0;
  border: 6px solid #fffaf0;
  box-shadow: 3px 4px 0 rgb(58 36 24 / 18%);
  transform: rotate(-1deg);
}
form,
label {
  display: grid;
  gap: 8px;
}
form {
  gap: 16px;
  margin-top: 16px;
  padding: 16px;
  border: 1px dashed var(--ft-color-secondary);
  background: var(--zine-paper-card-alt);
}
form strong {
  color: var(--zine-stamp-red);
  font-family: var(--zine-handwriting-font);
  font-size: 20px;
}
button,
select,
input,
textarea {
  padding: 10px;
  min-height: 44px;
  border: 1px solid var(--ft-color-secondary);
  background: #fffaf0;
}
button {
  margin: 8px 12px 0 0;
  border-color: var(--ft-color-secondary);
  box-shadow: 2px 2px 0 var(--ft-color-secondary);
  color: var(--ft-color-secondary);
  font-weight: 700;
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: var(--ft-color-secondary);
  color: #fffaf0;
  transform: translate(-1px, -1px);
}
[role='status'] {
  display: inline-block;
  padding: 6px 12px;
  border: 2px solid var(--zine-stamp-blue);
  color: var(--zine-stamp-blue);
  font-family: var(--zine-handwriting-font);
  transform: rotate(-2deg);
}
[role='alert'] {
  color: var(--ft-color-danger);
  font-weight: 700;
}
@media (max-width: 560px) {
  article,
  article:nth-of-type(even),
  article:nth-of-type(odd) {
    padding: 16px;
    box-shadow: var(--app-mobile-shadow);
    transform: none;
  }
  .photo {
    height: auto;
    aspect-ratio: 16 / 10;
    object-fit: cover;
  }
}
</style>
