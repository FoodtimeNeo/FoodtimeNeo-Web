<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { ElDialog } from 'element-plus';
import {
  fetchCommunityAudit,
  fetchCommunityAuditDetail,
  submitCommunityAudit,
  removeCommunityAsAdmin,
} from '@/api/community.api.js';
import {
  fetchVenueAuditDetail,
  removeVenueAsAdmin,
} from '@/api/venue-review.api.js';
import { fetchAuditItems, submitAudit } from '@/api/admin-audit.api.js';
import { removeReviewReplyAsAdmin } from '@/api/review.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { statusLabels } from '@/utils/recordLabels.js';
import { validatePrice } from '@/utils/submissionValidation.js';
import AuditContent from '@/components/admin/AuditContent.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';

const status = ref('pending'),
  channel = ref('catalog');
const ranges = [
  ['hall-review', '餐厅点评'],
  ['stall-review', '档口点评'],
  ['hall-review-reply', '餐厅点评回复'],
  ['stall-review-reply', '档口点评回复'],
  ['catalog', '食堂投稿（全部）'],
  ['dish', '新菜品'],
  ['photo', '菜品图片'],
  ['review', '点评'],
  ['dish-review-reply', '点评回复'],
  ['stall', '档口'],
  ['posts', '社区食记'],
  ['comments', '社区评论与回复'],
];
const labels = {
  'hall-review': '餐厅点评',
  'stall-review': '档口点评',
  'hall-review-reply': '餐厅点评回复',
  'stall-review-reply': '档口点评回复',
  review: '点评',
  dish: '菜品',
  stall: '档口',
  photo: '图片',
  'dish-review-reply': '点评回复',
  'community-post': '社区食记',
  'community-comment': '社区评论／回复',
};
const communityType = (row) =>
  row.type === 'community-post' ? 'posts' : 'comments';
const isVenue = (row) =>
  [
    'hall-review',
    'stall-review',
    'hall-review-reply',
    'stall-review-reply',
  ].includes(row?.type);
const isCommunity = (row) => row?.type.startsWith('community-');
const { items, page, total, size, loading, error, load, cancel } = usePagedData(
  (number, options) =>
    ['posts', 'comments'].includes(channel.value)
      ? fetchCommunityAudit(channel.value, status.value, number, options)
      : fetchAuditItems(
          status.value,
          number,
          options,
          channel.value === 'catalog' ? undefined : channel.value,
        ),
);
const selected = ref(null),
  details = ref(null),
  detailLoading = ref(false),
  detailFailure = ref('');
const reason = ref(''),
  price = ref(''),
  writing = ref(false),
  failure = ref(''),
  errorField = ref(''),
  notice = ref('');
const drafts = new Map();
let detailVersion = 0,
  detailController,
  active = true,
  scrollAfterLoad = false;
const form = ref(null),
  failureSummary = ref(null),
  resultsHeading = ref(null);
const canRemove = (row) =>
  row?.status === 'approved' &&
  [
    'hall-review',
    'stall-review',
    'hall-review-reply',
    'stall-review-reply',
    'dish-review-reply',
    'community-post',
    'community-comment',
  ].includes(row.type);
const deciding = computed(
  () => selected.value && selected.value.action !== 'inspect',
);
const dialogTitle = computed(() =>
  selected.value
    ? `${labels[selected.value.type] || '投稿'} · ${selected.value.name || '审核详情'}`
    : '审核详情',
);
const needsReason = computed(
  () =>
    selected.value?.action === 'reject' ||
    (selected.value?.action === 'remove' && !isCommunity(selected.value)),
);
const key = (row) => `${row.type}:${row.id}`;

