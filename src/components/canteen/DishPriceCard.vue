<script setup>
import { formatPrice } from '@/utils/mediaUrl.js';
/**
 * 档口页的菜品条目：菜名 + 价格，点击进入菜品详情。
 * 字段对齐后端菜品序列化：{ id, name, price, canteenId }。
 */
defineProps({
  dish: { type: Object, required: true },
  canteenId: { type: String, required: true },
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
    <span class="dish-price__name">{{ dish.name }}</span>
    <span class="dish-price__price">{{ formatPrice(dish.price) }}</span>
  </RouterLink>
</template>

<style scoped lang="scss">
.dish-price {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--ft-space-2);
  padding: var(--ft-space-2);
  border: 2px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  box-shadow: 3px 3px 0 var(--ft-color-text);
  color: inherit;
  text-decoration: none;

  &:hover .dish-price__name {
    text-decoration: underline;
  }

  &__name {
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__price {
    flex: none;
    font-family: var(--ft-font-family-title);
    color: var(--ft-color-primary);
  }
}
</style>
