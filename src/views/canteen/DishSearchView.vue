<script setup>
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElDialog } from 'element-plus';
import { fetchCanteens } from '@/api/canteen.api.js';
import { searchStalls, searchNotes } from '@/api/search.api.js';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { useSearchLocation } from '@/composables/useSearchLocation.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import { previewColumns, distanceLabel } from '@/utils/searchPresentation.js';
import {
  readSearchHistory,
  rememberSearch,
  removeSearch,
  purgeSearchHistory,
} from '@/utils/searchHistory.js';
import AppIcon from '@/components/base/AppIcon.vue';
import SearchHighlight from '@/components/base/SearchHighlight.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import SearchDiscovery from '@/components/canteen/SearchDiscovery.vue';
import SearchStallCard from '@/components/canteen/SearchStallCard.vue';
import CommunityPostCard from '@/components/community/CommunityPostCard.vue';
import CommunityPostDetailModal from '@/components/community/CommunityPostDetailModal.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const location = useSearchLocation();
const tab = computed(() => (route.query.tab === 'notes' ? 'notes' : 'dishes'));
const hasSearch = computed(() =>
  [
    'q',
    'browse',
    'halls',
    'minPrice',
    'maxPrice',
    'minRating',
    'sort',
    'type',
    'page',
  ].some((key) => Object.hasOwn(route.query, key)),
);
const keyword = ref('');
const editing = ref(false);
const composing = ref(false);
const suggestions = ref([]);
const suggestionLoading = ref(false);
const suggestionError = ref('');
let suggestionTimer,
  suggestionController,
  suggestionRevision = 0;
let restoringDiscoveryRoute = false;
const showSuggestions = computed(() => editing.value && !!keyword.value.trim());
const showDiscovery = computed(
  () => !keyword.value.trim() && (!hasSearch.value || editing.value),
);
function cancelSuggestions() {
  clearTimeout(suggestionTimer);
  suggestionController?.abort();
  suggestionRevision++;
  suggestionLoading.value = false;
}
function editKeyword() {
  editing.value = true;
  panel.value = '';
  cancelSuggestions();
  suggestions.value = [];
  suggestionError.value = '';
  if (composing.value || !keyword.value.trim()) {
    state.cancel();
    if (!keyword.value.trim() && hasSearch.value) {
      restoringDiscoveryRoute = true;
      void router
        .replace({ name: 'dishSearch', query: { tab: tab.value } })
        .finally(() => {
          restoringDiscoveryRoute = false;
        });
    }
    return;
  }
  const request = suggestionRevision,
    q = keyword.value.trim(),
    selected = tab.value;
  suggestionLoading.value = true;
  suggestionTimer = setTimeout(async () => {
    suggestionController = new AbortController();
    try {
      const page = await (selected === 'notes' ? searchNotes : searchStalls)(
        { q, sort: 'relevance', page: 1, size: 8, previewSize: 2, type: 'all' },
        { signal: suggestionController.signal },
      );
      if (request !== suggestionRevision) return;
      const values =
        selected === 'notes'
          ? page.items.map((item) => item.post.title)
          : page.items.flatMap((stall) =>
              stall.dishes.map((dish) => dish.name),
            );
      suggestions.value = [...new Set([q, ...values])].slice(0, 10);
    } catch (error) {
      if (
        request === suggestionRevision &&
        error.name !== 'AbortError' &&
        error.code !== 'CANCELLED'
      )
        suggestionError.value = '匹配内容加载失败，可直接搜索';
    } finally {
      if (request === suggestionRevision) suggestionLoading.value = false;
    }
  }, 250);
}
const history = ref([]);
const editingHistory = ref(false);
const clearingHistory = ref(false);
const halls = ref([]);
const hallsError = ref('');
const validation = ref('');
const panel = ref('');
const results = ref(null);
const columns = ref(4);
const filterSection = ref('halls');
const filters = reactive({
  halls: [],
  minPrice: '',
  maxPrice: '',
  minRating: '',
  type: 'all',
});
const ratings = ['', '3.0', '3.5', '4.0', '4.5'];
const sections = computed(() =>
  tab.value === 'notes'
    ? [
        ['halls', '食堂'],
        ['type', '笔记类型'],
      ]
    : [
        ['halls', '食堂'],
        ['price', '价格'],
        ['rating', '评分'],
      ],
);
const sorts = computed(() =>
  tab.value === 'notes'
    ? [
        ['relevance', '综合排序'],
        ['latest', '最新发布'],
        ['likes', '最多点赞'],
      ]
    : [
        ['relevance', '综合排序'],
        ['rating_desc', '评分优先'],
        ['price_asc', '价格从低到高'],
        ['price_desc', '价格从高到低'],
      ],
);
const sortLabel = computed(
  () => sorts.value.find(([id]) => id === route.query.sort)?.[1] || '综合排序',
);
const list = (value) =>
  Array.isArray(value)
    ? value
    : typeof value === 'string' && value
      ? [value]
      : [];
