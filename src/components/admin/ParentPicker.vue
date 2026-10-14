<script setup>
import { useId } from 'vue';
import { fetchManagedItems } from '@/api/admin-manage.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { statusLabels } from '@/utils/recordLabels.js';
import PaginationControls from '@/components/base/PaginationControls.vue';
import ErrorState from '@/components/base/ErrorState.vue';
const props = defineProps({
  type: { type: String, required: true },
  modelValue: { type: String, default: '' },
  disabled: Boolean,
  label: { type: String, default: '所属记录' },
  optional: Boolean,
});
const emit = defineEmits(['update:modelValue']);
const id = useId();
const { items, page, total, size, loading, error, load } = usePagedData(
  (page, options) => fetchManagedItems(props.type, page, '', options),
);
</script>
<template>
  <div>
    <label :for="id">{{ label }}</label>
    <select
      :id="id"
      :value="modelValue"
      :disabled="disabled || loading"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option value="">{{ optional ? '全部' : '请选择' }}</option>
      <option
        v-if="modelValue && !items.some((row) => row.id === modelValue)"
        :value="modelValue"
      >
        {{ modelValue }}（已选）
      </option>
      <option v-for="row in items" :key="row.id" :value="row.id">
        {{ row.name }} · {{ statusLabels[row.status] }} · {{ row.id }}
      </option>
    </select>
    <ErrorState v-if="error" :description="error.message" @retry="load" />
    <PaginationControls
      :page="page"
      :total="total"
      :size="size"
      :disabled="disabled || loading"
      @change="page = $event"
    />
  </div>
</template>
<style scoped>
label {
  display: block;
  margin-bottom: 8px;
}
select {
  width: 100%;
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
}
</style>
