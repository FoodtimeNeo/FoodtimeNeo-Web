<script setup>
import { ref } from 'vue';
import { searchDishes } from '@/api/dish.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import PaginationControls from '@/components/base/PaginationControls.vue';

const selected = defineModel({ type: Object, default: null });
const open = ref(false);
const input = ref('');
const query = ref('');
const state = usePagedData(
  (page, options) => searchDishes(query.value, page, options),
  { immediate: false },
);

function search() {
  const keyword = input.value.trim();
  if (!keyword || state.loading.value) return;
  query.value = keyword;
  state.hasLoaded.value = false;
  if (state.page.value === 1) state.load();
  else state.page.value = 1;
}

function pick(dish) {
  selected.value = dish;
  open.value = false;
}
</script>

<template>
  <fieldset class="dish-picker">
    <legend>关联菜品（可选）</legend>
    <p v-if="selected">{{ selected.name }}</p>
    <button type="button" @click="open = !open">
      {{ open ? '收起搜索' : selected ? '更换菜品' : '选择菜品' }}
    </button>
    <button v-if="selected" type="button" @click="selected = null">
      移除关联
    </button>
    <div v-if="open">
      <label for="post-dish-keyword">搜索菜名</label>
      <input
        id="post-dish-keyword"
        v-model="input"
        maxlength="50"
        :disabled="state.loading.value"
        @keydown.enter.prevent.stop="search"
      />
      <button type="button" :disabled="state.loading.value" @click="search">
        {{ state.loading.value ? '搜索中…' : '搜索菜品' }}
      </button>
      <p v-if="state.error.value" role="alert">
        {{ state.error.value.message }}
      </p>
      <template v-else-if="state.hasLoaded.value && !state.loading.value">
        <p v-if="!state.items.value.length">没有匹配的菜品。</p>
        <ul v-else>
          <li v-for="dish in state.items.value" :key="dish.id">
            <button type="button" @click="pick(dish)">
              {{ dish.name }} · {{ dish.diningHallName }} · {{ dish.stallName }}
            </button>
          </li>
        </ul>
        <PaginationControls
          v-if="state.total.value > state.size.value || state.page.value > 1"
          :page="state.page.value"
          :total="state.total.value"
          :size="state.size.value"
          @change="state.page.value = $event"
        />
      </template>
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
}
</style>
