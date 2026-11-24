<script setup>
import { ref, watch, onUnmounted } from 'vue';
import { searchStallDishes } from '@/api/search.api.js';
import { recordedPrice } from '@/utils/priceHistory.js';
import { distanceLabel } from '@/utils/searchPresentation.js';
import MediaImage from '@/components/base/MediaImage.vue';
const props = defineProps({
  stall: { type: Object, required: true },
  columns: { type: Number, default: 4 },
  query: { type: Object, required: true },
});
const dishes = ref([]),
  loading = ref(false),
  error = ref('');
let controller,
  generation = 0,
  nextPage = 2,
  total = 0;
watch(
  () => [props.stall, props.query],
  () => {
    generation++;
    controller?.abort();
    dishes.value = [...props.stall.dishes];
    total = props.stall.matchCount;
    nextPage = 2;
    loading.value = false;
    error.value = '';
  },
  { immediate: true },
);
async function more(event) {
  const strip = event?.target;
  if (
    loading.value ||
    dishes.value.length >= total ||
    (strip && strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 36)
  )
    return;
  const request = ++generation;
  controller = new AbortController();
  loading.value = true;
  error.value = '';
  try {
    const page = await searchStallDishes(
      {
        ...props.query,
        stallId: props.stall.id,
        page: nextPage,
        size: props.query.previewSize,
      },
      { signal: controller.signal },
    );
    if (request !== generation) return;
    if (
      !Array.isArray(page.items) ||
      !Number.isSafeInteger(page.total) ||
      page.total < 0
    )
      throw new Error('返回数据异常');
    const seen = new Set(dishes.value.map((dish) => dish.id));
    dishes.value.push(...page.items.filter((dish) => !seen.has(dish.id)));
    nextPage++;
    total = page.total;
    if (!page.items.length) total = dishes.value.length;
  } catch (failure) {
    if (
      request === generation &&
      failure.name !== 'AbortError' &&
      failure.code !== 'CANCELLED'
    )
      error.value = '加载失败，重试';
  } finally {
    if (request === generation) loading.value = false;
  }
}
onUnmounted(() => {
  generation++;
  controller?.abort();
});
const dishRoute = (stall, dish) => ({
  name: 'dishDetail',
  params: { canteenId: stall.diningHallId, stallId: stall.id, dishId: dish.id },
});
</script>
<template>
  <article class="search-stall">
    <header>
      <RouterLink
        class="search-stall__identity"
        :to="{
          name: 'stallDetail',
          params: { canteenId: stall.diningHallId, stallId: stall.id },
        }"
      >
        <MediaImage :src="stall.imageUrl" :alt="stall.name" compact />
        <div>
          <h2>
            {{ stall.name }}<span>（{{ stall.diningHallName }}）</span>
          </h2>
          <p>
            <strong v-if="stall.averageScore != null"
              >★ {{ Number(stall.averageScore).toFixed(1) }}</strong
            ><span v-else>暂无评分</span> · {{ stall.reviewCount }}条点评
          </p>
        </div>
      </RouterLink>
      <small v-if="distanceLabel(stall.distanceMeters)">{{
        distanceLabel(stall.distanceMeters)
      }}</small>
    </header>
    <ul
      :style="{ '--columns': columns }"
      aria-label="匹配菜品"
      tabindex="0"
      :aria-busy="loading"
      @scroll.passive="more"
    >
      <li v-for="dish in dishes" :key="dish.id">
        <RouterLink :to="dishRoute(stall, dish)">
          <MediaImage
            :src="dish.imageUrl"
            :alt="dish.name"
            compact
            fit="contain"
          />
          <h3>{{ dish.name }}</h3>
          <p class="search-stall__metrics">
            <span class="search-stall__price">{{
              recordedPrice(dish.price, dish.priceUnit)
            }}</span
            ><small v-if="dish.averageScore != null"
              >{{ Number(dish.averageScore).toFixed(1) }}分</small
            >
          </p>
        </RouterLink>
      </li>
    </ul>
    <button v-if="error" type="button" @click="more()">{{ error }}</button>
  </article>
</template>
<style scoped lang="scss">
.search-stall {
  padding: 12px 0;
  border-bottom: 1px solid var(--ft-color-border);
  header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  &__identity {
    display: flex;
    min-width: 0;
    gap: 8px;
    flex: 1;
    align-items: center;
    text-decoration: none;
    color: inherit;
    > :deep(.media-image) {
      width: 44px;
      height: 44px;
      min-height: 0;
      flex: none;
      border-radius: 8px;
    }
    > div {
      min-width: 0;
    }
  }
  h2 {
    font: 600 15px/1.4 var(--ft-font-family-body);
    margin: 0;
    overflow-wrap: anywhere;
    span {
      font-weight: 400;
    }
  }
  p {
    font-size: 12px;
    line-height: 1.5;
    color: var(--ft-color-text-muted);
    margin: 2px 0 0;
    strong {
      color: var(--ft-color-primary);
    }
  }
  header small {
    font-size: 11px;
    color: var(--ft-color-text-muted);
    flex: none;
  }
  ul {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: calc(
      (100% - (var(--columns) - 1) * 8px) / var(--columns)
    );
    gap: 8px;
    overflow-x: auto;
    list-style: none;
    padding: 0 0 4px;
    margin: 0;
    scroll-snap-type: x proximity;
  }
  li {
    min-width: 0;
    scroll-snap-align: start;
    a {
      text-decoration: none;
      color: inherit;
      display: block;
    }
    :deep(.media-image) {
      width: 100%;
      height: auto;
      min-height: 0;
      aspect-ratio: 1;
      border-radius: 7px;
    }
  }
  h3 {
    margin: 3px 0 1px;
    font: 500 13px/1.3 var(--ft-font-family-body);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  &__metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 0 4px;
    margin: 0 !important;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }
  &__price {
    color: var(--ft-color-primary);
    font-size: 13px;
    font-weight: 600;
  }
  small {
    font-size: 11px;
    color: var(--ft-color-text-muted);
  }
  button {
    min-height: 36px;
    padding: 4px 0;
    border: 0;
    background: transparent;
    color: var(--ft-color-text-muted);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }
}
</style>
