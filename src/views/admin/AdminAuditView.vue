<script setup>
import { ref, watch } from 'vue';
import { fetchAuditItems, submitAudit } from '@/api/admin-audit.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { formatTime, statusLabels } from '@/utils/recordLabels.js';
import { formatPrice } from '@/utils/mediaUrl.js';
import { validatePrice } from '@/utils/submissionValidation.js';
import MediaImage from '@/components/base/MediaImage.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
const status = ref('pending');
const labels = { review: '点评', dish: '菜品', stall: '档口', photo: '图片' };
const { items, page, total, size, loading, error, load } = usePagedData(
  (page, options) => fetchAuditItems(status.value, page, options),
);
const selected = ref(null);
const reason = ref('');
const price = ref('');
const writing = ref(false);
const failure = ref('');
const notice = ref('');
watch(status, () => {
  selected.value = null;
  notice.value = '';
  if (page.value !== 1) page.value = 1;
  else load();
});
function choose(row, action) {
  selected.value = { ...row, action };
  reason.value = '';
  price.value = row.price === null ? '' : String(row.price ?? '');
  failure.value = '';
  notice.value = '';
}
async function submit() {
  if (writing.value || !selected.value) return;
  const row = selected.value;
  failure.value = '';
  if (row.action === 'reject' && !reason.value.trim()) {
    failure.value = '驳回须填写审核原因';
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
    await submitAudit(row.type, row.id, {
      action: row.action,
      reason: reason.value.trim() || null,
      ...(row.type === 'dish' && row.action === 'approve'
        ? { price: Number(price.value) }
        : {}),
    });
    selected.value = null;
    notice.value = row.action === 'approve' ? '审核已通过' : '已驳回';
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
        <p>目标 ID：{{ row.targetId }} · 投稿者 ID：{{ row.userId }}</p>
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
        <p v-if="row.reason" class="text">审核说明：{{ row.reason }}</p>
        <div v-if="row.status === 'pending'">
          <form
            v-if="selected?.id === row.id && selected?.type === row.type"
            @submit.prevent="submit"
          >
            <strong
              >{{ selected.action === 'approve' ? '通过' : '驳回' }}这条{{
                labels[row.type]
              }}投稿</strong
            >
            <label v-if="row.type === 'dish' && selected.action === 'approve'"
              >正式价格<input
                v-model="price"
                inputmode="decimal"
                :disabled="writing"
            /></label>
            <label
              >审核说明{{
                selected.action === 'reject' ? '（必填）' : '（选填）'
              }}<textarea v-model="reason" :disabled="writing" rows="3" />
            </label>
            <p v-if="failure" role="alert">{{ failure }}</p>
            <div>
              <button
                type="button"
                :disabled="writing"
                @click="selected = null"
              >
                取消</button
              ><button type="submit" :disabled="writing">
                {{ writing ? '审核中…' : '确认审核' }}
              </button>
            </div>
          </form>
          <div v-else>
            <button :disabled="writing" @click="choose(row, 'approve')">
              通过</button
            ><button :disabled="writing" @click="choose(row, 'reject')">
              驳回
            </button>
          </div>
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
  clip-path: polygon(
    0 2%,
    7% 0,
    15% 2%,
    26% 0,
    38% 2%,
    52% 0,
    66% 2%,
    79% 0,
    91% 2%,
    100% 0,
    100% 100%,
    0 100%
  );
}
article:nth-of-type(even) {
  transform: rotate(0.35deg);
}
article:nth-of-type(odd) {
  transform: rotate(-0.25deg);
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
