<script setup>
import { computed, ref } from 'vue';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchCanteens } from '@/api/canteen.api.js';
import { useCatalogSearch } from '@/composables/useCatalogSearch.js';
import { useCampusLocation } from '@/composables/useCampusLocation.js';
import { hallDistanceMeters } from '@/utils/campusProjection.js';
import CatalogSearch from '@/components/canteen/CatalogSearch.vue';
import CanteenEntryCard from '@/components/home/CanteenEntryCard.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';

const {
  data: canteens,
  error,
  initialLoading: loading,
  load,
} = useAsyncData(fetchCanteens, {
  initial: [],
  cacheKey: 'canteens_list',
  ttl: 0,
});
const { query, matches: filteredCanteens } = useCatalogSearch(
  canteens,
  'canteens',
);
const {
  position: userFix,
  locating,
  error: locationError,
  locateOnce,
} = useCampusLocation();
const sortByDistance = ref(false);

async function toggleDistanceSort() {
  if (sortByDistance.value && userFix.value) {
    sortByDistance.value = false;
    return;
  }
  const fix = await locateOnce();
  if (fix) sortByDistance.value = true;
}

const displayedCanteens = computed(() => {
  const list = filteredCanteens.value;
  if (!sortByDistance.value || !userFix.value) return list;
  return [...list].sort((a, b) => {
    const da = hallDistanceMeters(a, userFix.value) ?? Infinity;
    const db = hallDistanceMeters(b, userFix.value) ?? Infinity;
    return da - db;
  });
});
</script>

<template>
  <main class="canteen-list">
    <div class="section-rule">
      <span class="section-rule__index">02</span>
      <span class="section-rule__line"></span>
    </div>
    <div class="canteen-list__header">
      <h1 class="section-title">
        全部<span class="zine-highlight">食堂</span>
      </h1>
      <img
        src="@/assets/food/tray.svg"
        alt=""
        class="canteen-list__header-doodle"
        aria-hidden="true"
      />
    </div>

    <div class="canteen-list__toolbar">
      <RouterLink
        class="button-ink canteen-list__map-link"
        :to="{ name: 'campusMap' }"
        >食堂地图</RouterLink
      >
      <button
        type="button"
        class="button-ink canteen-list__sort-btn"
        :class="{ 'is-primary': sortByDistance && userFix }"
        :disabled="locating"
        @click="toggleDistanceSort"
      >
        {{
          locating
            ? '定位中…'
            : sortByDistance && userFix
              ? '按距离 ✓'
              : '按距离'
        }}
      </button>
    </div>
    <p v-if="locationError" class="canteen-list__loc-error" role="status">
      {{ locationError }}
    </p>

    <LoadingState v-if="loading" message="正在翻开食堂手账…" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <EmptyState v-else-if="!canteens.length" title="还没有食堂" />
    <template v-else>
      <CatalogSearch
        v-model="query"
        label="搜索食堂"
        placeholder="输入食堂名称"
        :count="filteredCanteens.length"
        :total="canteens.length"
        unit="个食堂"
      />
      <EmptyState
        v-if="!filteredCanteens.length"
        title="没有匹配的食堂"
        description="换一个关键词，或查看全部食堂。"
      >
        <button class="button-ink" type="button" @click="query = ''">
          查看全部食堂
        </button>
      </EmptyState>
      <ul v-else class="canteen-list__grid">
        <li v-for="canteen in displayedCanteens" :key="canteen.id">
          <CanteenEntryCard :canteen="canteen" />
        </li>
      </ul>
    </template>
  </main>
</template>

<style scoped lang="scss">
.canteen-list__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 8px 0 12px;
}
.canteen-list__loc-error {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--ft-color-text-muted);
}
.canteen-list {
  width: min(calc(100% - var(--zine-page-padding) * 2), var(--page-max-width));
  margin: var(--ft-space-6) auto;

  &__header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: var(--ft-space-3);

    .section-title {
      margin: 0;
    }
  }

  &__header-doodle {
    width: 44px;
    height: auto;
    opacity: 0.85;
    transform: rotate(3deg);
    pointer-events: none;
    filter: drop-shadow(1px 2px 0 rgba(58, 36, 24, 0.08));
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--ft-space-3);
    margin: var(--ft-space-3) 0 0;
    padding: 0;
    list-style: none;
  }
}

@media (max-width: 768px) {
  .canteen-list {
    width: calc(100% - var(--zine-page-padding-mobile) * 2);
    margin: var(--app-mobile-section-gap) auto;

    &__grid {
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: var(--ft-space-2);
    }
  }
}
</style>