const pageNumber = computed(() =>
  /^[1-9]\d{0,6}$/.test(String(route.query.page))
    ? Number(route.query.page)
    : 1,
);
const filterCount = computed(
  () =>
    list(route.query.halls).length +
    ['minPrice', 'maxPrice', 'minRating'].filter((k) => route.query[k]).length +
    (route.query.type && route.query.type !== 'all' ? 1 : 0),
);
function payload() {
  const sort = route.query.sort || 'relevance';
  const body = {
    q: typeof route.query.q === 'string' ? route.query.q : '',
    diningHallIds: list(route.query.halls),
    sort,
    page: pageNumber.value,
    size: tab.value === 'notes' ? 20 : 10,
    previewSize: Math.min(8, columns.value * 2),
  };
  if (tab.value === 'dishes') {
    for (const key of ['minPrice', 'maxPrice', 'minRating'])
      if (route.query[key]) body[key] = route.query[key];
  } else body.type = route.query.type || 'all';
  if (sort === 'distance') {
    const point = location.position.value;
    if (!point || Date.now() - point.acquiredAt > 300000)
      throw new Error('请点击距离最近，重新获取当前位置');
    body.latitude = point.latitude;
    body.longitude = point.longitude;
  }
  return body;
}
const emptyPage = () => ({ items: [], total: 0, page: 1, size: 10 });
const state = useAsyncData(
  async (options) => {
    const body = payload();
    const page = await (tab.value === 'notes' ? searchNotes : searchStalls)(
      body,
      options,
    );
    if (
      !Array.isArray(page?.items) ||
      !Number.isSafeInteger(page.total) ||
      page.total < 0 ||
      !Number.isInteger(page.size) ||
      page.size < 1
    )
      throw new Error('搜索分页响应异常，请重试');
    return { ...page, query: body };
  },
  { immediate: false, initial: emptyPage() },
);
const load = () => state.load();
function navigate(query) {
  if (JSON.stringify(query) === JSON.stringify(route.query)) return load();
  return router.push({ name: 'dishSearch', query });
}
function submit(term = keyword.value) {
  const q = String(term).trim();
  if (q.length > 50) {
    validation.value = '关键词最多50个字符';
    return;
  }
  validation.value = '';
  cancelSuggestions();
  editing.value = false;
  keyword.value = q;
  if (!q) {
    void router.replace({ name: 'dishSearch', query: { tab: tab.value } });
    return;
  }
  history.value = rememberSearch(auth.user?.id, q);
  const query = { ...route.query, browse: '1' };
  delete query.page;
  if (q) query.q = q;
  else delete query.q;
  void navigate(query);
}
function switchTab(next) {
  if (next === tab.value) return;
  const query = { tab: next };
  if (hasSearch.value) query.browse = '1';
  if (route.query.q) query.q = route.query.q;
  if (route.query.halls) query.halls = route.query.halls;
  void navigate(query);
}
function changePage(page) {
  const query = { ...route.query };
  if (page === 1) delete query.page;
  else query.page = String(page);
  void navigate(query);
}
function openFilters() {
  filters.halls = [...list(route.query.halls)];
  for (const key of ['minPrice', 'maxPrice', 'minRating'])
    filters[key] = route.query[key] || '';
  filters.type = route.query.type || 'all';
  filterSection.value = 'halls';
  validation.value = '';
  panel.value = 'filters';
}
function resetFilters() {
  Object.assign(filters, {
    halls: [],
    minPrice: '',
    maxPrice: '',
    minRating: '',
    type: 'all',
  });
  validation.value = '';
}
function applyFilters() {
  const values = [filters.minPrice, filters.maxPrice];
  if (
    values.some(
      (v) => v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0),
    )
  ) {
    validation.value = '价格须为非负数字';
    return;
  }
  if (values.every((v) => v !== '') && Number(values[0]) > Number(values[1])) {
    validation.value = '最低价格不能高于最高价格';
    return;
  }
  const query = { ...route.query, browse: '1' };
  delete query.page;
  for (const key of ['halls', 'minPrice', 'maxPrice', 'minRating', 'type'])
    delete query[key];
  if (filters.halls.length) query.halls = [...filters.halls];
  if (tab.value === 'dishes') {
    for (const key of ['minPrice', 'maxPrice', 'minRating'])
      if (filters[key] !== '') query[key] = String(filters[key]);
  } else if (filters.type !== 'all') query.type = filters.type;
  panel.value = '';
  validation.value = '';
  void navigate(query);
}
async function chooseSort(sort) {
  panel.value = '';
  if (sort === 'distance' && !(await location.locate())) return;
  const query = { ...route.query, browse: '1' };
  delete query.page;
  if (sort === 'relevance') delete query.sort;
  else query.sort = sort;
  void navigate(query);
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
watch(
  () => [route.query, auth.user?.id],
  ([query, owner], old) => {
    if (
      restoringDiscoveryRoute &&
      editing.value &&
      keyword.value.trim() &&
      old?.[1] === owner
    ) {
      state.cancel();
      return;
    }
    if (old && old[1] !== owner) location.clear();
    keyword.value = typeof query.q === 'string' ? query.q : '';
    cancelSuggestions();
    editing.value = false;
    history.value = readSearchHistory(owner);
    editingHistory.value = false;
    panel.value = '';
    validation.value = '';
    state.cancel();
    state.data.value = emptyPage();
    state.hasLoaded.value = false;
    if (hasSearch.value) void load();
  },
  { immediate: true, deep: true },
);
watch(state.data, (result) => {
  const last = Math.max(1, Math.ceil(result.total / result.size));
  if (state.hasLoaded.value && pageNumber.value > last) {
    const query = { ...route.query };
    if (last === 1) delete query.page;
    else query.page = String(last);
    void router.replace({ name: 'dishSearch', query });
  }
});
const post = ref(null);
const detailOpen = ref(false);
function showPost(value) {
  post.value = value;
  detailOpen.value = true;
}
function removePost(id = post.value?.id) {
  const before = state.data.value.items.length;
  const items = state.data.value.items.filter((item) => item.post?.id !== id);
  state.data.value = {
    ...state.data.value,
    items,
    total: Math.max(0, state.data.value.total - (before - items.length)),
  };
}
let observer;
watch(columns, () => {
  if (hasSearch.value && tab.value === 'dishes' && state.hasLoaded.value)
    void load();
});
onMounted(async () => {
  await nextTick();
  if (typeof ResizeObserver !== 'undefined' && results.value) {
    observer = new ResizeObserver((entries) => {
      columns.value = previewColumns(entries[0].contentRect.width);
    });
    observer.observe(results.value);
  }
  try {
    halls.value = await fetchCanteens();
  } catch (error) {
    hallsError.value = error.message || '食堂列表加载失败';
  }
});
onUnmounted(() => {
  cancelSuggestions();
  observer?.disconnect();
  location.clear();
});
</script>

<template>
  <section ref="results" class="unified-search">
    <div class="unified-search__sticky">
      <form
        role="search"
        class="unified-search__bar"
        @submit.prevent="submit()"
      >
        <button type="button" aria-label="返回" @click="router.back()">
          ‹
        </button>
        <div class="unified-search__field">
          <AppIcon name="search" /><input
            id="dish-keyword"
            v-model="keyword"
            aria-label="搜索菜品或笔记"
            type="search"
            placeholder="菜品、笔记"
            maxlength="50"
            enterkeyhint="search"
            @input="editKeyword"
            @focus="keyword.trim() && editKeyword()"
            @compositionstart="
              composing = true;
              cancelSuggestions();
            "
            @compositionend="
              composing = false;
              editKeyword();
            "
          /><button type="submit">搜索</button>
        </div>
        <RouterLink :to="{ name: 'home' }" aria-label="回到首页"
          ><AppIcon name="home"
        /></RouterLink>
      </form>
      <nav class="unified-search__tabs" aria-label="搜索类型">
        <button
          v-for="[id, label] in [
            ['dishes', '菜品'],
            ['notes', '笔记'],
          ]"
          :key="id"
          type="button"
          :aria-current="tab === id ? 'page' : undefined"
          @click="switchTab(id)"
        >
          {{ label }}
        </button>
      </nav>
      <div
        v-show="!showSuggestions && !showDiscovery"
        class="unified-search__tools"
      >
        <button
          type="button"
          :class="{ 'is-active': route.query.sort !== 'distance' }"
          :aria-expanded="panel === 'sort'"
          @click="panel = 'sort'"
        >
          <span>{{ sortLabel }}</span>
          <AppIcon name="chevronDown" class="unified-search__chevron" />
        </button>
        <button
          type="button"
          :disabled="location.locating.value"
          :class="{ 'is-active': route.query.sort === 'distance' }"
          @click="chooseSort('distance')"
        >
          {{ location.locating.value ? '定位中…' : '距离最近' }}
        </button>
        <button
          type="button"
          aria-label="筛选"
          :aria-expanded="panel === 'filters'"
          @click="openFilters"
        >
          <AppIcon name="filter" /><span v-if="filterCount">{{
            filterCount
          }}</span>
        </button>
      </div>
    </div>
    <p v-if="location.error.value" class="unified-search__notice" role="status">
      {{ location.error.value }}
    </p>
    <p v-if="validation && !panel" role="alert">{{ validation }}</p>
    <section
      v-if="showSuggestions"
      class="unified-search__suggestions"
      aria-label="搜索建议"
    >
      <p v-if="suggestionLoading" role="status">正在匹配…</p>
      <p v-if="suggestionError" role="status">{{ suggestionError }}</p>
      <button
        v-for="term in suggestions"
        :key="term"
        type="button"
        @click="submit(term)"
      >
        <AppIcon name="search" /><SearchHighlight
          :text="term"
          :keyword="keyword"
        />
      </button>
    </section>
    <template v-else-if="showDiscovery">
      <section
        v-if="history.length"
        class="unified-search__history"
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
        <div v-if="clearingHistory" role="group" aria-label="清空历史确认">
          清空搜索历史？<button type="button" @click="clearHistory">清空</button
          ><button type="button" @click="clearingHistory = false">取消</button>
        </div>
        <div class="unified-search__chips">
          <span v-for="term in history" :key="term"
            ><button type="button" @click="submit(term)">{{ term }}</button
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
      <SearchDiscovery :owner-id="auth.user?.id || ''" />
    </template>
    <template v-else>
      <LoadingState v-if="state.initialLoading.value" message="正在搜索…" />
      <ErrorState
        v-if="state.error.value"
        :description="state.error.value.message"
        @retry="load"
      />
      <template v-if="state.hasLoaded.value">
        <p class="unified-search__count" aria-live="polite">
          {{ state.data.value.total }} {{ tab === 'notes' ? '篇笔记' : '个档口'
          }}<small v-if="state.loading.value"> · 正在刷新…</small>
        </p>
        <EmptyState
          v-if="!state.data.value.items.length"
          title="没有匹配结果"
          description="换个关键词或调整筛选试试"
        />
        <div v-else-if="tab === 'dishes'" class="unified-search__stalls">
          <SearchStallCard
            v-for="stall in state.data.value.items"
            :key="stall.id"
            :stall="stall"
            :columns="columns"
            :query="state.data.value.query"
          />
        </div>
        <div v-else class="unified-search__notes">
          <div
            v-for="item in state.data.value.items"
            :key="item.post.id"
            class="unified-search__note-item"
          >
            <CommunityPostCard
              :post="item.post"
              :keyword="state.data.value.query.q"
              :venue-tag="
                [item.diningHallName, distanceLabel(item.distanceMeters)]
                  .filter(Boolean)
                  .join(' · ')
              "
              @click="showPost"
            />
          </div>
        </div>
        <PaginationControls
          v-if="
            state.data.value.total > state.data.value.size || pageNumber > 1
          "
          :page="pageNumber"
          :total="state.data.value.total"
          :size="state.data.value.size"
          :disabled="state.loading.value"
          @change="changePage"
        />
      </template>
    </template>
    <ElDialog
      :model-value="!!panel"
      :title="panel === 'sort' ? '排序' : '筛选'"
      width="min(100vw, 680px)"
      top="112px"
      append-to-body
      class="search-panel"
      @update:model-value="panel = ''"
    >
      <div v-if="panel === 'sort'" class="search-sort">
        <button
          v-for="[id, label] in [...sorts, ['distance', '距离最近']]"
          :key="id"
          type="button"
          :aria-pressed="(route.query.sort || 'relevance') === id"
          @click="chooseSort(id)"
        >
          {{ label }}
          <span v-if="(route.query.sort || 'relevance') === id">✓</span>
        </button>
      </div>
      <template v-else-if="panel === 'filters'">
        <div class="search-filter">
          <nav aria-label="筛选类别">
            <button
              v-for="[id, label] in sections"
              :key="id"
              type="button"
              :aria-pressed="filterSection === id"
              @click="filterSection = id"
            >
              {{ label }}
            </button>
          </nav>
          <div class="search-filter__body">
            <fieldset v-if="filterSection === 'halls'">
              <legend>食堂</legend>
              <p v-if="hallsError" role="alert">{{ hallsError }}</p>
              <label v-for="hall in halls" :key="hall.id"
                ><input
                  v-model="filters.halls"
                  type="checkbox"
                  :value="hall.id"
                />{{ hall.name }}</label
              >
            </fieldset>
            <fieldset v-if="filterSection === 'price'">
              <legend>价格</legend>
              <div class="search-filter__prices">
                <label
                  >最低价<input
                    v-model="filters.minPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    inputmode="decimal"
                    placeholder="不限" /></label
                ><span>—</span
                ><label
                  >最高价<input
                    v-model="filters.maxPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    inputmode="decimal"
                    placeholder="不限"
                /></label>
              </div>
            </fieldset>
            <fieldset v-if="filterSection === 'rating'">
              <legend>最低评分</legend>
              <label v-for="value in ratings" :key="value"
                ><input
                  v-model="filters.minRating"
                  type="radio"
                  :value="value"
                />{{ value ? value + '分' : '不限' }}</label
              >
            </fieldset>
            <fieldset v-if="filterSection === 'type'">
              <legend>笔记类型</legend>
              <label
                v-for="[value, label] in [
                  ['all', '全部'],
                  ['original', '原创'],
                  ['repost', '转发'],
                ]"
                :key="value"
                ><input v-model="filters.type" type="radio" :value="value" />{{
                  label
                }}</label
              >
            </fieldset>
          </div>
        </div>
        <p v-if="validation" role="alert">{{ validation }}</p>
        <footer class="search-filter__actions">
          <button type="button" @click="resetFilters">重置</button
          ><button type="button" @click="applyFilters">完成</button>
        </footer>
      </template>
    </ElDialog>
    <CommunityPostDetailModal
      v-model="detailOpen"
      :post-id="post?.id || ''"
      :initial-post="post"
      @deleted="removePost"
      @post-edited="removePost"
      @post-updated="load"
    />
  </section>
