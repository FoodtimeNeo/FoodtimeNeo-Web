<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { searchDishes } from '@/api/dish.api.js';
import { fetchCanteens } from '@/api/canteen.api.js';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { ApiError } from '@/api/http.js';
import { formatPrice } from '@/utils/mediaUrl.js';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import AppIcon from '@/components/base/AppIcon.vue';
import { useAuthStore } from '@/store/useAuthStore.js';
import {
  readSearchHistory,
  rememberSearch,
  removeSearch,
  purgeSearchHistory,
} from '@/utils/searchHistory.js';
const auth = useAuthStore();
const history = ref([]);
const editingHistory = ref(false);
const clearingHistory = ref(false);
watch(
  () => auth.user?.id,
  (owner) => {
    history.value = readSearchHistory(owner);
    editingHistory.value = false;
    clearingHistory.value = false;
  },
  { immediate: true },
);
function useHistory(term) {
  form.q = term;
  submit();
}
function removeHistory(term) {
  history.value = removeSearch(auth.user?.id, term);
}
function clearHistory() {
  purgeSearchHistory(auth.user?.id);
  history.value = [];
  clearingHistory.value = false;
  editingHistory.value = false;
}

const route = useRoute();
const router = useRouter();
const halls = ref([]);
const hallsError = ref('');
const validation = ref('');
const form = reactive({
  q: '',
  hallIds: [],
  minPrice: '',
  maxPrice: '',
  minRating: '',
  sort: 'relevance',
});

const RATINGS = ['', '3.0', '3.5', '4.0', '4.5'];
const SORTS = [
  ['relevance', '综合'],
  ['price_asc', '价格从低到高'],
  ['price_desc', '价格从高到低'],
  ['rating_desc', '评分优先'],
];

function queryList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return typeof value === 'string' && value ? [value] : [];
}

function activeFilters() {
  return {
    q: typeof route.query.q === 'string' ? route.query.q.trim() : '',
    diningHallIds: queryList(route.query.halls),
    minPrice: route.query.minPrice || null,
    maxPrice: route.query.maxPrice || null,
    minRating: route.query.minRating || null,
    sort: typeof route.query.sort === 'string' ? route.query.sort : 'relevance',
  };
}

function syncForm() {
  const active = activeFilters();
  form.q = active.q.slice(0, 50);
  form.hallIds = [...active.diningHallIds];
  form.minPrice = active.minPrice || '';
  form.maxPrice = active.maxPrice || '';
  form.minRating = active.minRating || '';
  form.sort = active.sort;
}

function routePage() {
  const value = route.query.page;
  if (typeof value !== 'string' || !/^[1-9]\d{0,6}$/.test(value)) return 1;
  return Number(value);
}
const asyncState = useAsyncData(
  async (options) => {
    const active = activeFilters();
    const page = routePage();
    const result = await searchDishes(active.q, page, options, active);
    if (
      !Array.isArray(result?.items) ||
      !Number.isInteger(result.total) ||
      result.total < 0 ||
      !Number.isInteger(result.size) ||
      result.size < 1
    ) {
      throw new ApiError('分页响应不符合接口约定', { code: 'PROTOCOL' });
    }
    return { ...result, page };
  },
  {
    immediate: false,
    initial: { items: [], total: 0, page: 1, size: 20 },
    cacheKey: () =>
      `dish-search:${JSON.stringify([activeFilters(), routePage()])}`,
    ttl: 0,
  },
);
const state = {
  ...asyncState,
  page: computed(() => asyncState.data.value.page),
  items: computed(() => asyncState.data.value.items),
  total: computed(() => asyncState.data.value.total),
  size: computed(() => asyncState.data.value.size),
};
function changePage(page) {
  const query = { ...route.query };
  if (page === 1) delete query.page;
  else query.page = String(page);
  void router.push({ name: 'dishSearch', query });
}
watch(
  () => route.query,
  () => {
    syncForm();
    validation.value = '';
    state.cancel();
    void state.load();
  },
  { immediate: true, deep: true },
);
watch(state.data, (result) => {
  const last = Math.max(1, Math.ceil(result.total / result.size));
  if (result.page > last) {
    const query = { ...route.query };
    if (last === 1) delete query.page;
    else query.page = String(last);
    void router.replace({ name: 'dishSearch', query });
  }
});

onMounted(async () => {
  try {
    halls.value = await fetchCanteens();
  } catch (error) {
    hallsError.value = error.message || '无法读取食堂列表';
  }
});

function validate() {
  const q = form.q.trim();
  if (q.length > 50) return '菜品关键词最多50个字符。';
  if (form.minPrice !== '' && Number(form.minPrice) < 0)
    return '最低价格不能为负数。';
  if (form.maxPrice !== '' && Number(form.maxPrice) < 0)
    return '最高价格不能为负数。';
  if (
    form.minPrice !== '' &&
    form.maxPrice !== '' &&
    Number(form.minPrice) > Number(form.maxPrice)
  )
    return '最低价格不能高于最高价格。';
  return '';
}

