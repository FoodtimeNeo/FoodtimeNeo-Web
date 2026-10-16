<script setup>
import { formatPrice } from '@/utils/mediaUrl.js';
/**
 * 档口页的菜品条目：菜名、展示评分与价格，点击进入菜品详情。
 * 字段对齐后端菜品序列化：{ id, name, price, canteenId }。
 */
defineProps({
  dish: { type: Object, required: true },
  canteenId: { type: String, required: true },
  rating: { type: Number, default: 4.8 },
});

/**
 * @param {number|string} price
 * @returns {string}
 */
</script>

<template>
  <RouterLink
    class="dish-price"
    :to="{
      name: 'dishDetail',
      params: { canteenId, stallId: dish.stallId, dishId: dish.id },
    }"
  >
    <span class="dish-price__stamp stamp">菜单</span>
    <span class="dish-price__info">
      <span class="dish-price__name">{{ dish.name }}</span>
      <span
        class="dish-price__rating"
        :aria-label="`评分 ${rating.toFixed(1)} 分`"
      >
        <span aria-hidden="true">★</span> {{ rating.toFixed(1) }} 分
      </span>
    </span>
    <span class="dish-price__dots" aria-hidden="true"></span>
    <span class="dish-price__price">{{ formatPrice(dish.price) }}</span>
  </RouterLink>
</template>

<style scoped lang="scss">
.dish-price {
  display: grid;
  grid-template-columns: auto minmax(0, auto) minmax(20px, 1fr) auto;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--ft-space-2);
  padding: var(--ft-space-2);
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  box-shadow: 3px 4px 0 rgb(58 36 24 / 18%);
  color: inherit;
  text-decoration: none;

  &:hover .dish-price__name {
    text-decoration: underline;
  }

  &:hover {
    transform: translate(-2px, -2px);
    box-shadow: 5px 6px 0 rgb(58 36 24 / 22%);
  }

  &__stamp {
    min-width: 48px;
  }

  &__dots {
    align-self: center;
    border-bottom: 1px dashed rgb(58 36 24 / 36%);
  }

  &__name {
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  &__info {
    display: grid;
    gap: var(--ft-space-1);
    min-width: 0;
  }

  &__rating {
    color: var(--ft-color-primary);
    font-size: var(--ft-font-size-sm);
    white-space: nowrap;
  }

  &__price {
    flex: none;
    font-family: var(--ft-font-family-title);
    color: var(--ft-color-primary);
  }
}

@media (min-width: 769px) {
  .dish-price__name {
    font-size: var(--ft-font-size-lg);
    line-height: 1lh;
  }
}
</style>
