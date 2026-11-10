<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { searchDishes } from '@/api/dish.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { formatPrice } from '@/utils/mediaUrl.js';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';

const route = useRoute();
const router = useRouter();
const keyword = computed(() =>
  typeof route.query.q === 'string' ? route.query.q.trim() : '',
);
const input = ref('');
const validation = ref('');
const state = usePagedData(
  (page, options) => {
    if (!keyword.value || keyword.value.length > 50)
      return { items: [], total: 0, page, size: 20 };
    return searchDishes(keyword.value, page, options);
  },
  { immediate: false },
);

watch(
  keyword,
  (query) => {
    input.value = query.slice(0, 50);
    validation.value = query.length > 50 ? '菜品关键词最多50个字符。' : '';
    state.cancel();
    state.hasLoaded.value = false;
    state.error.value = null;
    if (state.page.value !== 1) state.page.value = 1;
    else if (query && !validation.value) state.load();
  },
  { immediate: true },
);

function submit() {
  const query = input.value.trim();
  if (query === keyword.value) {
    if (state.error.value) state.load();
    return;
  }
  router.replace({ name: 'dishSearch', query: query ? { q: query } : {} });
}
</script>

<template>
  <main class="dish-search">
    <RouterLink :to="{ name: 'canteenList' }">← 返回食堂</RouterLink>
    <h1 class="section-title">
      跨食堂<span class="zine-highlight">搜菜</span>
    </h1>
    <form role="search" @submit.prevent="submit">
      <label for="dish-keyword">菜名</label>
      <div class="dish-search__field">
        <input
          id="dish-keyword"
          v-model="input"
          type="search"
          placeholder="例如：鸡腿饭"
          maxlength="50"
        />
        <button class="button-ink" type="submit">搜索</button>
      </div>
      <p v-if="validation" role="alert">{{ validation }}</p>
    </form>

    <template v-if="keyword && !validation">
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
          title="这页没有匹配的菜品"
          description="试试更短的菜名，或返回上一页。"
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
  width: min(calc(100% - 2 * var(--zine-page-padding)), 640px);
  margin: var(--ft-space-6) auto;

  &__field {
    display: flex;
    gap: 8px;
    margin: 8px 0 16px;

    input {
      flex: 1;
      min-width: 0;
      min-height: 44px;
      padding: 8px 12px;
      border: 1px solid var(--ft-color-text);
      background: var(--zine-paper-card);
      font-size: 16px;
    }
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
}
</style>