function submit() {
  validation.value = validate();
  if (validation.value) return;
  const query = {};
  const q = form.q.trim();
  if (q) {
    query.q = q;
    history.value = rememberSearch(auth.user?.id, q);
  }
  if (form.hallIds.length) query.halls = [...form.hallIds];
  if (form.minPrice !== '') query.minPrice = String(form.minPrice);
  if (form.maxPrice !== '') query.maxPrice = String(form.maxPrice);
  if (form.minRating !== '') query.minRating = String(form.minRating);
  if (form.sort && form.sort !== 'relevance') query.sort = form.sort;
  const current = activeFilters();
  const same =
    current.q === q &&
    current.minPrice === (query.minPrice || null) &&
    current.maxPrice === (query.maxPrice || null) &&
    current.minRating === (query.minRating || null) &&
    current.sort === (query.sort || 'relevance') &&
    current.diningHallIds.join(',') === (query.halls || []).join(',');
  if (same && routePage() === 1) state.load();
  else router.replace({ name: 'dishSearch', query });
}

function reset() {
  form.q = '';
  form.hallIds = [];
  form.minPrice = '';
  form.maxPrice = '';
  form.minRating = '';
  form.sort = 'relevance';
  validation.value = '';
  router.replace({ name: 'dishSearch' });
}

function ratingLabel(dish) {
  if (dish.averageScore === null || dish.averageScore === undefined)
    return '暂无评分';
  return `${Number(dish.averageScore).toFixed(1)} 分 · ${dish.reviewCount} 条`;
}
</script>

<template>
  <main class="dish-search">
    <RouterLink :to="{ name: 'canteenList' }">← 返回食堂</RouterLink>
    <h1 class="dish-search__title">搜索</h1>
    <form class="dish-search__filters" role="search" @submit.prevent="submit">
      <div class="dish-search__field">
        <AppIcon name="search" />
        <input
          id="dish-keyword"
          v-model="form.q"
          aria-label="搜索菜品"
          type="search"
          placeholder="搜索菜品，如牛肉面"
          maxlength="50"
          enterkeyhint="search"
        />
        <button class="dish-search__submit" type="submit">搜索</button>
      </div>
      <section
        v-if="history.length"
        class="dish-search__history"
        aria-label="历史搜索"
      >
        <header>
          <h2>历史搜索</h2>
          <button
            type="button"
            @click="
              editingHistory = !editingHistory;
              clearingHistory = false;
            "
          >
            {{ editingHistory ? '完成' : '编辑' }}</button
          ><button
            v-if="editingHistory"
            type="button"
            @click="clearingHistory = true"
          >
            清空
          </button>
        </header>
        <div v-if="clearingHistory" class="dish-search__clear">
          <span>清空搜索历史？</span
          ><button type="button" @click="clearHistory">清空</button
          ><button type="button" @click="clearingHistory = false">取消</button>
        </div>
        <div class="dish-search__chips">
          <span v-for="term in history" :key="term"
            ><button type="button" @click="useHistory(term)">{{ term }}</button
            ><button
              v-if="editingHistory"
              type="button"
              :aria-label="`删除搜索历史：${term}`"
              @click="removeHistory(term)"
            >
              ×
            </button></span
          >
        </div>
      </section>
      <details class="dish-search__filter-panel">
        <summary>筛选与排序</summary>
        <div class="dish-search__grid">
          <fieldset class="dish-search__halls">
            <legend>食堂</legend>
            <label v-for="hall in halls" :key="hall.id"
              ><input
                v-model="form.hallIds"
                type="checkbox"
                :value="hall.id"
              />{{ hall.name }}</label
            >
          </fieldset>
          <label>
            最低价
            <input
              v-model="form.minPrice"
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
            />
          </label>
          <label>
            最高价
            <input
              v-model="form.maxPrice"
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
            />
          </label>
          <label>
            最低评分
            <select v-model="form.minRating">
              <option v-for="rating in RATINGS" :key="rating" :value="rating">
                {{ rating ? rating + ' 分' : '不限' }}
              </option>
            </select>
          </label>
          <label>
            排序
            <select v-model="form.sort">
              <option
                v-for="[value, label] in SORTS"
                :key="value"
                :value="value"
              >
                {{ label }}
              </option>
            </select>
          </label>
        </div>
        <div class="dish-search__actions">
          <button class="button-ink" type="submit">应用筛选</button>
          <button class="dish-search__reset" type="button" @click="reset">
            重置
          </button>
        </div>
      </details>
      <p v-if="validation" role="alert">{{ validation }}</p>
      <p v-if="hallsError" role="alert">{{ hallsError }}</p>
    </form>

    <template v-if="!validation">
      <LoadingState v-if="state.initialLoading.value" message="正在查找菜品…" />
      <ErrorState
        v-if="state.error.value"
        :description="state.error.value.message"
        @retry="state.load"
      />
      <template v-if="state.hasLoaded.value">
        <p aria-live="polite">
          找到 {{ state.total.value }} 道菜
          <small v-if="state.loading.value" role="status"> · 正在刷新…</small>
        </p>
        <EmptyState
          v-if="!state.items.value.length"
          title="没有匹配的菜品"
          description="试试放宽价格、食堂或评分条件。"
        />
        <ul v-else class="dish-search__results">
          <li v-for="dish in state.items.value" :key="dish.id">
            <RouterLink
              :to="{
                name: 'dishDetail',
                params: {
                  canteenId: dish.diningHallId,
                  stallId: dish.stallId,
                  dishId: dish.id,
                },
              }"
            >
              <div>
                <strong>{{ dish.name }}</strong>
                <p>{{ dish.diningHallName }} · {{ dish.stallName }}</p>
                <p class="dish-search__rating">{{ ratingLabel(dish) }}</p>
              </div>
              <span>{{ formatPrice(dish.price) }}</span>
            </RouterLink>
          </li>
        </ul>
        <PaginationControls
          v-if="state.total.value > state.size.value || state.page.value > 1"
          :page="state.page.value"
          :disabled="state.loading.value"
          :total="state.total.value"
          :size="state.size.value"
          @change="changePage"
        />
      </template>
    </template>
  </main>
