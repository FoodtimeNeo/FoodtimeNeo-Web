<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElDialog } from 'element-plus';
import { markNoticeRead } from '@/api/notice.api.js';
import { formatTime } from '@/utils/recordLabels.js';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  notice: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['update:modelValue', 'read']);

const router = useRouter();
const reading = ref(false);
const readError = ref('');

function close() {
  emit('update:modelValue', false);
}

function goInbox() {
  close();
  router.push({ name: 'inboxView' });
}

// 打开详情即标记已读；成功后通知外层刷新未读数。
watch(
  () => props.modelValue,
  async (open) => {
    if (!open || !props.notice?.id || props.notice?.isRead) return;
    reading.value = true;
    readError.value = '';
    try {
      await markNoticeRead(props.notice.id);
      emit('read', props.notice.id);
    } catch (error) {
      readError.value = error.message || '标记已读失败';
    } finally {
      reading.value = false;
    }
  },
);
</script>

<template>
  <ElDialog
    :model-value="modelValue"
    class="notice-dialog"
    title="系统公告"
    destroy-on-close
    append-to-body
    :width="'min(560px, 94vw)'"
    :style="{ boxSizing: 'border-box', maxWidth: 'calc(100% - 32px)' }"
    :show-close="true"
    @close="close"
  >
    <article v-if="notice" class="notice-dialog__body">
      <h2 class="notice-dialog__title">{{ notice.title }}</h2>
      <p class="notice-dialog__meta">{{ formatTime(notice.publishedAt) }}</p>
      <p class="notice-dialog__content">{{ notice.body }}</p>
      <p v-if="readError" class="notice-dialog__error" role="alert">
        {{ readError }}
      </p>
    </article>
    <template #footer>
      <div class="notice-dialog__footer">
        <button
          type="button"
          class="notice-dialog__link"
          :disabled="reading"
          @click="goInbox"
        >
          去信箱看看
        </button>
        <button
          type="button"
          class="notice-dialog__confirm"
          :disabled="reading"
          @click="close"
        >
          {{ reading ? '标记中…' : '知道了' }}
        </button>
      </div>
    </template>
  </ElDialog>
</template>

<style scoped>
.notice-dialog__title {
  margin: 0 0 8px;
  font-family: var(--ft-font-family-title);
}
.notice-dialog__meta {
  margin: 0 0 12px;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}
.notice-dialog__content {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.notice-dialog__error {
  color: var(--ft-color-danger);
}
.notice-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.notice-dialog__link,
.notice-dialog__confirm {
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  cursor: pointer;
}
.notice-dialog__confirm {
  color: #fff;
  background: var(--ft-color-primary);
}
.notice-dialog__link:disabled,
.notice-dialog__confirm:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
