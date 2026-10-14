<script setup>
import { computed } from 'vue';
const props = defineProps({
  page: { type: Number, required: true },
  total: { type: Number, required: true },
  size: { type: Number, default: 20 },
  disabled: Boolean,
});
const emit = defineEmits(['change']);
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.size)));
</script>
<template>
  <nav class="pagination" aria-label="分页">
    <button
      type="button"
      :disabled="disabled || page <= 1"
      @click="emit('change', page - 1)"
    >
      上一页
    </button>
    <span aria-live="polite"
      >第 {{ page }} / {{ pages }} 页 · {{ total }} 条</span
    >
    <button
      type="button"
      :disabled="disabled || page >= pages"
      @click="emit('change', page + 1)"
    >
      下一页
    </button>
  </nav>
</template>
<style scoped>
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 24px 0;
}
button {
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  cursor: pointer;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
