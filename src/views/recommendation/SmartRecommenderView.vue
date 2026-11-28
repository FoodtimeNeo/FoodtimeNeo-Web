<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { fetchCanteens } from '@/api/canteen.api.js';
import {
  fetchDishTags,
  querySmartDishRecommendations,
} from '@/api/smartRecommend.api.js';
import { useSearchLocation } from '@/composables/useSearchLocation.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import {
  DEFAULT_DISH_TAGS,
  dishTagBadges,
  dishTagLabel,
  groupDishTags,
} from '@/utils/dishTags.js';
import { recordedPrice } from '@/utils/priceHistory.js';
import { distanceLabel } from '@/utils/searchPresentation.js';
import { getDishCoverImage } from '@/utils/homeVisuals.js';
import MediaImage from '@/components/base/MediaImage.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import EmptyState from '@/components/base/EmptyState.vue';

const STORAGE_KEY = 'foodtime_smart_recommender_v1';
const BUDGET_PRESETS = [
  { label: '不限预算', min: '', max: '' },
  { label: '¥10 以内', min: '', max: '10' },
  { label: '¥15 以内', min: '', max: '15' },
  { label: '¥20 以内', min: '', max: '20' },
  { label: '¥25 以内', min: '', max: '25' },
];
const RATING_PRESETS = [
  { label: '不限', value: '' },
  { label: '3.5★+', value: '3.5' },
  { label: '4.0★+', value: '4.0' },
  { label: '4.5★+', value: '4.5' },
];
const SORT_OPTIONS = [
  { value: 'match', label: '综合推荐' },
  { value: 'price_asc', label: '价格最低' },
  { value: 'rating_desc', label: '评分最高' },
  { value: 'distance', label: '距离最近' },
];

const router = useRouter();
const auth = useAuthStore();
const location = useSearchLocation();

const halls = ref([]);
const hallsError = ref('');
const tagCatalog = ref([...DEFAULT_DISH_TAGS]);
const tagGroups = computed(() => groupDishTags(tagCatalog.value));

const form = reactive({
  diningHallIds: [],
  minPrice: '',
  maxPrice: '',
  portionOnly: true,
  minRating: '',
  includeTags: [],
  excludeTags: [],
  sort: 'match',
});

const excludeDishIds = ref([]);
const seed = ref(0);
const loading = ref(false);
const hasQueried = ref(false);
const validation = ref('');
const error = ref('');
const result = ref(null);
let controller = null;
let requestSeq = 0;

function storageKeyForUser() {
  return `${STORAGE_KEY}:${auth.user?.id || 'guest'}`;
}

function restoreState() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const raw = sessionStorage.getItem(storageKeyForUser());
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.diningHallIds))
      form.diningHallIds = saved.diningHallIds.map(String);
    if (typeof saved.minPrice === 'string') form.minPrice = saved.minPrice;
    if (typeof saved.maxPrice === 'string') form.maxPrice = saved.maxPrice;
    if (typeof saved.portionOnly === 'boolean')
      form.portionOnly = saved.portionOnly;
    if (typeof saved.minRating === 'string') form.minRating = saved.minRating;
    if (Array.isArray(saved.includeTags))
      form.includeTags = saved.includeTags.map(String);
    if (Array.isArray(saved.excludeTags))
      form.excludeTags = saved.excludeTags.map(String);
    if (
      typeof saved.sort === 'string' &&
      SORT_OPTIONS.some((o) => o.value === saved.sort) &&
      saved.sort !== 'distance'
    ) {
      form.sort = saved.sort;
    }
  } catch {
    // Ignore corrupt session state
  }
}

function persistState() {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(
      storageKeyForUser(),
      JSON.stringify({
        diningHallIds: form.diningHallIds,
        minPrice: form.minPrice,
        maxPrice: form.maxPrice,
        portionOnly: form.portionOnly,
        minRating: form.minRating,
        includeTags: form.includeTags,
        excludeTags: form.excludeTags,
        sort: form.sort === 'distance' ? 'match' : form.sort,
      }),
    );
  } catch {
    // Ignore storage quota errors
  }
}

