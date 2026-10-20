<script setup>
import { computed } from 'vue';
import { formatTime } from '@/utils/recordLabels.js';
// AI 分诊结论展示：只读参考，不改变任何审核动作。无结论时显示占位。
const props = defineProps({
  riskLevel: { type: String, default: null },
  confidence: { type: [Number, null], default: null },
  labels: { type: Array, default: null },
  reason: { type: String, default: null },
  checkedAt: { type: String, default: null },
});
const tone = computed(() =>
  props.riskLevel === 'HIGH'
    ? 'red'
    : props.riskLevel === 'MEDIUM'
      ? 'blue'
      : 'green',
);
const percent = computed(() =>
  typeof props.confidence === 'number'
    ? `${Math.round(props.confidence * 100)}%`
    : null,
);
</script>

<template>
  <p v-if="!riskLevel" class="ai-verdict ai-verdict--empty">
    AI 分诊：暂无结论
  </p>
  <div v-else class="ai-verdict" :data-tone="tone">
    <p>
      AI 分诊：<strong>{{ riskLevel }}</strong
      ><span v-if="percent"> · 置信度 {{ percent }}</span>
    </p>
    <p v-if="labels && labels.length">标签：{{ labels.join('、') }}</p>
    <p v-if="reason">说明：{{ reason }}</p>
    <p v-if="checkedAt">诊断时间：{{ formatTime(checkedAt) }}</p>
  </div>
</template>

<style scoped>
.ai-verdict {
  margin: 8px 0;
  padding: 8px 12px;
  border: 1px dashed var(--ft-color-secondary);
  background: var(--zine-paper-card-alt);
  color: var(--ft-color-text-muted);
}
.ai-verdict--empty {
  margin: 8px 0;
  color: var(--ft-color-text-muted);
}
.ai-verdict[data-tone='red'] strong {
  color: var(--ft-color-danger);
}
.ai-verdict[data-tone='blue'] strong {
  color: var(--zine-stamp-blue);
}
.ai-verdict[data-tone='green'] strong {
  color: var(--ft-color-success, #2e7d32);
}
.ai-verdict > p {
  margin: 4px 0;
}
</style>
