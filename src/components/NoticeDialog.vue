<script setup>
import { ref, watch } from 'vue';
import { ElDialog } from 'element-plus';
import { confirmNotice } from '@/api/notice.api.js';
import NoticeMarkdown from './NoticeMarkdown.vue';
import { formatTime } from '@/utils/recordLabels.js';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  notice: { type: Object, default: null },
});
const emit = defineEmits(['update:modelValue', 'confirmed']);
const dontShowAgain = ref(false);
const saving = ref(false);
const failure = ref('');
let generation = 0;
watch(
  () => [props.modelValue, props.notice?.id],
  () => {
    generation++;
    dontShowAgain.value = false;
    saving.value = false;
    failure.value = '';
  },
  { flush: 'sync' },
);

function close() {
  if (!saving.value) emit('update:modelValue', false);
}
async function confirm() {
  if (saving.value || !props.notice?.id) return;
  const ticket = generation,
    id = props.notice.id;
  saving.value = true;
  failure.value = '';
  try {
    await confirmNotice(id, dontShowAgain.value);
    if (ticket !== generation) return;
    emit('confirmed', id);
    emit('update:modelValue', false);
  } catch (error) {
    if (ticket === generation)
      failure.value = error.message || '确认失败，请重试';
  } finally {
    if (ticket === generation) saving.value = false;
  }
}
</script>

<template>
  <ElDialog
    :model-value="modelValue"
    class="notice-dialog"
    title="系统公告"
    destroy-on-close
    append-to-body
    :width="'min(640px, 94vw)'"
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    @close="close"
  >
    <article v-if="notice">
      <p class="notice-dialog__meta">
        {{ formatTime(notice.createdTime || notice.publishedAt) }}
      </p>
      <div class="notice-dialog__reader" tabindex="0" aria-label="公告正文">
        <NoticeMarkdown :content="notice.content" />
      </div>
      <p v-if="failure" class="notice-dialog__error" role="alert">
        {{ failure }}
      </p>
    </article>
    <template #footer>
      <div class="notice-dialog__footer">
        <label class="notice-dialog__choice">
          <input v-model="dontShowAgain" type="checkbox" :disabled="saving" />
          下次不再显示
        </label>
        <button
          type="button"
          class="notice-dialog__confirm"
          :disabled="saving"
          @click="confirm"
        >
          {{ saving ? '保存中…' : '确认' }}
        </button>
      </div>
    </template>
  </ElDialog>
</template>

<style scoped>
.notice-dialog__meta {
  color: var(--ft-color-text-muted);
  font-size: 13px;
}
.notice-dialog__reader {
  max-height: 58dvh;
  overflow-y: auto;
  padding: 4px 8px 8px 0;
}
.notice-dialog__reader:focus-visible {
  outline: 2px solid var(--ft-color-primary);
  outline-offset: 2px;
}
.notice-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.notice-dialog__choice {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  cursor: pointer;
}
.notice-dialog__choice input {
  width: 20px;
  height: 20px;
  accent-color: var(--ft-color-primary);
}
.notice-dialog__confirm {
  min-height: 44px;
  min-width: 88px;
  padding: 8px 20px;
  border: 1px solid var(--ft-color-text);
  background: var(--ft-color-primary);
  color: #fff;
  cursor: pointer;
}
.notice-dialog__confirm:focus-visible,
.notice-dialog__choice input:focus-visible {
  outline: 2px solid var(--ft-color-text);
  outline-offset: 3px;
}
.notice-dialog__confirm:disabled {
  opacity: 0.6;
  cursor: wait;
}
.notice-dialog__error {
  color: var(--ft-color-danger);
}
</style>
