<script setup>
import { ref } from 'vue';
import { fetchDishFavorite, setDishFavorite } from '@/api/dish.api.js';
import { useAsyncData } from '@/composables/useAsyncData.js';

const props = defineProps({ dishId: { type: String, required: true } });
const state = useAsyncData((options) =>
  fetchDishFavorite(props.dishId, options),
);
const pending = ref(false);
const error = ref('');

async function toggle() {
  if (!state.data.value || pending.value) return;
  pending.value = true;
  error.value = '';
  try {
    state.data.value = await setDishFavorite(
      props.dishId,
      !state.data.value.saved,
    );
  } catch (failure) {
    error.value = failure.message || '收藏操作失败，请重试';
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div class="dish-favorite">
    <button
      v-if="state.data.value"
      class="button-ink"
      type="button"
      :disabled="pending"
      :aria-pressed="state.data.value.saved"
      @click="toggle"
    >
      {{ state.data.value.saved ? '已想吃' : '想吃' }}
    </button>
    <button v-else-if="state.error.value" type="button" @click="state.load">
      重试收藏状态
    </button>
    <span v-else aria-live="polite">正在读取收藏…</span>
    <p v-if="error" role="alert">{{ error }}</p>
  </div>
</template>
