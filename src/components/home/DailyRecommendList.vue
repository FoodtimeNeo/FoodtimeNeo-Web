<script setup>
/**
 * 今日推荐：横向卡片，点击进入菜品详情。
 * 数据字段对齐后端 /recommendations/daily：
 * { id, dishId, canteenId, name, canteenName, stall, price, rating, imageUrl }
 */
defineProps({
  items: {
    type: Array,
    required: true,
  },
});

/**
 * 价格统一展示为 ¥N，缺失时留空。
 * @param {number|string} price
 * @returns {string}
 */
function formatPrice(price) {
  const value = Number(price);
  return Number.isFinite(value) && value > 0 ? `¥${value}` : '';
}
</script>

<template>
  <ul class="daily-recommend">
    <li v-for="item in items" :key="item.id" class="daily-recommend__item">
      <RouterLink
        class="daily-recommend__card"
        :to="{
          name: 'dishDetail',
          params: { canteenId: item.canteenId, dishId: item.dishId },
        }"
      >
        <div class="daily-recommend__cover">
          <img
            :src="item.imageUrl"
            :alt="item.name"
            loading="lazy"
            width="320"
            height="200"
          />
          <span class="zine-rating-stamp daily-recommend__rating">
            {{ (item.rating ?? 0).toFixed(1) }}
          </span>
        </div>
        <div class="daily-recommend__body">
          <h3 class="daily-recommend__name">{{ item.name }}</h3>
          <p class="daily-recommend__meta">
            {{ item.canteenName }}
            <template v-if="item.stall"> · {{ item.stall }}</template>
            <template v-if="formatPrice(item.price)">
              · {{ formatPrice(item.price) }}</template
            >
          </p>
        </div>
      </RouterLink>
    </li>
  </ul>
</template>

<style scoped lang="scss">
.daily-recommend {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(220px, 1fr);
  gap: var(--ft-space-3);
  margin: var(--ft-space-3) 0 0;
  padding: 0 0 var(--ft-space-2);
  list-style: none;
  overflow-x: auto;

  &__card {
    display: block;
    border: 2px solid var(--ft-color-text);
    background: var(--zine-paper-card);
    box-shadow: 5px 5px 0 var(--ft-color-text);
    color: inherit;
    text-decoration: none;
  }

  &__cover {
    position: relative;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    border-bottom: 2px solid var(--ft-color-text);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__rating {
    position: absolute;
    top: var(--ft-space-1);
    right: var(--ft-space-1);
  }

  &__body {
    padding: var(--ft-space-2);
  }

  &__name {
    margin: 0;
    font-family: var(--ft-font-family-title);
    font-size: var(--ft-font-size-lg);
  }

  &__meta {
    margin: var(--ft-space-1) 0 0;
    color: var(--ft-color-text-muted);
    font-size: var(--ft-font-size-sm);
  }
}

@media (max-width: 768px) {
  .daily-recommend {
    grid-auto-columns: minmax(180px, 70%);
  }
}
</style>