function resetDetails() {
  detailVersion++;
  detailController?.abort();
  details.value = null;
  detailFailure.value = '';
  detailLoading.value = false;
}
function closeSelection() {
  if (writing.value) return;
  if (selected.value)
    drafts.set(key(selected.value), {
      reason: reason.value,
      price: price.value,
    });
  selected.value = null;
  resetDetails();
  failure.value = '';
  errorField.value = '';
}
function filter(kind, value) {
  const target = kind === 'status' ? status : channel;
  if (writing.value || target.value === value) return;
  cancel();
  closeSelection();
  notice.value = '';
  scrollAfterLoad = true;
  target.value = value;
  if (page.value !== 1) page.value = 1;
  else load();
}
function changePage(value) {
  if (writing.value || loading.value || page.value === value) return;
  cancel();
  closeSelection();
  notice.value = '';
  scrollAfterLoad = true;
  page.value = value;
}
watch([loading, error, total], () => {
  if (
    !loading.value &&
    !error.value &&
    page.value > Math.max(1, Math.ceil(total.value / size.value))
  ) {
    page.value = Math.max(1, Math.ceil(total.value / size.value));
    return;
  }
  if (!loading.value && !error.value && scrollAfterLoad) {
    scrollAfterLoad = false;
    nextTick(() => {
      if (active && !loading.value)
        resultsHeading.value?.scrollIntoView?.({ block: 'start' });
    });
  }
});
async function loadDetails(row) {
  resetDetails();
  if (!isCommunity(row) && !isVenue(row)) return;
  const ticket = detailVersion;
  detailController = new AbortController();
  detailLoading.value = true;
  try {
    const result = isVenue(row)
      ? await fetchVenueAuditDetail(row.type, row.id, {
          signal: detailController.signal,
        })
      : await fetchCommunityAuditDetail(communityType(row), row.id, {
          signal: detailController.signal,
        });
    if (
      active &&
      ticket === detailVersion &&
      selected.value &&
      key(selected.value) === key(row)
    )
      details.value = result;
  } catch (e) {
    if (
      active &&
      ticket === detailVersion &&
      e.code !== 'CANCELLED' &&
      e.name !== 'AbortError'
    )
      detailFailure.value = e.message || '完整审核内容加载失败';
  } finally {
    if (active && ticket === detailVersion) detailLoading.value = false;
  }
}
function choose(row, action = 'inspect') {
  if (writing.value) return;
  closeSelection();
  selected.value = { ...row, action };
  const saved = drafts.get(key(row));
  reason.value = saved?.reason ?? '';
  price.value = saved?.price ?? String(row.price ?? '');
  failure.value = '';
  errorField.value = '';
  notice.value = '';
  loadDetails(row);
}
function action(value) {
  if (!writing.value && selected.value) {
    selected.value.action = value;
    failure.value = '';
    errorField.value = '';
  }
}
function refresh() {
  if (!writing.value) {
    closeSelection();
    load();
  }
}
async function invalid(message, field = '') {
  failure.value = message;
  errorField.value = field;
  await nextTick();
  if (field) form.value?.querySelector(`#audit-${field}`)?.focus();
  else failureSummary.value?.focus();
}
async function submit() {
  if (writing.value || !selected.value || !deciding.value) return;
  const row = selected.value;
  if (
    (isCommunity(row) || isVenue(row)) &&
    (detailLoading.value || !details.value)
  )
    return invalid('请先加载完整内容再审核');
  failure.value = '';
  errorField.value = '';
  if (needsReason.value && !reason.value.trim())
    return invalid(
      row.action === 'remove' ? '删除须填写原因' : '驳回须填写审核原因',
      'reason',
    );
  if (row.type === 'dish' && row.action === 'approve') {
    const message = validatePrice(price.value.trim(), { required: true });
    if (message) return invalid(message, 'price');
  }
  writing.value = true;
  try {
    if (isCommunity(row)) {
      if (row.action === 'remove')
        await removeCommunityAsAdmin(communityType(row), row.id);
      else
        await submitCommunityAudit(communityType(row), row.id, {
          action: row.action,
          reason: reason.value.trim() || null,
          ...(communityType(row) === 'posts'
            ? {
                contentRevision:
                  details.value?.post?.contentRevision ?? row.contentRevision,
              }
            : {}),
        });
    } else if (isVenue(row) && row.action === 'remove')
      await removeVenueAsAdmin(
        row.type.endsWith('-reply')
          ? row.id
          : details.value?.submission?.reviewId,
        reason.value.trim(),
        row.type.endsWith('-reply'),
      );
    else if (row.action === 'remove')
      await removeReviewReplyAsAdmin(row.id, reason.value.trim());
    else
      await submitAudit(row.type, row.id, {
        action: row.action,
        reason: reason.value.trim() || null,
        ...(row.type === 'dish' && row.action === 'approve'
          ? { price: Number(price.value.trim()) }
          : {}),
      });
    if (!active) return;
    drafts.delete(key(row));
    selected.value = null;
    resetDetails();
    notice.value =
      row.action === 'remove'
        ? '内容已下架'
        : row.action === 'approve'
          ? '审核已通过'
          : '已驳回';
    if (items.value.length === 1 && page.value > 1) page.value--;
    else await load();
  } catch (e) {
    if (active) await invalid(e.message || '审核失败，请确认结果后再试');
  } finally {
    writing.value = false;
  }
}
onBeforeUnmount(() => {
  active = false;
  resetDetails();
});
</script>

