<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { paginationItems } from '@/utils/pagination.js';
const props = defineProps({
  page: { type: Number, required: true },
  total: { type: Number, required: true },
  size: { type: Number, default: 20 },
  disabled: Boolean,
});
const emit = defineEmits(['change']);
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.size)));
const strip = ref(null),
  windowSize = ref(5),
  fontSize = ref(16);
const items = computed(() =>
  paginationItems(props.page, pages.value, windowSize.value),
);
const itemWidth = (number) =>
  Math.max(44, Math.ceil(String(number).length * fontSize.value * 0.7 + 20));
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
  fontSize.value =
    Number.parseFloat(getComputedStyle(strip.value).fontSize) || 16;
  const width = strip.value.clientWidth;
  for (
    let count = Math.min(pages.value, Math.max(1, Math.floor(width / 44)));
    count >= 1;
    count--
  ) {
    const candidate = paginationItems(props.page, pages.value, count);
    const required =
      candidate.reduce((sum, n) => sum + (n === null ? 16 : itemWidth(n)), 0) +
      (candidate.length - 1) * 4;
    if (required <= width || count === 1) {
      windowSize.value = count;
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
    <button
      class="pagination__previous"
      type="button"
      :disabled="disabled || page <= 1"
      @click="change(page - 1)"
    >
      上一页
    </button>
    <div ref="strip" class="pagination__numbers">
      <template
        v-for="(number, index) in items"
        :key="number === null ? 'gap:' + index : number"
      >
        <span
          v-if="number === null"
          class="pagination__ellipsis"
          aria-hidden="true"
          >...</span
        >
        <button
          v-else
          type="button"
          :style="{ width: itemWidth(number) + 'px' }"
          :aria-label="`第 ${number} 页`"
          :aria-current="number === page ? 'page' : undefined"
          :disabled="disabled"
          @click="change(number)"
        >
          {{ number }}
        </button>
      </template>
    </div>
    <button
      class="pagination__next"
      type="button"
      :disabled="disabled || page >= pages"
      @click="change(page + 1)"
    >
      下一页
    </button>
    <span class="pagination__summary" aria-live="polite"
      >第 {{ page }} / {{ pages }} 页 · {{ total }} 条</span
    >
  </nav>
</template>
<style scoped>
.pagination {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas: 'previous numbers next' 'summary summary summary';
  align-items: center;
  gap: 12px;
  min-width: 0;
  margin: 24px 0;
}
.pagination__previous {
  grid-area: previous;
}
.pagination__next {
  grid-area: next;
}
.pagination__summary {
  grid-area: summary;
}
.pagination__numbers {
  grid-area: numbers;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  min-width: 0;
}
.pagination__ellipsis {
  flex: 0 0 16px;
  text-align: center;
}
button {
  flex-shrink: 0;
  min-height: 44px;
  padding: 8px 10px;
  border: 1px solid var(--ft-color-text);
  border-radius: 12px;
  background: var(--zine-paper-card);
  color: var(--ft-color-text);
  font: inherit;
  cursor: pointer;
}
.pagination__numbers button {
  padding: 8px 4px;
}
button[aria-current='page'] {
  background: var(--ft-color-primary);
  color: var(--zine-paper-card);
  font-weight: 700;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
button:focus-visible {
  outline: 2px solid var(--ft-color-text);
  outline-offset: -4px;
}
@media (max-width: 600px) {
  .pagination {
    grid-template-columns: 1fr 1fr;
    grid-template-areas: 'numbers numbers' 'previous next' 'summary summary';
  }
}
</style>