watch(
  () => ({
    diningHallIds: [...form.diningHallIds],
    minPrice: form.minPrice,
    maxPrice: form.maxPrice,
    portionOnly: form.portionOnly,
    minRating: form.minRating,
    includeTags: [...form.includeTags],
    excludeTags: [...form.excludeTags],
    sort: form.sort,
  }),
  () => {
    persistState();
    excludeDishIds.value = [];
  },
  { deep: true },
);

function toggleHall(id) {
  const idx = form.diningHallIds.indexOf(id);
  if (idx >= 0) form.diningHallIds.splice(idx, 1);
  else form.diningHallIds.push(id);
}

function applyBudgetPreset(preset) {
  form.minPrice = preset.min;
  form.maxPrice = preset.max;
  validation.value = '';
}

function isBudgetPresetActive(preset) {
  return form.minPrice === preset.min && form.maxPrice === preset.max;
}

function toggleIncludeTag(code) {
  const idx = form.includeTags.indexOf(code);
  if (idx >= 0) {
    form.includeTags.splice(idx, 1);
  } else {
    form.includeTags.push(code);
    const exIdx = form.excludeTags.indexOf(code);
    if (exIdx >= 0) form.excludeTags.splice(exIdx, 1);
  }
}

function toggleExcludeTag(code) {
  const idx = form.excludeTags.indexOf(code);
  if (idx >= 0) {
    form.excludeTags.splice(idx, 1);
  } else {
    form.excludeTags.push(code);
    const inIdx = form.includeTags.indexOf(code);
    if (inIdx >= 0) form.includeTags.splice(inIdx, 1);
  }
}

async function selectSort(nextSort) {
  validation.value = '';
  if (nextSort === 'distance') {
    const ok = await location.locate();
    if (!ok) return;
  }
  form.sort = nextSort;
  if (hasQueried.value) void runRecommend({ keepSeed: true });
}

function resetAll() {
  form.diningHallIds = [];
  form.minPrice = '';
  form.maxPrice = '';
  form.portionOnly = true;
  form.minRating = '';
  form.includeTags = [];
  form.excludeTags = [];
  form.sort = 'match';
  excludeDishIds.value = [];
  seed.value = 0;
  validation.value = '';
  error.value = '';
  void runRecommend({ keepSeed: true });
}

function validatePrices() {
  const values = [form.minPrice, form.maxPrice];
  if (
    values.some(
      (v) => v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0),
    )
  ) {
    validation.value = '预算价格须为非负数字';
    return false;
  }
  if (values.every((v) => v !== '') && Number(values[0]) > Number(values[1])) {
    validation.value = '最低预算不能高于最高预算';
    return false;
  }
  validation.value = '';
  return true;
}

function buildRequestBody(currentSeed) {
  const body = {
    portionOnly: form.portionOnly,
    sort: form.sort,
    limit: 12,
    seed: currentSeed,
  };
  if (form.diningHallIds.length) body.diningHallIds = [...form.diningHallIds];
  if (form.minPrice !== '') body.minPrice = Number(form.minPrice);
  if (form.maxPrice !== '') body.maxPrice = Number(form.maxPrice);
  if (form.minRating !== '') body.minRating = Number(form.minRating);
  if (form.includeTags.length) body.includeTags = [...form.includeTags];
  if (form.excludeTags.length) body.excludeTags = [...form.excludeTags];
  if (excludeDishIds.value.length)
    body.excludeDishIds = [...excludeDishIds.value];
  const point = location.position.value;
  if (point && Date.now() - point.acquiredAt <= 300000) {
    body.latitude = point.latitude;
    body.longitude = point.longitude;
  } else if (form.sort === 'distance') {
    throw new Error('定位已过期，请重新点击「距离最近」获取位置');
  }
  return body;
}

