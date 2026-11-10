<script setup>
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { submitReport } from '@/api/safety.api.js';

const props = defineProps({
  targetType: { type: String, required: true },
  targetId: { type: String, required: true },
});
const busy = ref(false);

async function report() {
  if (busy.value) return;
  const { targetType, targetId } = props;
  busy.value = true;
  try {
    const prompt =
      targetType === 'message'
        ? '平台管理员会收到所选私信及举报说明。'
        : '请说明内容违反了哪些社区规则。';
    const answer = await ElMessageBox.prompt(prompt, '举报', {
      confirmButtonText: '提交举报',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputValidator: (value) =>
        (value?.trim().length > 0 && value.length <= 500) ||
        '请输入 1–500 字的举报说明',
    }).catch(() => null);
    if (!answer) return;
    await submitReport(targetType, targetId, answer.value.trim());
    ElMessage.success('举报已提交');
  } catch (failure) {
    ElMessage.error(failure.message || '举报提交失败，请重试');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <button class="report-button" type="button" :disabled="busy" @click="report">
    举报
  </button>
</template>

<style scoped>
.report-button {
  min-height: 36px;
  border: 0;
  background: transparent;
  color: var(--ft-color-muted);
  cursor: pointer;
  white-space: nowrap;
}
</style>