</template>

<style scoped lang="scss">
.dish-search {
  width: min(calc(100% - 2 * var(--zine-page-padding)), 760px);
  margin: 16px auto;

  &__filters {
    margin-bottom: var(--ft-space-3);
  }

  &__title {
    font: 28px var(--ft-font-family-title);
    margin: 12px 0;
  }
  &__field {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 4px 4px 12px;
    border: 1px solid var(--ft-color-primary);
    border-radius: 28px;
    background: var(--zine-paper-card);
    svg {
      width: 20px;
      height: 20px;
      flex: none;
      color: var(--ft-color-text-muted);
    }
    input {
      min-width: 0;
      flex: 1;
      height: 44px;
      border: 0;
      background: transparent;
      font: inherit;
      font-size: 16px;
      color: var(--ft-color-text);
    }
    input::placeholder {
      color: var(--ft-color-text-muted);
    }
  }
  &__submit {
    flex: none;
    min-height: 44px;
    padding: 8px 20px;
    border: 0;
    border-radius: 24px;
    background: var(--ft-color-primary);
    color: white;
    font: inherit;
    cursor: pointer;
  }
  &__filter-panel {
    margin: 12px 0;
    summary {
      display: flex;
      align-items: center;
      min-height: 44px;
      cursor: pointer;
      color: var(--ft-color-text-muted);
    }
    summary::after {
      content: '⌄';
      margin-left: 6px;
    }
  }
  &__history {
    margin: 16px 0;
    header {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    h2 {
      flex: 1;
      margin: 0;
      font-size: 16px;
    }
    button {
      min-height: 44px;
      border: 0;
      background: transparent;
      font: inherit;
      color: var(--ft-color-text-muted);
      cursor: pointer;
    }
  }
  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 8px;
    span {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      background: var(--ft-color-bg-soft);
      border-radius: 18px;
      padding: 0 10px;
    }
    button {
      color: var(--ft-color-text);
      font-size: 14px;
      overflow-wrap: anywhere;
      text-align: left;
    }
  }
  &__clear {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }
  &__halls {
    grid-column: 1/-1;
    border: 0;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    legend {
      margin-bottom: 8px;
    }
    label {
      flex-direction: row !important;
      align-items: center;
      padding: 4px 8px;
      min-height: 44px;
      border: 1px solid var(--ft-color-border);
      border-radius: 8px;
    }
    input {
      min-height: 0 !important;
      width: 18px;
      height: 18px;
    }
  }
  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;

    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: var(--ft-font-size-sm);
      color: var(--ft-color-text-muted);
    }

    input,
    select {
      min-height: 40px;
      padding: 6px 8px;
      border: 1px solid var(--ft-color-secondary);
      background: var(--zine-paper-card);
      font-size: 16px;
    }
  }

  &__actions {
    display: flex;
    gap: 10px;
    margin-top: 12px;
  }

  &__reset {
    border: 1px solid var(--ft-color-secondary);
    background: transparent;
    padding: 8px 18px;
    cursor: pointer;
    color: var(--ft-color-text);
  }

  &__results {
    list-style: none;
    padding: 0;

    a {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px 4px;
      border-bottom: 1px solid var(--ft-color-text);
      overflow-wrap: anywhere;
    }

    p {
      margin: 4px 0 0;
    }

    span {
      flex-shrink: 0;
    }
  }

  &__rating {
    color: var(--ft-color-text-muted);
    font-size: var(--ft-font-size-sm);
  }
}
</style>
