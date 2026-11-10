<script setup>
import { computed, ref, watch } from 'vue';
import {
  fetchCanteens,
  fetchStalls,
  fetchStallDishes,
} from '@/api/canteen.api.js';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { filterCatalogByName } from '@/composables/useCatalogSearch.js';

const selected = defineModel({ type: Object, default: null });
const open = ref('');
const query = ref('');
const hall = ref(null);
const stall = ref(null);
const levels = computed(() => [
  { key: 'hall', label: '食堂', name: hall.value?.name, enabled: true },
  {
    key: 'stall',
    label: '档口',
    name: stall.value?.name,
    enabled: !!hall.value,
  },
  {
    key: 'dish',
    label: '菜品',
    name: selected.value?.name,
    enabled: !!stall.value,
  },
]);
const state = useAsyncData(
  (options) => {
    if (open.value === 'dish') return fetchStallDishes(stall.value.id, options);
    if (open.value === 'stall') return fetchStalls(hall.value.id, options);
    return fetchCanteens(options);
  },
  { immediate: false, initial: [] },
);
const matches = computed(() =>
  filterCatalogByName(state.data.value, query.value),
);

watch(
  selected,
  (dish) => {
    if (!dish) return;
    if (dish.diningHallId)
      hall.value = { id: dish.diningHallId, name: dish.diningHallName };
    if (dish.stallId) stall.value = { id: dish.stallId, name: dish.stallName };
  },
  { immediate: true },
);

watch(open, (level) => {
  state.cancel();
  state.data.value = [];
  state.error.value = null;
  query.value = '';
  if (level) state.load();
});

function pick(item) {
  if (open.value === 'hall' && hall.value?.id !== item.id) {
    hall.value = item;
    stall.value = null;
    selected.value = null;
  } else if (open.value === 'stall' && stall.value?.id !== item.id) {
    stall.value = item;
    selected.value = null;
  } else if (open.value === 'dish') {
    selected.value = {
      ...item,
      diningHallId: hall.value.id,
      diningHallName: hall.value.name,
      stallId: stall.value.id,
      stallName: stall.value.name,
    };
  }
  open.value = '';
}
</script>

<template>
  <fieldset class="dish-picker">
    <legend>关联菜品（可选）</legend>
    <div v-for="level in levels" :key="level.key" class="dish-picker__level">
      <button
        type="button"
        class="dish-picker__trigger"
        :disabled="!level.enabled"
        :aria-expanded="open === level.key"
        @click="open = open === level.key ? '' : level.key"
      >
        <span>{{ level.label }}</span>
        <span
          >{{ level.name || '请选择' }}
          <span aria-hidden="true">{{
            open === level.key ? '⌃' : '⌄'
          }}</span></span
        >
      </button>
      <div v-if="open === level.key" class="dish-picker__panel">
        <input
          id="post-dish-keyword"
          v-model="query"
          type="search"
          maxlength="50"
          :aria-label="`筛选${level.label}`"
          :placeholder="`筛选${level.label}，留空显示全部`"
          @keydown.enter.prevent
        />
        <p v-if="state.loading.value" role="status">
          正在加载{{ level.label }}…
        </p>
        <template v-else-if="state.error.value">
          <p role="alert">{{ state.error.value.message }}</p>
          <button type="button" @click="state.load">重试</button>
        </template>
        <p v-else-if="!matches.length" role="status">
          没有可选的{{ level.label }}。
        </p>
        <ul v-else :aria-label="`选择${level.label}`">
          <li v-for="item in matches" :key="item.id">
            <button type="button" @click="pick(item)">{{ item.name }}</button>
          </li>
        </ul>
      </div>
    </div>
    <button
      v-if="selected"
      class="dish-picker__remove"
      type="button"
      @click="selected = null"
    >
      移除关联
    </button>
  </fieldset>
</template>

<style scoped>
.dish-picker {
  margin: 12px 0;
  border: 1px solid var(--ft-color-border);
  min-width: 0;
  padding: 0 10px 6px;
}
.dish-picker__level + .dish-picker__level {
  border-top: 1px solid var(--ft-color-border);
}
.dish-picker button,
.dish-picker input {
  min-height: 40px;
  font: inherit;
}
.dish-picker__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  background: transparent;
  border: 0;
  color: var(--ft-color-text);
  cursor: pointer;
}
.dish-picker__trigger:disabled {
  opacity: 0.5;
  cursor: default;
}
.dish-picker__panel {
  padding: 4px 6px;
}
.dish-picker input {
  box-sizing: border-box;
  width: 100%;
  padding-inline: 8px;
}
.dish-picker ul {
  margin: 4px 0;
  padding: 0;
  list-style: none;
  max-height: min(24dvh, 144px);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.dish-picker li button {
  width: 100%;
  text-align: left;
  padding-inline: 8px;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
}
.dish-picker li button:hover,
.dish-picker li button:focus-visible {
  background: var(--zine-paper-card);
}
.dish-picker__remove {
  background: transparent;
  border: 0;
  color: var(--ft-color-primary);
  cursor: pointer;
}
</style>
