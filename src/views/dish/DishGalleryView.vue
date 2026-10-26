<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { usePagedData } from '@/composables/usePagedData.js';
import { fetchDish, fetchDishImages } from '@/api/dish.api.js';
import { ApiError } from '@/api/http.js';
import MediaImage from '@/components/base/MediaImage.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';
const route = useRoute();
const params = computed(() => route.params);
const {
  items: images,
  page,
  total,
  size,
  error,
  loading,
  load,
} = usePagedData(async (page, options) => {
  const dish = await fetchDish(String(route.params.dishId), options);
  if (
    dish.diningHallId !== route.params.canteenId ||
    dish.stallId !== route.params.stallId
  )
    throw new ApiError('菜品与当前食堂或档口不匹配', {
      status: 404,
      code: 'NOT_FOUND',
    });
  return fetchDishImages(dish.id, page, options);
});
const activeIndex = ref(0);
watch(page, () => {
  activeIndex.value = 0;
});
</script>
<template>
  <div class="dish-gallery">
    <nav class="dish-gallery__back">
      <RouterLink :to="{ name: 'dishDetail', params }">← 返回菜品</RouterLink>
    </nav>
    <h1 class="section-title">图册</h1>
    <LoadingState v-if="loading" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <EmptyState v-else-if="!images.length" title="还没有图片" />
    <template v-else>
      <figure class="dish-gallery__stage">
        <MediaImage
          :src="images[activeIndex]?.imageUrl || ''"
          size="full"
          eager
          fit="contain"
          alt="菜品图片"
        />
      </figure>
      <ul v-if="images.length > 1" class="dish-gallery__thumbs">
        <li v-for="(image, index) in images" :key="image.id">
          <button
            class="dish-gallery__thumb"
            type="button"
            :aria-label="'查看第 ' + (index + 1) + ' 张'"
            :aria-current="index === activeIndex"
            @click="activeIndex = index"
          >
            <MediaImage :src="image.imageUrl" alt="" />
          </button>
        </li>
      </ul>
    </template>
    <PaginationControls
      :page="page"
      :total="total"
      :size="size"
      :disabled="loading"
      @change="page = $event"
    />
  </div>
</template>

<style scoped lang="scss">
.dish-gallery {
  width: min(calc(100% - var(--zine-page-padding) * 2), var(--page-max-width));
  margin: var(--ft-space-5) auto;

  &__back {
    margin-bottom: var(--ft-space-3);

    a {
      color: var(--ft-color-primary);
      font-weight: 700;
      text-decoration: none;
    }
  }

  &__note {
    margin: var(--ft-space-1) 0 var(--ft-space-3);
    color: var(--ft-color-text-muted);
    font-size: var(--ft-font-size-sm);
  }

  &__stage {
    margin: 0;
    border: 2px solid var(--ft-color-text);
    box-shadow: 6px 6px 0 var(--ft-color-text);
    overflow: hidden;

    img {
      width: 100%;
      height: auto;
      object-fit: cover;
    }
  }

  &__thumbs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ft-space-2);
    margin: var(--ft-space-3) 0 0;
    padding: 0;
    list-style: none;
  }

  &__thumb {
    padding: 0;
    border: 2px solid var(--ft-color-text);
    background: none;
    cursor: pointer;
    line-height: 0;

    &.is-active {
      outline: 3px solid var(--ft-color-primary);
      outline-offset: 2px;
    }

    img {
      width: 80px;
      height: 60px;
      object-fit: cover;
    }
  }
}

@media (max-width: 768px) {
  .dish-gallery {
    width: calc(100% - var(--zine-page-padding-mobile) * 2);
  }
}
</style>