<template>
  <section class="audit">
    <header class="audit__heading">
      <div>
        <h2 class="section-title">内容审核</h2>
        <p>按类型查看投稿，打开完整内容后确认审核。</p>
      </div>
      <button type="button" :disabled="loading || writing" @click="refresh">
        {{ loading ? '加载中…' : '刷新列表' }}
      </button>
    </header>
    <div class="audit__filters">
      <fieldset>
        <legend>审核状态</legend>
        <div class="audit__choices">
          <button
            v-for="value in ['pending', 'approved', 'rejected']"
            :key="value"
            type="button"
            :aria-pressed="status === value"
            :disabled="writing"
            @click="filter('status', value)"
          >
            {{ statusLabels[value] }}
          </button>
        </div>
      </fieldset>
      <fieldset>
        <legend>内容类型</legend>
        <div class="audit__choices">
          <button
            v-for="[value, label] in ranges"
            :key="value"
            type="button"
            :aria-pressed="channel === value"
            :disabled="writing"
            @click="filter('channel', value)"
          >
            {{ label }}
          </button>
        </div>
      </fieldset>
    </div>
    <p v-if="notice" class="audit__notice" role="status">
      {{ notice }}{{ error ? '，但列表更新失败，请刷新列表核对。' : '' }}
    </p>
    <p ref="resultsHeading" class="audit__summary" aria-live="polite">
      {{ statusLabels[status] }} ·
      {{ ranges.find(([value]) => value === channel)?.[1]
      }}<template v-if="!loading && !error"> · 共 {{ total }} 条</template>
    </p>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <EmptyState v-else-if="!items.length" title="当前筛选下暂无审核记录" />
    <template v-else>
      <article v-for="row in items" :key="key(row)" class="audit-card">
        <header>
          <h3>
            {{ labels[row.type] || '投稿' }} · {{ row.name || '未命名投稿' }}
          </h3>
          <span class="audit-card__status">{{ statusLabels[row.status] }}</span>
        </header>
        <AuditContent :row="row" />
        <div class="audit__actions">
          <button type="button" :disabled="writing" @click="choose(row)">
            查看完整内容
          </button>
          <template v-if="row.status === 'pending'">
            <button
              type="button"
              :disabled="writing"
              @click="choose(row, 'approve')"
            >
              通过
            </button>
            <button
              type="button"
              :disabled="writing"
              @click="choose(row, 'reject')"
            >
              驳回
            </button>
          </template>
          <button
            v-else-if="canRemove(row)"
            type="button"
            :disabled="writing"
            @click="choose(row, 'remove')"
          >
            {{
              isCommunity(row)
                ? '下架违规社区内容'
                : isVenue(row)
                  ? '下架违规内容'
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
      @change="changePage"
    />
  </section>
  <ElDialog
    :model-value="Boolean(selected)"
    class="audit-dialog"
    :title="dialogTitle"
    width="min(880px, calc(100vw - 24px))"
    top="16px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="!writing"
    :show-close="!writing"
    @update:model-value="
      (value) => {
        if (!value) closeSelection();
      }
    "
  >
    <div v-if="selected" class="audit-dialog__body">
      <AuditContent :row="selected" :details="details" full />
      <p v-if="detailLoading" role="status">完整内容加载中…</p>
      <div
        v-else-if="detailFailure"
        class="audit-dialog__detail-error"
        role="alert"
      >
        <p>{{ detailFailure }}</p>
        <button type="button" @click="loadDetails(selected)">
          重试加载完整内容
        </button>
      </div>
      <form
        v-if="deciding"
        id="audit-decision"
        ref="form"
        @submit.prevent="submit"
      >
        <h3>
          {{
            selected.action === 'approve'
              ? '确认通过'
              : selected.action === 'reject'
                ? '确认驳回'
                : '确认下架'
          }}这条{{ labels[selected.type] }}投稿
        </h3>
        <label
          v-if="selected.type === 'dish' && selected.action === 'approve'"
          for="audit-price"
          >正式价格（元，必填）<input
            id="audit-price"
            v-model="price"
            inputmode="decimal"
            :disabled="writing"
            :aria-invalid="errorField === 'price'"
            :aria-describedby="
              errorField === 'price' ? 'audit-failure' : undefined
            "
        /></label>
        <label
          v-if="!(isCommunity(selected) && selected.action === 'remove')"
          for="audit-reason"
          >审核说明{{ needsReason ? '（必填）' : '（选填）'
          }}<textarea
            id="audit-reason"
            v-model="reason"
            :disabled="writing"
            :aria-invalid="errorField === 'reason'"
            :aria-describedby="
              errorField === 'reason' ? 'audit-failure' : undefined
            "
            rows="3"
            maxlength="500"
          />
        </label>
        <p v-if="selected.action === 'remove'">
          确认后内容将停止公开展示，请核对后操作。
        </p>
      </form>
      <div
        v-if="failure"
        id="audit-failure"
        ref="failureSummary"
        class="audit-dialog__failure"
        role="alert"
        tabindex="-1"
      >
        <p>{{ failure }}</p>
        <button type="button" :disabled="writing" @click="refresh">
          关闭并刷新审核列表
        </button>
      </div>
    </div>
    <template #footer>
      <div v-if="selected" class="audit-dialog__footer">
        <span>{{ writing ? '正在提交，请稍候…' : '核对内容后再确认' }}</span>
        <div class="audit__actions">
          <button type="button" :disabled="writing" @click="closeSelection">
            {{ deciding ? '取消' : '关闭' }}
          </button>
          <template v-if="!deciding && selected.status === 'pending'">
            <button
              type="button"
              :disabled="
                detailLoading ||
                ((isCommunity(selected) || isVenue(selected)) && !details)
              "
              @click="action('approve')"
            >
              通过此投稿
            </button>
            <button
              type="button"
              :disabled="
                detailLoading ||
                ((isCommunity(selected) || isVenue(selected)) && !details)
              "
              @click="action('reject')"
            >
              驳回此投稿
            </button>
          </template>
          <button
            v-else-if="deciding"
            type="submit"
            form="audit-decision"
            class="audit-confirm"
            :disabled="
              writing ||
              detailLoading ||
              ((isCommunity(selected) || isVenue(selected)) && !details)
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
      </div>
    </template>
  </ElDialog>
</template>

<style scoped>
.audit {
  max-width: 1100px;
  margin: auto;
  overflow-wrap: anywhere;
}
.audit__heading,
.audit-card > header,
.audit-dialog__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.audit__heading p,
.audit__summary {
  color: var(--ft-color-text-muted);
  margin: 4px 0 8px;
  font-size: var(--ft-font-size-sm);
}
.audit__summary {
  scroll-margin-top: 120px;
}
.audit__filters {
  display: grid;
  gap: 8px;
  padding: 12px;
  margin: 10px 0;
  border: 1px solid var(--ft-color-border);
  background: var(--zine-paper-card-alt);
}
fieldset {
  display: flow-root;
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}
legend {
  float: left;
  width: 80px;
  padding: 5px 0;
  font-size: var(--ft-font-size-sm);
  font-weight: 700;
}
.audit__choices {
  margin-left: 80px;
}
.audit__choices,
.audit__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.audit button,
.audit-dialog__body button,
.audit-dialog__footer button {
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  color: var(--ft-color-text);
  cursor: pointer;
  font: inherit;
}
.audit button:hover:not(:disabled),
.audit-dialog__footer button:hover:not(:disabled) {
  background: var(--ft-color-surface-ink);
}
.audit button[aria-pressed='true'] {
  color: var(--zine-paper-card);
  background: var(--ft-color-secondary);
  box-shadow: 2px 2px 0 var(--ft-color-primary);
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--ft-color-primary);
  outline-offset: 3px;
}
.audit__notice {
  padding: 12px;
  border-left: 3px solid var(--ft-color-accent);
  background: var(--zine-paper-card-alt);
}
.audit-card {
  padding: 12px 14px;
  margin: 10px 0;
  background: var(--zine-paper-card);
  border: 1px solid var(--ft-color-secondary);
  box-shadow: 2px 2px 0 var(--zine-paper-shadow);
}
.audit-card > header {
  margin-bottom: 6px;
}
.audit-card h3 {
  font: 700 18px/1.4 var(--ft-font-family-title);
  margin: 0;
  overflow-wrap: anywhere;
}
.audit-card__status {
  color: var(--ft-color-text-muted);
  padding: 4px 8px;
  border: 1px dashed var(--ft-color-border);
}
.audit-card .audit__actions {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--ft-color-border);
}
.audit-dialog__body {
  overflow-wrap: anywhere;
}
.audit-dialog__body form {
  display: grid;
  gap: 16px;
  margin-top: 20px;
  padding: 16px;
  background: var(--zine-paper-card-alt);
  border: 1px dashed var(--ft-color-secondary);
}
.audit-dialog__body h3 {
  margin: 0;
}
.audit-dialog__body label {
  display: grid;
  gap: 8px;
}
.audit-dialog__body input,
.audit-dialog__body textarea {
  min-width: 0;
  width: 100%;
  min-height: 44px;
  padding: 10px;
  font: inherit;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  color: var(--ft-color-text);
  box-sizing: border-box;
}
.audit-dialog__body [aria-invalid='true'] {
  border-color: var(--ft-color-danger);
}
.audit-dialog__failure,
.audit-dialog__detail-error {
  color: var(--ft-color-danger);
}
.audit-dialog__footer {
  text-align: left;
}
.audit-dialog__footer > span {
  color: var(--ft-color-text-muted);
}
.audit-dialog__footer .audit-confirm {
  background: var(--ft-color-primary);
  color: var(--zine-paper-card);
  border-color: var(--ft-color-primary);
}
.audit-dialog__footer .audit-confirm:hover:not(:disabled) {
  background: var(--ft-color-primary-strong);
}
:global(.audit-dialog) {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 32px);
  padding: 0;
  margin-bottom: 16px;
  --el-dialog-bg-color: var(--zine-paper-card);
  border: 1px solid var(--ft-color-secondary);
}
:global(.audit-dialog .el-dialog__header) {
  padding: 20px 48px 16px 20px;
  margin: 0;
  flex-shrink: 0;
}
:global(.audit-dialog .el-dialog__title) {
  color: var(--ft-color-text);
  font-family: var(--ft-font-family-title);
  overflow-wrap: anywhere;
}
:global(.audit-dialog .el-dialog__body) {
  padding: 0 20px 20px;
  overflow-y: auto;
  min-height: 0;
  scrollbar-gutter: stable;
}
:global(.audit-dialog .el-dialog__footer) {
  padding: 16px 20px;
  border-top: 1px solid var(--ft-color-border);
  background: var(--zine-paper-card);
  flex-shrink: 0;
}
@media (max-width: 560px) {
  legend {
    float: none;
    width: auto;
    padding: 0 0 6px;
  }
  .audit__choices {
    margin-left: 0;
  }
  .audit__filters,
  .audit-card {
    padding: 14px;
  }
  .audit-dialog__footer {
    gap: 8px;
  }
  .audit-dialog__footer > span {
    display: none;
  }
}
@media (min-width: 769px) and (pointer: fine) {
  .audit button {
    min-height: 36px;
    padding: 5px 12px;
    font-size: var(--ft-font-size-sm);
  }
}
</style>
