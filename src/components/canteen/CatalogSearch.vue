<script setup>
import { nextTick, ref, useId } from 'vue';

defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  placeholder: { type: String, default: '按名称搜索' },
  count: { type: Number, required: true },
  total: { type: Number, required: true },
  unit: { type: String, required: true },
});
const emit = defineEmits(['update:modelValue']);
const input = ref(null);
const id = useId();
async function clear() {
  emit('update:modelValue', '');
  await nextTick();
  input.value?.focus();
}
</script>

<template>
  <div class="catalog-search">
    <label :for="id">{{ label }}</label>
    <div class="catalog-search__field">
      <input
        :id="id"
        ref="input"
        type="search"
        :value="modelValue"
        :placeholder="placeholder"
        :aria-describedby="`${id}-count`"
        maxlength="100"
        enterkeyhint="search"
        @input="emit('update:modelValue', $event.target.value)"
        @keydown.esc.prevent="clear"
      />
      <button
        v-if="modelValue"
        type="button"
        aria-label="清除搜索关键词"
        @click="clear"
      >
        清除
      </button>
    </div>
    <p :id="`${id}-count`" role="status" aria-live="polite">
      {{ modelValue.trim() ? `找到 ${count} / ${total}` : `共 ${total}` }}
      {{ unit }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.catalog-search {
  display: grid;
  gap: var(--ft-space-1);
  margin: var(--ft-space-3) 0;
  max-width: 640px;

  label {
    font-weight: 700;
  }
  &__field {
    display: flex;
    gap: var(--ft-space-1);
  }
  input {
    width: 100%;
    min-width: 0;
    min-height: 48px;
    padding: 10px 14px;
    border: 1px solid var(--ft-color-secondary);
    border-radius: 0;
    background: var(--zine-paper-card);
    color: var(--ft-color-text);
    font: inherit;
  }
  button {
    flex-shrink: 0;
    min-height: 48px;
    padding: 8px 16px;
    border: 1px solid var(--ft-color-secondary);
    background: var(--zine-paper-card);
    color: var(--ft-color-primary);
    font: inherit;
    cursor: pointer;
  }
  p {
    margin: 0;
    color: var(--ft-color-text-muted);
    font-size: var(--ft-font-size-sm);
  }
}
</style>
