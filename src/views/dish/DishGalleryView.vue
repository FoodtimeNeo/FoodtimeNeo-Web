<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncData } from '@/composables/useAsyncData.js';
import { fetchDish } from '@/api/dish.api.js';
import LoadingState from '@/components/base/LoadingState.vue';
import EmptyState from '@/components/base/EmptyState.vue';
import ErrorState from '@/components/base/ErrorState.vue';

const route = useRoute();
const canteenId = computed(() => String(route.params.canteenId));
const dishId = computed(() => String(route.params.dishId));

const {
  data: dish,
  error,
  loading,
  load,
} = useAsyncData(() => fetchDish(dishId.value));

// 后端暂无独立图册接口，这里用菜品已有图片。上传/删除待后端接口（见开发规划 1.3）。
const images = computed(() => {
  if (!dish.value) return [];
  const list = Array.isArray(dish.value.gallery) ? dish.value.gallery : [];
  const all = [dish.value.imageUrl, ...list].filter(Boolean);
  return [...new Set(all)];
});

const activeIndex = ref(0);

function show(index) {
  if (index < 0 || index >= images.value.length) return;
  activeIndex.value = index;
}
</script>

<template>
  <main class="dish-gallery">
    <nav class="dish-gallery__back">
      <RouterLink :to="{ name: 'dishDetail', params: { canteenId, dishId } }">
        ← 返回菜品
      </RouterLink>
    </nav>

    <LoadingState v-if="loading" message="正在整理图册…" />
    <ErrorState v-else-if="error" :description="error.message" @retry="load" />
    <EmptyState
      v-else-if="!images.length"
      title="还没有图片"
      description="图册上传能力待后端接口接入后开放。"
    />
    <template v-else>
      <h1 class="section-title">{{ dish?.name }} · 图册</h1>
      <p class="dish-gallery__note">
        当前展示菜品已有图片；图册上传与删除待后端接口。
      </p>

      <figure class="dish-gallery__stage">
        <img
          :src="images[activeIndex]"
          :alt="`${dish?.name} 第 ${activeIndex + 1} 张`"
          width="960"
          height="640"
        />
      </figure>

      <ul v-if="images.length > 1" class="dish-gallery__thumbs">
        <li v-for="(src, index) in images" :key="src">
          <button
            type="button"
            class="dish-gallery__thumb"
            :class="{ 'is-active': index === activeIndex }"
            :aria-label="`查看第 ${index + 1} 张`"
            :aria-current="index === activeIndex"
            @click="show(index)"
          >
            <img :src="src" alt="" width="120" height="90" />
          </button>
        </li>
      </ul>
    </template>
  </main>
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