async function runRecommend({ roll = false, keepSeed = false } = {}) {
  if (!validatePrices()) return;
  if (roll) {
    if (result.value?.picked?.id) {
      const nextExcluded = new Set(excludeDishIds.value);
      nextExcluded.add(result.value.picked.id);
      if (nextExcluded.size > 40) {
        const trimmed = [...nextExcluded].slice(-40);
        excludeDishIds.value = trimmed;
      } else {
        excludeDishIds.value = [...nextExcluded];
      }
    }
    seed.value = seed.value + 1 || Date.now() % 100000;
  } else if (!keepSeed) {
    excludeDishIds.value = [];
    seed.value = 0;
  }

  let body;
  try {
    body = buildRequestBody(seed.value);
  } catch (err) {
    validation.value = err.message;
    return;
  }

  controller?.abort();
  controller = new AbortController();
  const seq = ++requestSeq;
  loading.value = true;
  error.value = '';
  try {
    const data = await querySmartDishRecommendations(body, {
      signal: controller.signal,
    });
    if (seq !== requestSeq) return;
    result.value = data;
    hasQueried.value = true;
  } catch (err) {
    if (
      seq === requestSeq &&
      err.name !== 'AbortError' &&
      err.code !== 'CANCELLED'
    ) {
      error.value = err.message || '推荐服务暂时不可用，请稍后再试';
    }
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

function applyOneClickRelax() {
  if (form.maxPrice !== '') {
    const bumped = Math.ceil(Number(form.maxPrice) * 1.3);
    form.maxPrice = String(bumped);
  }
  if (form.portionOnly) form.portionOnly = false;
  if (form.minRating) form.minRating = '';
  void runRecommend();
}

function jumpToUnifiedSearch() {
  const query = { browse: '1' };
  if (form.diningHallIds.length) query.halls = [...form.diningHallIds];
  if (form.minPrice !== '') query.minPrice = form.minPrice;
  if (form.maxPrice !== '') query.maxPrice = form.maxPrice;
  if (form.portionOnly) query.portionOnly = '1';
  if (form.minRating !== '') query.minRating = form.minRating;
  if (form.includeTags.length) query.tags = [...form.includeTags];
  if (form.excludeTags.length) query.excludeTags = [...form.excludeTags];
  void router.push({ name: 'dishSearch', query });
}

function dishRoute(dish) {
  return {
    name: 'dishDetail',
    params: {
      canteenId: dish.diningHallId,
      stallId: dish.stallId,
      dishId: dish.id,
    },
  };
}

const activeSummary = computed(() => {
  const parts = [];
  if (form.maxPrice !== '' && form.minPrice !== '') {
    parts.push(`¥${form.minPrice}–¥${form.maxPrice}`);
  } else if (form.maxPrice !== '') {
    parts.push(`¥${form.maxPrice} 以内`);
  } else if (form.minPrice !== '') {
    parts.push(`¥${form.minPrice} 以上`);
  }
  if (form.portionOnly) parts.push('仅按份/碗');
  if (form.diningHallIds.length)
    parts.push(`已选 ${form.diningHallIds.length} 个食堂`);
  if (form.includeTags.length) {
    parts.push(
      `想吃：${form.includeTags.map((c) => dishTagLabel(c, tagCatalog.value)).join('、')}`,
    );
  }
  if (form.excludeTags.length) {
    parts.push(
      `忌口：${form.excludeTags.map((c) => dishTagLabel(c, tagCatalog.value)).join('、')}`,
    );
  }
  return parts.join(' · ') || '不限条件 · 按全校口碑探索';
});

onMounted(async () => {
  restoreState();
  const [hallsResult, tagsResult] = await Promise.allSettled([
    fetchCanteens(),
    fetchDishTags(),
  ]);
  if (hallsResult.status === 'fulfilled' && Array.isArray(hallsResult.value)) {
    halls.value = hallsResult.value;
  } else if (hallsResult.status === 'rejected') {
    hallsError.value = hallsResult.reason?.message || '食堂列表加载失败';
  }
  if (
    tagsResult.status === 'fulfilled' &&
    Array.isArray(tagsResult.value) &&
    tagsResult.value.length
  ) {
    tagCatalog.value = tagsResult.value;
  }
  void runRecommend({ keepSeed: true });
});

onUnmounted(() => {
  controller?.abort();
  location.clear();
});
</script>

<template>
  <section class="smart-rec">
    <header class="smart-rec__hero">
      <div class="smart-rec__hero-top">
        <RouterLink class="smart-rec__back" :to="{ name: 'home' }"
          >← 返回首页</RouterLink
        >
        <button
          type="button"
          class="smart-rec__search-link"
          @click="jumpToUnifiedSearch"
        >
          带着条件去搜菜 →
        </button>
      </div>
      <span class="sticker sticker--r-2">高自由度精准选餐</span>
      <h1 class="smart-rec__title">今天吃什么</h1>
      <p class="smart-rec__subtitle">
        自由组合单份预算、食堂范围、主食肉类做法与忌口排除；不想纠结就点「帮我抽一道」。
      </p>
    </header>

    <div class="smart-rec__studio">
      <!-- 1. 单份预算 -->
      <fieldset class="smart-rec__group">
        <legend>单份预算</legend>
        <div class="smart-rec__chips">
          <button
            v-for="preset in BUDGET_PRESETS"
            :key="preset.label"
            type="button"
            class="smart-rec__chip"
            :class="{ 'is-active': isBudgetPresetActive(preset) }"
            :aria-pressed="isBudgetPresetActive(preset)"
            @click="applyBudgetPreset(preset)"
          >
            {{ preset.label }}
          </button>
        </div>
        <div class="smart-rec__price-inputs">
          <label>
            <span>最低 ¥</span>
            <input
              v-model="form.minPrice"
              type="number"
              min="0"
              step="0.5"
              inputmode="decimal"
              placeholder="不限"
            />
          </label>
          <span class="smart-rec__dash">—</span>
          <label>
            <span>最高 ¥</span>
            <input
              v-model="form.maxPrice"
              type="number"
              min="0"
              step="0.5"
              inputmode="decimal"
              placeholder="不限"
            />
          </label>
        </div>
        <label class="smart-rec__toggle">
          <input v-model="form.portionOnly" type="checkbox" />
          <span>仅看按份或碗计价（排除称重、按个及未标价菜品）</span>
        </label>
      </fieldset>

      <!-- 2. 食堂范围 -->
      <fieldset class="smart-rec__group">
        <legend>食堂范围（不选为全部）</legend>
        <p v-if="hallsError" role="status" class="smart-rec__hint">
          {{ hallsError }}
        </p>
        <div class="smart-rec__chips">
          <button
            v-for="hall in halls"
            :key="hall.id"
            type="button"
            class="smart-rec__chip"
            :class="{ 'is-active': form.diningHallIds.includes(hall.id) }"
            :aria-pressed="form.diningHallIds.includes(hall.id)"
            @click="toggleHall(hall.id)"
          >
            {{ hall.name }}
          </button>
        </div>
      </fieldset>

      <!-- 3. 四维标签想吃 -->
      <fieldset class="smart-rec__group">
        <legend>我想吃（同组多选为任意命中，跨组为同时满足）</legend>
        <div
          v-for="group in tagGroups"
          :key="group.dimension"
          class="smart-rec__dim"
        >
          <span class="smart-rec__dim-label">{{ group.dimensionLabel }}</span>
          <div class="smart-rec__chips">
            <button
              v-for="tag in group.items"
              :key="tag.code"
              type="button"
              class="smart-rec__chip"
              :class="{ 'is-active': form.includeTags.includes(tag.code) }"
              :aria-pressed="form.includeTags.includes(tag.code)"
              @click="toggleIncludeTag(tag.code)"
            >
              {{ tag.label }}
            </button>
          </div>
        </div>
      </fieldset>

      <!-- 4. 忌口 / 排除 -->
      <fieldset class="smart-rec__group smart-rec__group--exclude">
        <legend>忌口 / 绝不想吃（近似放宽也绝不突破）</legend>
        <div class="smart-rec__chips">
          <button
            v-for="tag in tagCatalog"
            :key="tag.code"
            type="button"
            class="smart-rec__chip smart-rec__chip--exclude"
            :class="{ 'is-active': form.excludeTags.includes(tag.code) }"
            :aria-pressed="form.excludeTags.includes(tag.code)"
            @click="toggleExcludeTag(tag.code)"
          >
            ✕ {{ tag.label }}
          </button>
        </div>
      </fieldset>

      <!-- 5. 评分与排序 -->
      <div class="smart-rec__row">
        <fieldset class="smart-rec__group">
          <legend>最低口碑</legend>
          <div class="smart-rec__chips">
            <button
              v-for="opt in RATING_PRESETS"
              :key="opt.label"
              type="button"
              class="smart-rec__chip"
              :class="{ 'is-active': form.minRating === opt.value }"
              :aria-pressed="form.minRating === opt.value"
              @click="form.minRating = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </fieldset>
        <fieldset class="smart-rec__group">
          <legend>排序偏好</legend>
          <div class="smart-rec__chips">
            <button
              v-for="opt in SORT_OPTIONS"
              :key="opt.value"
              type="button"
              class="smart-rec__chip"
              :class="{ 'is-active': form.sort === opt.value }"
              :disabled="opt.value === 'distance' && location.locating.value"
              :aria-pressed="form.sort === opt.value"
              @click="selectSort(opt.value)"
            >
              {{
                opt.value === 'distance' && location.locating.value
                  ? '定位中…'
                  : opt.label
              }}
            </button>
          </div>
          <p v-if="location.error.value" role="status" class="smart-rec__hint">
            {{ location.error.value }}
          </p>
        </fieldset>
      </div>

      <p v-if="validation" role="alert" class="smart-rec__alert">
        {{ validation }}
      </p>

      <div class="smart-rec__actions">
        <button
          type="button"
          class="button-ink is-primary"
          :disabled="loading"
          @click="runRecommend()"
        >
          {{ loading ? '匹配中…' : '精准推荐' }}
        </button>
        <button
          type="button"
          class="button-ink smart-rec__roll-btn"
          :disabled="loading"
          @click="runRecommend({ roll: true })"
        >
          帮我抽一道
        </button>
        <button
          type="button"
          class="smart-rec__reset-btn"
          :disabled="loading"
          @click="resetAll"
        >
          重置条件
        </button>
      </div>
      <p class="smart-rec__summary">当前条件：{{ activeSummary }}</p>
    </div>

    <LoadingState v-if="loading && !result" message="正在挑选最合胃口的菜品…" />
    <ErrorState
      v-else-if="error"
      title="推荐请求失败"
      :description="error"
      @retry="runRecommend({ keepSeed: true })"
    />

    <template v-else-if="result">
      <!-- 近似放宽横幅 -->
      <aside
        v-if="!result.exactMode && result.items.length"
        class="smart-rec__relaxed"
        role="status"
      >
        <div class="smart-rec__relaxed-body">
          <strong>当前严格组合暂无完全匹配，已为你挑选最接近的菜品</strong>
          <ul>
            <li v-for="hint in result.relaxedHints" :key="hint">{{ hint }}</li>
          </ul>
        </div>
        <button
          type="button"
          class="smart-rec__relax-btn"
          @click="applyOneClickRelax"
        >
          一键放宽筛选
        </button>
      </aside>

      <EmptyState
        v-if="!result.items.length"
        title="没有找到符合当前食堂与忌口条件的菜品"
        description="可以取消部分忌口或切换到全部食堂再试试。"
      />

      <template v-else>
        <!-- 今日这一顿主推 Spotlight -->
        <article
          v-if="result.picked"
          class="smart-rec__spotlight"
          aria-label="本次抽中主推菜品"
        >
          <div class="smart-rec__spotlight-media">
            <MediaImage
              v-if="result.picked.imageUrl"
              :src="result.picked.imageUrl"
              :alt="result.picked.name"
              fit="cover"
            />
            <img
              v-else
              :src="getDishCoverImage(result.picked)"
              :alt="result.picked.name"
              class="smart-rec__fallback-img"
            />
          </div>
          <div class="smart-rec__spotlight-body">
            <div class="smart-rec__spotlight-eyebrow">
              <span>{{
                result.exactMode
                  ? '精准命中 · 就吃这道'
                  : '近似首选 · 最接近口味'
              }}</span>
              <span v-if="result.exactMode" class="smart-rec__exact-count">
                共 {{ result.exactTotal }} 道完全符合
              </span>
            </div>
            <h2>{{ result.picked.name }}</h2>
            <p class="smart-rec__venue">
              {{ result.picked.diningHallName }} · {{ result.picked.stallName }}
              <span v-if="distanceLabel(result.picked.distanceMeters)">
                · {{ distanceLabel(result.picked.distanceMeters) }}
              </span>
            </p>
            <p class="smart-rec__price">
              {{ recordedPrice(result.picked.price, result.picked.priceUnit) }}
              <small v-if="result.picked.averageScore != null">
                ★ {{ Number(result.picked.averageScore).toFixed(1) }}（{{
                  result.picked.reviewCount
                }}评）
              </small>
            </p>
            <div v-if="result.picked.reasons.length" class="smart-rec__reasons">
              <span
                v-for="reason in result.picked.reasons"
                :key="reason"
                class="smart-rec__reason-pill"
              >
                {{ reason }}
              </span>
            </div>
            <div
              v-if="result.picked.missedRequirements.length"
              class="smart-rec__missed"
            >
              <span
                v-for="miss in result.picked.missedRequirements"
                :key="miss"
                class="smart-rec__miss-pill"
              >
                {{ miss }}
              </span>
            </div>
            <div class="smart-rec__spotlight-cta">
              <RouterLink
                class="button-ink is-primary"
                :to="dishRoute(result.picked)"
              >
                查看菜品详情 →
              </RouterLink>
              <button
                type="button"
                class="button-ink"
                :disabled="loading"
                @click="runRecommend({ roll: true })"
              >
                换一道
              </button>
            </div>
          </div>
        </article>

        <!-- 候选清单 -->
        <div class="smart-rec__list-head">
          <h3>推荐清单（{{ result.items.length }} 道）</h3>
        </div>
        <ul class="smart-rec__grid">
          <li
            v-for="dish in result.items"
            :key="dish.id"
            class="smart-rec__card"
          >
            <RouterLink :to="dishRoute(dish)" class="smart-rec__card-link">
              <div class="smart-rec__card-media">
                <MediaImage
                  v-if="dish.imageUrl"
                  :src="dish.imageUrl"
                  :alt="dish.name"
                  compact
                  fit="cover"
                />
                <img
                  v-else
                  :src="getDishCoverImage(dish)"
                  :alt="dish.name"
                  class="smart-rec__fallback-img"
                />
              </div>
              <div class="smart-rec__card-body">
                <h4>{{ dish.name }}</h4>
                <p class="smart-rec__card-venue">
                  {{ dish.diningHallName }} · {{ dish.stallName }}
                </p>
                <p class="smart-rec__card-metrics">
                  <strong>{{
                    recordedPrice(dish.price, dish.priceUnit)
                  }}</strong>
                  <small v-if="dish.averageScore != null">
                    ★ {{ Number(dish.averageScore).toFixed(1) }}
                  </small>
                  <small v-if="distanceLabel(dish.distanceMeters)">
                    {{ distanceLabel(dish.distanceMeters) }}
                  </small>
                </p>
                <div class="smart-rec__tags">
                  <span
                    v-for="badge in dishTagBadges(dish.tags, tagCatalog, 3)"
                    :key="badge.code"
                    class="smart-rec__tag"
                    :class="{
                      'is-matched': dish.matchedTags.includes(badge.code),
                    }"
                  >
                    {{ badge.label }}
                  </span>
                </div>
                <p v-if="dish.reasons.length" class="smart-rec__card-reason">
                  {{ dish.reasons.slice(0, 2).join(' · ') }}
                </p>
                <p
                  v-if="dish.missedRequirements.length"
                  class="smart-rec__card-miss"
                >
                  近似提示：{{ dish.missedRequirements.join('；') }}
                </p>
              </div>
            </RouterLink>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>

<style scoped lang="scss">
.smart-rec {
  width: min(calc(100% - var(--zine-page-padding) * 2), 960px);
  margin: var(--ft-space-4) auto var(--ft-space-6);
  display: grid;
  gap: 20px;

  &__hero {
    padding: clamp(20px, 3.5vw, 32px);
    background: var(--zine-paper-card);
    border: 1.5px solid var(--ft-color-secondary);
    box-shadow: 5px 5px 0 var(--ft-color-secondary);
    border-radius: var(--ft-radius-sm, 2px);
  }

  &__hero-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__back,
  &__search-link {
    font-size: 13px;
    font-weight: 700;
    color: var(--ft-color-primary);
    text-decoration: none;
    background: none;
    border: 0;
    padding: 4px 0;
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  }

  &__title {
    margin: 10px 0 6px;
    font-family: var(--ft-font-family-title);
    font-size: clamp(28px, 4vw, 40px);
    font-weight: 900;
    color: var(--ft-color-secondary);
  }

  &__subtitle {
    margin: 0;
    color: var(--ft-color-text-muted);
    font-size: 14px;
    line-height: 1.6;
  }

  &__studio {
    padding: clamp(16px, 3vw, 24px);
    background: var(--zine-paper-card);
    border: 1px solid var(--ft-border-subtle);
    border-radius: var(--ft-radius-lg);
    box-shadow: var(--ft-shadow-card);
    display: grid;
    gap: 18px;
  }

  &__group {
    border: 0;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 10px;

    legend {
      font-weight: 800;
      font-size: 14px;
      color: var(--ft-color-secondary);
      margin-bottom: 4px;
    }
  }

  &__group--exclude {
    padding-top: 12px;
    border-top: 1px dashed var(--ft-border-subtle);
  }

  &__dim {
    display: grid;
    gap: 6px;
  }

  &__dim-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--ft-color-text-muted);
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__chip {
    min-height: 36px;
    padding: 6px 13px;
    border-radius: var(--ft-radius-pill);
    border: 1px solid var(--ft-border-control);
    background: var(--zine-paper-card-alt);
    color: var(--ft-color-text);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--ft-transition-fast);

    &:hover:not(:disabled) {
      border-color: var(--ft-color-primary);
    }

    &.is-active {
      background: var(--ft-color-primary);
      border-color: var(--ft-color-primary);
      color: #fff;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  &__chip--exclude.is-active {
    background: var(--ft-color-secondary);
    border-color: var(--ft-color-secondary);
    color: var(--zine-paper-card);
  }

  &__price-inputs {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    max-width: 340px;

    label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      font-size: 13px;
      color: var(--ft-color-text-muted);

      span {
        flex: none;
      }
    }

    input {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      min-height: 38px;
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid var(--ft-border-control);
      background: var(--zine-paper-card);
      color: var(--ft-color-text);
      font: inherit;
    }
  }

  &__toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ft-color-secondary);
    cursor: pointer;

    input {
      width: 18px;
      height: 18px;
      accent-color: var(--ft-color-primary);
    }
  }

  &__row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  &__hint {
    margin: 0;
    font-size: 12px;
    color: var(--ft-color-text-muted);
  }

  &__alert {
    margin: 0;
    color: var(--ft-color-danger);
    font-size: 13px;
    font-weight: 700;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding-top: 4px;
  }

  &__roll-btn {
    background: var(--zine-paper-card-alt);
  }

  &__reset-btn {
    margin-left: auto;
    min-height: 40px;
    padding: 6px 12px;
    border: 0;
    background: transparent;
    color: var(--ft-color-text-muted);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;

    &:hover {
      color: var(--ft-color-primary);
      text-decoration: underline;
    }
  }

  &__summary {
    margin: 0;
    font-size: 12px;
    color: var(--ft-color-text-muted);
    padding-top: 8px;
    border-top: 1px solid var(--ft-border-subtle);
  }

  &__relaxed {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    flex-wrap: wrap;
    padding: 14px 18px;
    border-radius: var(--ft-radius-md);
    border: 1px solid rgb(217 119 6 / 45%);
    background: rgb(217 119 6 / 14%);
    color: var(--ft-color-text);

    strong {
      display: block;
      font-size: 14px;
      color: var(--zine-foil-gold);
      margin-bottom: 6px;
    }

    ul {
      margin: 0;
      padding-left: 18px;
      font-size: 13px;
      line-height: 1.5;
    }
  }

  &__relax-btn {
    min-height: 40px;
    padding: 6px 14px;
    border-radius: var(--ft-radius-pill);
    border: 1px solid var(--ft-color-secondary);
    background: var(--zine-paper-card);
    color: var(--ft-color-secondary);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    flex: none;
  }

  &__spotlight {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    overflow: hidden;
    background: var(--zine-paper-card);
    border: 1.5px solid var(--ft-color-primary);
    border-radius: var(--ft-radius-lg);
    box-shadow: 5px 5px 0 rgb(201 52 30 / 18%);
  }

  &__spotlight-media {
    background: var(--zine-paper-card-alt);
    min-height: 220px;
    overflow: hidden;
    :deep(.media-image),
    :deep(img) {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__fallback-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__spotlight-body {
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;

    h2 {
      margin: 0;
      font-family: var(--ft-font-family-title);
      font-size: clamp(22px, 3vw, 28px);
      font-weight: 900;
      color: var(--ft-color-secondary);
    }
  }

  &__spotlight-eyebrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 12px;
    font-weight: 800;
    color: var(--ft-color-primary);
  }

  &__exact-count {
    color: var(--ft-color-text-muted);
    font-weight: 600;
  }

  &__venue {
    margin: 0;
    font-size: 13px;
    color: var(--ft-color-text-muted);
  }

  &__price {
    margin: 0;
    font-family: var(--ft-font-family-title);
    font-size: 24px;
    font-weight: 900;
    color: var(--ft-color-primary);
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;

    small {
      font-family: var(--ft-font-family-body);
      font-size: 13px;
      color: var(--zine-foil-gold);
      font-weight: 700;
    }
  }

  &__reasons,
  &__missed {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  &__reason-pill {
    font-size: 12px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: var(--ft-radius-pill);
    background: var(--zine-paper-card-alt);
    border: 1px solid var(--ft-border-subtle);
    color: var(--ft-color-secondary);
  }

  &__miss-pill {
    font-size: 12px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: var(--ft-radius-pill);
    background: rgb(217 119 6 / 18%);
    border: 1px solid rgb(217 119 6 / 35%);
    color: var(--zine-foil-gold);
  }

  &__spotlight-cta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: auto;
    padding-top: 6px;
    a {
      text-decoration: none;
    }
  }

  &__list-head {
    h3 {
      margin: 0;
      font-size: 17px;
      font-weight: 800;
      color: var(--ft-color-secondary);
    }
  }

  &__grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  &__card {
    background: var(--zine-paper-card);
    border: 1px solid var(--ft-border-subtle);
    border-radius: var(--ft-radius-card);
    overflow: hidden;
    box-shadow: var(--ft-shadow-card);
    transition: transform var(--ft-transition-fast);

    &:hover {
      transform: translateY(-2px);
    }
  }

  &__card-link {
    display: flex;
    gap: 12px;
    padding: 12px;
    text-decoration: none;
    color: inherit;
    height: 100%;
  }

  &__card-media {
    width: 88px;
    height: 88px;
    flex: none;
    border-radius: 10px;
    overflow: hidden;
    background: var(--zine-paper-card-alt);

    :deep(.media-image),
    :deep(img) {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__card-body {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
      color: var(--ft-color-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  &__card-venue {
    margin: 0;
    font-size: 12px;
    color: var(--ft-color-text-muted);
  }

  &__card-metrics {
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;

    strong {
      color: var(--ft-color-primary);
      font-size: 14px;
    }

    small {
      font-size: 12px;
      color: var(--zine-foil-gold);
      font-weight: 700;
    }
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  &__tag {
    font-size: 11px;
    padding: 1px 7px;
    border-radius: var(--ft-radius-pill);
    background: var(--zine-paper-card-alt);
    color: var(--ft-color-text-muted);

    &.is-matched {
      background: var(--zine-stamp-red-soft);
      color: var(--ft-color-primary);
      font-weight: 700;
    }
  }

  &__card-reason {
    margin: 2px 0 0;
    font-size: 11px;
    color: var(--ft-color-text-muted);
  }

  &__card-miss {
    margin: 0;
    font-size: 11px;
    color: var(--zine-foil-gold);
    font-weight: 600;
  }
}

@media (max-width: 720px) {
  .smart-rec {
    &__row,
    &__grid,
    &__spotlight {
      grid-template-columns: 1fr;
    }

    &__spotlight-media {
      max-height: 210px;
    }

    &__reset-btn {
      margin-left: 0;
    }
  }
}
</style>
