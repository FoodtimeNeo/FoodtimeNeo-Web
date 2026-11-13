<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
const props = defineProps({
  page: { type: Number, required: true },
  total: { type: Number, required: true },
  size: { type: Number, default: 20 },
  disabled: Boolean,
});
const emit = defineEmits(['change']);
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.size)));
const strip = ref(null);
const capacity = ref(5);
const numberWidth = ref(44);
const numbers = computed(() => {
  const count = Math.min(pages.value, capacity.value);
  const start = Math.max(
    1,
    Math.min(props.page - Math.floor(count / 2), pages.value - count + 1),
  );
  return Array.from({ length: count }, (_, index) => start + index);
});
function change(page) {
  if (
    !props.disabled &&
    page >= 1 &&
    page <= pages.value &&
    page !== props.page
  )
    emit('change', page);
}
let observer;
function measure() {
  if (!strip.value?.clientWidth) return;
  const fontSize =
    Number.parseFloat(getComputedStyle(strip.value).fontSize) || 16;
  const width = strip.value.clientWidth;
  for (
    let count = Math.min(
      pages.value,
      Math.max(1, Math.floor((width + 8) / 52)),
    );
    count >= 1;
    count--
  ) {
    const start = Math.max(
      1,
      Math.min(props.page - Math.floor(count / 2), pages.value - count + 1),
    );
    const itemWidth = Math.max(
      44,
      Math.ceil(String(start + count - 1).length * fontSize * 0.7 + 20),
    );
    if (count === 1 || count * itemWidth + (count - 1) * 8 <= width) {
      numberWidth.value = itemWidth;
      capacity.value = count;
      break;
    }
  }
}
onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure);
    observer.observe(strip.value);
  }
  measure();
});
onBeforeUnmount(() => observer?.disconnect());
watch([pages, () => props.page], measure, { flush: 'post' });
</script>
<template>
  <nav class="pagination" aria-label="分页">
    <div
      ref="strip"
      class="pagination__numbers"
      :style="{ '--page-width': `${numberWidth}px` }"
    >
      <button
        v-for="number in numbers"
        :key="number"
        type="button"
        :aria-label="`第 ${number} 页`"
        :aria-current="number === page ? 'page' : undefined"
        :disabled="disabled"
        @click="change(number)"
      >
        {{ number }}
      </button>
    </div>
    <div class="pagination__actions">
      <button
        type="button"
        :disabled="disabled || page <= 1"
        @click="change(1)"
      >
        首页
      </button>
      <button
        type="button"
        :disabled="disabled || page <= 1"
        @click="change(page - 1)"
      >
        上一页
      </button>
      <button
        type="button"
        :disabled="disabled || page >= pages"
        @click="change(page + 1)"
      >
        下一页
      </button>
      <button
        type="button"
        :disabled="disabled || page >= pages"
        @click="change(pages)"
      >
        末页
      </button>
    </div>
    <span aria-live="polite"
      >第 {{ page }} / {{ pages }} 页 · {{ total }} 条</span
    >
  </nav>
</template>
<style scoped>
.pagination {
  display: grid;
  min-width: 0;
  gap: 12px;
  margin: 24px 0;
}
button {
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  cursor: pointer;
  color: var(--ft-color-text);
  font: inherit;
  border-radius: 12px;
}
.pagination__numbers,
.pagination__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pagination__numbers button {
  width: var(--page-width);
  padding: 8px 4px;
}
.pagination__actions button {
  padding: 8px 10px;
}
button[aria-current='page'] {
  color: var(--zine-paper-card);
  background: var(--ft-color-primary);
  font-weight: 700;
}
button:focus-visible {
  outline: 2px solid var(--ft-color-primary);
  outline-offset: 3px;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
