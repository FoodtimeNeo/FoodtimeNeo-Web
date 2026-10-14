<script setup>
defineProps({
  modelValue: { type: Object, required: true },
  canteens: { type: Array, default: () => [] },
  stalls: { type: Array, default: () => [] },
  dishes: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

function updateTarget(modelValue, patch) {
  emit('update:modelValue', { ...modelValue, ...patch });
}
</script>

<template>
  <div class="target-picker" aria-label="点评目标">
    <label>
      <span>食堂</span>
      <select
        :value="modelValue.canteenId"
        :disabled="loading"
        @change="
          updateTarget(modelValue, {
            canteenId: $event.target.value,
            stallId: '',
            dishId: '',
          })
        "
      >
        <option value="">请选择食堂</option>
        <option
          v-for="canteen in canteens"
          :key="canteen.id"
          :value="canteen.id"
        >
          {{ canteen.name }}
        </option>
      </select>
    </label>

    <label>
      <span>档口</span>
      <select
        :value="modelValue.stallId"
        :disabled="loading || !modelValue.canteenId || !stalls.length"
        @change="
          updateTarget(modelValue, {
            stallId: $event.target.value,
            dishId: '',
          })
        "
      >
        <option value="">请选择档口</option>
        <option v-for="stall in stalls" :key="stall.id" :value="stall.id">
          {{ stall.name }}
        </option>
      </select>
    </label>

    <label>
      <span>菜品</span>
      <select
        :value="modelValue.dishId"
        :disabled="loading || !modelValue.stallId || !dishes.length"
        @change="updateTarget(modelValue, { dishId: $event.target.value })"
      >
        <option value="">请选择菜品</option>
        <option v-for="dish in dishes" :key="dish.id" :value="dish.id">
          {{ dish.name }}
        </option>
      </select>
    </label>
  </div>
</template>

<style scoped lang="scss">
.target-picker {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--ft-space-2);

  label {
    display: grid;
    gap: var(--ft-space-1);
    font-weight: 700;
  }

  select {
    min-height: 44px;
    padding: 10px 12px;
    border: 2px solid var(--ft-color-text);
    border-radius: 0;
    background: var(--zine-paper-card);
    color: var(--ft-color-text);
    font: inherit;
  }

  select:focus-visible {
    outline: 2px solid var(--ft-color-primary);
    outline-offset: 2px;
  }
}

@media (max-width: 768px) {
  .target-picker {
    grid-template-columns: 1fr;
  }
}
</style>
