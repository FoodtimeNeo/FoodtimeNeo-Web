<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { searchDishes } from '@/api/dish.api.js';
import { fetchCanteens } from '@/api/canteen.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { formatPrice } from '@/utils/mediaUrl.js';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';

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

const state = usePagedData(
  (page, options) => {
    const active = activeFilters();
    return searchDishes(active.q, page, options, active);
  },
  { immediate: false },
);

watch(
  () => route.query,
  () => {
    syncForm();
    validation.value = '';
    state.cancel();
    state.hasLoaded.value = false;
    if (state.page.value !== 1) state.page.value = 1;
    else state.load();
  },
  { immediate: true, deep: true },
);

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
  if (q) query.q = q;
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
  if (same) state.load();
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
    <h1 class="section-title">
      跨食堂<span class="zine-highlight">搜菜</span>
    </h1>
    <form class="dish-search__filters" role="search" @submit.prevent="submit">
      <div class="dish-search__field">
        <label for="dish-keyword">菜名</label>
        <input
          id="dish-keyword"
          v-model="form.q"
          type="search"
          placeholder="可留空浏览全部菜品"
          maxlength="50"
        />
      </div>
      <div class="dish-search__grid">
        <label>
          食堂
          <select v-model="form.hallIds" multiple size="4">
            <option v-for="hall in halls" :key="hall.id" :value="hall.id">
              {{ hall.name }}
            </option>
          </select>
        </label>
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
            <option v-for="[value, label] in SORTS" :key="value" :value="value">
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
      <p v-if="validation" role="alert">{{ validation }}</p>
      <p v-if="hallsError" role="alert">{{ hallsError }}</p>
    </form>

    <template v-if="!validation">
      <LoadingState v-if="state.loading.value" message="正在查找菜品…" />
      <ErrorState
        v-else-if="state.error.value"
        :description="state.error.value.message"
        @retry="state.load"
      />
      <template v-else-if="state.hasLoaded.value">
        <p aria-live="polite">找到 {{ state.total.value }} 道菜</p>
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
          :total="state.total.value"
          :size="state.size.value"
          @change="state.page.value = $event"
        />
      </template>
    </template>
  </main>
</template>

<style scoped lang="scss">
.dish-search {
  width: min(calc(100% - 2 * var(--zine-page-padding)), 760px);
  margin: var(--ft-space-6) auto;

  &__filters {
    margin-bottom: var(--ft-space-3);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 8px 0 12px;

    input {
      min-height: 44px;
      padding: 8px 12px;
      border: 1px solid var(--ft-color-text);
      background: var(--zine-paper-card);
      font-size: 16px;
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
