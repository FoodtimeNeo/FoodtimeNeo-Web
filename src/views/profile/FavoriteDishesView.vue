<script setup>
import { usePagedData } from '@/composables/usePagedData.js';
import { fetchFavoriteDishes } from '@/api/dish.api.js';
import { formatPrice } from '@/utils/mediaUrl.js';
import BackLink from '@/components/base/BackLink.vue';
import DishLink from '@/components/canteen/DishLink.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';

const state = usePagedData(fetchFavoriteDishes);
</script>

<template>
  <main class="favorite-dishes">
    <BackLink />
    <h1 class="section-title">想吃清单</h1>
    <LoadingState v-if="state.loading.value" />
    <ErrorState
      v-else-if="state.error.value"
      :description="state.error.value.message"
      @retry="state.load"
    />
    <template v-else>
      <p v-if="!state.items.value.length">这页还没有想吃的菜。</p>
      <ul v-else>
        <li v-for="dish in state.items.value" :key="dish.id">
          <DishLink :dish="dish">
            <strong>{{ dish.name }} · {{ formatPrice(dish.price) }}</strong>
            <p>{{ dish.diningHallName }} · {{ dish.stallName }}</p>
          </DishLink>
        </li>
      </ul>
      <PaginationControls
        v-if="state.page.value > 1 || state.total.value > state.size.value"
        :page="state.page.value"
        :total="state.total.value"
        :size="state.size.value"
        @change="state.page.value = $event"
      />
    </template>
  </main>
</template>

<style scoped>
.favorite-dishes {
  width: min(calc(100% - 2 * var(--zine-page-padding)), 640px);
  margin: var(--ft-space-6) auto;
}
.favorite-dishes ul {
  list-style: none;
  padding: 0;
}
.favorite-dishes li a {
  display: block;
  padding: 10px 4px;
  border-bottom: 1px solid var(--ft-color-text);
  overflow-wrap: anywhere;
}
.favorite-dishes li p {
  margin: 4px 0 0;
}
</style>
