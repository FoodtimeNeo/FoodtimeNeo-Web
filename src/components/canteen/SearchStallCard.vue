<script setup>
import { ref, watch, onUnmounted } from 'vue';
import { searchStallDishes } from '@/api/search.api.js';
import { recordedPrice } from '@/utils/priceHistory.js';
import { distanceLabel } from '@/utils/searchPresentation.js';
import MediaImage from '@/components/base/MediaImage.vue';
import SearchHighlight from '@/components/base/SearchHighlight.vue';
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
            <SearchHighlight
              :text="`${stall.name}（${stall.diningHallName}）`"
              :keyword="query.q"
            />
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
      :class="{ 'is-single': dishes.length === 1 && total <= 1 }"
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
            fit="cover"
          />
          <div class="search-stall__dish-copy">
            <h3 :title="dish.name">
              <SearchHighlight :text="dish.name" :keyword="query.q" />
            </h3>
            <p class="search-stall__metrics">
              <span class="search-stall__price">{{
                recordedPrice(dish.price, dish.priceUnit)
              }}</span
              ><small v-if="dish.averageScore != null"
                >★ {{ Number(dish.averageScore).toFixed(1) }}分</small
              >
            </p>
          </div>
        </RouterLink>
      </li>
    </ul>
    <button v-if="error" type="button" @click="more()">{{ error }}</button>
  </article>
</template>
<style scoped lang="scss">
.search-stall {
  padding: 14px 12px;
  margin-bottom: 10px;
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-card);
  background: var(--zine-paper-card);
  box-shadow: var(--ft-shadow-card);
  header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  &__identity {
    display: flex;
    min-width: 0;
    gap: 10px;
    flex: 1;
    align-items: center;
    text-decoration: none;
    color: inherit;
    > :deep(.media-image) {
      width: 44px;
      height: 44px;
      min-height: 0;
      flex: none;
      border-radius: 10px;
      overflow: hidden;
    }
    > div {
      min-width: 0;
    }
  }
  h2 {
    font: 700 15px/1.35 var(--ft-font-family-body);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    span {
      font-weight: 400;
    }
  }
  p {
    font-size: 12px;
    line-height: 1.45;
    color: var(--ft-color-text-muted);
    margin: 2px 0 0;
    strong {
      color: var(--zine-foil-gold);
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
    padding: 0 0 2px;
    margin: 0;
    scroll-snap-type: x proximity;
  }
  ul.is-single {
    display: block;
    overflow: visible;
    li a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      border-radius: 10px;
      background: var(--zine-paper-card-alt);
    }
    li :deep(.media-image) {
      width: 72px;
      height: 72px;
      flex: none;
      aspect-ratio: 1;
    }
    .search-stall__dish-copy {
      flex: 1;
      min-width: 0;
    }
    h3 {
      margin: 0 0 6px;
      font-size: 15px;
      font-weight: 700;
    }
    .search-stall__price {
      font-size: 15px;
    }
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
      border-radius: 9px;
      overflow: hidden;
      background: var(--zine-paper-card-alt);
    }
  }
  &__dish-copy {
    min-width: 0;
  }
  h3 {
    margin: 5px 0 2px;
    font: 600 13px/1.3 var(--ft-font-family-body);
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
  &__metrics {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 6px;
    margin: 0 !important;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }
  &__price {
    color: var(--ft-color-primary);
    font-size: 13px;
    font-weight: 700;
  }
  small {
    font-size: 11px;
    color: var(--zine-foil-gold);
    font-weight: 600;
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
