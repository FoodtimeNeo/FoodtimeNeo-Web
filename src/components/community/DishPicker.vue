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
const open = ref(false);
const query = ref('');
const hall = ref(null);
const stall = ref(null);
const level = computed(() =>
  stall.value ? '菜品' : hall.value ? '档口' : '食堂',
);
const state = useAsyncData(
  (options) => {
    if (stall.value) return fetchStallDishes(stall.value.id, options);
    if (hall.value) return fetchStalls(hall.value.id, options);
    return fetchCanteens(options);
  },
  { immediate: false, initial: [] },
);
const matches = computed(() =>
  filterCatalogByName(state.data.value, query.value),
);

watch([open, hall, stall], () => {
  state.cancel();
  state.data.value = [];
  state.error.value = null;
  query.value = '';
  if (open.value) state.load();
});

function resetHall() {
  hall.value = null;
  stall.value = null;
}

function toggle() {
  if (!open.value) resetHall();
  open.value = !open.value;
}

function pick(item) {
  if (!hall.value) hall.value = item;
  else if (!stall.value) stall.value = item;
  else {
    selected.value = {
      ...item,
      diningHallName: hall.value.name,
      stallName: stall.value.name,
    };
    open.value = false;
  }
}
</script>

<template>
  <fieldset class="dish-picker">
    <legend>关联菜品（可选）</legend>
    <p v-if="selected">
      {{
        [selected.diningHallName, selected.stallName, selected.name]
          .filter(Boolean)
          .join(' · ')
      }}
    </p>
    <button type="button" :aria-expanded="open" @click="toggle">
      {{ open ? '收起选择' : selected ? '更换菜品' : '选择菜品' }}
    </button>
    <button v-if="selected" type="button" @click="selected = null">
      移除关联
    </button>
    <div v-if="open">
      <div v-if="hall" class="dish-picker__parents">
        <button type="button" @click="resetHall">
          更换食堂 · {{ hall.name }}
        </button>
        <button v-if="stall" type="button" @click="stall = null">
          更换档口 · {{ stall.name }}
        </button>
      </div>
      <label for="post-dish-keyword">筛选{{ level }}</label>
      <input
        id="post-dish-keyword"
        v-model="query"
        type="search"
        maxlength="50"
        :placeholder="`输入${level}名称，留空显示全部`"
        @keydown.enter.prevent
      />
      <p v-if="state.loading.value" role="status">正在加载{{ level }}…</p>
      <template v-else-if="state.error.value">
        <p role="alert">{{ state.error.value.message }}</p>
        <button type="button" @click="state.load">重试</button>
      </template>
      <p v-else-if="!matches.length" role="status">没有可选的{{ level }}。</p>
      <ul v-else :key="level" :aria-label="`选择${level}`">
        <li v-for="item in matches" :key="item.id">
          <button type="button" @click="pick(item)">{{ item.name }}</button>
        </li>
      </ul>
    </div>
  </fieldset>
</template>

<style scoped>
.dish-picker {
  margin: 12px 0;
  border: 1px solid var(--ft-color-text);
  min-width: 0;
}
.dish-picker input,
.dish-picker button {
  min-height: 40px;
  max-width: 100%;
  margin: 4px;
  padding: 4px 8px;
}
.dish-picker ul {
  list-style: none;
  padding: 0;
  max-height: min(36vh, 280px);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.dish-picker li button {
  display: block;
  width: calc(100% - 8px);
  text-align: left;
}
.dish-picker__parents {
  display: flex;
  flex-wrap: wrap;
}
</style>