</template>

<style scoped lang="scss">
.unified-search {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 12px 24px;
  color: var(--ft-color-text);
  button {
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  &__sticky {
    position: sticky;
    top: 0;
    z-index: 8;
    background: var(--ft-color-bg);
    padding: calc(6px + var(--app-mobile-safe-top)) 0 0;
  }
  &__bar {
    display: flex;
    align-items: center;
    gap: 8px;
    > button,
    > a {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      min-height: 44px;
      padding: 0;
      border: 0;
      background: none;
      flex: none;
      color: inherit;
      font-size: 30px;
    }
    > a svg {
      width: 24px;
      height: 24px;
    }
  }
  &__field {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 6px;
    padding: 3px 4px 3px 10px;
    border-radius: 24px;
    background: var(--ft-color-bg-soft);
    border: 1px solid var(--ft-color-border);
    > svg {
      width: 18px;
      height: 18px;
      flex: none;
      color: var(--ft-color-text-muted);
    }
    input {
      min-width: 0;
      flex: 1;
      height: auto;
      min-height: 36px;
      padding: 4px 0;
      line-height: 1.5;
      font: inherit;
      font-size: 16px;
      border: 0;
      background: transparent;
      color: inherit;
    }
    input::placeholder {
      color: var(--ft-color-text-muted);
    }
    button {
      min-height: 36px;
      border: 0;
      padding: 4px 14px;
      border-radius: 20px;
      background: var(--ft-color-primary);
      color: white;
      font-size: 14px;
    }
  }
  &__tabs {
    display: flex;
    justify-content: flex-start;
    gap: 28px;
    padding-left: 0;
    button {
      position: relative;
      background: none;
      border: 0;
      min-height: 44px;
      padding: 8px 4px;
      font-size: 17px;
      font-weight: 600;
    }
    [aria-current]::after {
      position: absolute;
      content: '';
      bottom: 3px;
      height: 3px;
      border-radius: 2px;
      left: 20%;
      right: 20%;
      background: var(--ft-color-primary);
    }
  }
  &__tools {
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--ft-color-border);
    padding: 2px 0;
    button {
      display: flex;
      gap: 4px;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 4px 8px;
      border: 0;
      background: transparent;
      font-size: 14px;
      white-space: nowrap;
    }
    button:last-child {
      margin-left: auto;
    }
    svg {
      width: 21px;
      height: 21px;
    }
    .unified-search__chevron {
      width: 14px;
      height: 14px;
      flex: none;
    }
    .is-active {
      color: var(--ft-color-primary);
    }
  }
  &__notice,
  &__count {
    font-size: 12px;
    color: var(--ft-color-text-muted);
    margin: 8px 0 0;
  }
  &__history {
    margin: 16px 0;
    header {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    h2 {
      margin: 0;
      font: 600 16px/1.5 var(--ft-font-family-body);
      flex: 1;
    }
    button {
      border: 0;
      background: none;
      min-height: 36px;
    }
  }
  &__suggestions {
    button {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 48px;
      border: 0;
      background: none;
      padding: 8px 4px;
      text-align: left;
    }
    svg {
      width: 18px;
      height: 18px;
      color: var(--ft-color-text-muted);
      flex: none;
    }
  }
  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
    span {
      display: flex;
      max-width: 100%;
      border-radius: 18px;
      background: var(--ft-color-bg-soft);
      padding: 0 10px;
    }
    button {
      font-size: 13px;
      overflow-wrap: anywhere;
      text-align: left;
    }
  }
  &__notes {
    columns: 2;
    column-gap: 10px;
    padding-top: 10px;
    > article {
      break-inside: avoid;
      margin-bottom: 12px;
    }
    p {
      margin: 4px 0;
      font-size: 11px;
      color: var(--ft-color-text-muted);
    }
  }
}
.search-sort {
  display: grid;
  button {
    display: flex;
    justify-content: space-between;
    padding: 12px 4px;
    min-height: 44px;
    border: 0;
    background: transparent;
    color: var(--ft-color-text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  [aria-pressed='true'] {
    color: var(--ft-color-primary);
  }
}
.search-filter {
  display: flex;
  min-height: 260px;
  max-height: 50dvh;
  nav {
    display: flex;
    flex-direction: column;
    width: 88px;
    flex: none;
    background: var(--ft-color-bg-soft);
    button {
      min-height: 48px;
      background: transparent;
      border: 0;
      color: var(--ft-color-text);
      font: inherit;
      cursor: pointer;
    }
    [aria-pressed='true'] {
      color: var(--ft-color-primary);
      background: var(--zine-paper-card);
      font-weight: 600;
    }
  }
  &__body {
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    overflow-y: auto;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
  }
  legend {
    margin-bottom: 12px;
    font-weight: 600;
  }
  label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    margin-right: 8px;
    font-size: 14px;
  }
  input[type='checkbox'],
  input[type='radio'] {
    accent-color: var(--ft-color-primary);
  }
  &__prices {
    display: flex;
    gap: 6px;
    align-items: center;
    label {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: start;
      min-width: 0;
      margin: 0;
    }
    input {
      box-sizing: border-box;
      width: 100%;
      padding: 8px;
      min-height: 40px;
      border: 1px solid var(--ft-color-border);
      border-radius: 8px;
      font: inherit;
      color: var(--ft-color-text);
      background: var(--zine-paper-card);
    }
  }
  &__actions {
    display: flex;
    gap: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--ft-color-border);
    button {
      flex: 1;
      min-height: 44px;
      border: 1px solid var(--ft-color-border);
      border-radius: 22px;
      font: inherit;
      background: var(--zine-paper-card);
      color: var(--ft-color-text);
      cursor: pointer;
    }
    button:last-child {
      background: var(--ft-color-primary);
      color: white;
      border-color: var(--ft-color-primary);
    }
  }
}
</style>
