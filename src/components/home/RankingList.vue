<script setup>
/**
 * 菜品排行榜。数据字段对齐后端 /rankings：
 * { rank, dishId, canteenId, dishName, score, stamp }
 */
defineProps({
  items: {
    type: Array,
    required: true,
  },
});
</script>

<template>
  <ol class="ranking">
    <li v-for="item in items" :key="item.rank" class="ranking__item">
      <RouterLink
        class="ranking__link"
        :to="{
          name: 'dishDetail',
          params: { canteenId: item.canteenId, dishId: item.dishId },
        }"
      >
        <span class="ranking__index" :class="{ 'is-top': item.rank <= 3 }">
          {{ item.rank }}
        </span>
        <span class="ranking__name">{{ item.dishName }}</span>
        <span v-if="item.stamp" class="stamp ranking__stamp">
          {{ item.stamp }}
        </span>
        <span class="zine-rating-stamp ranking__score">
          {{ (item.score ?? 0).toFixed(1) }}
        </span>
      </RouterLink>
    </li>
  </ol>
</template>

<style scoped lang="scss">
.ranking {
  margin: var(--ft-space-3) 0 0;
  padding: 0;
  list-style: none;

  &__item {
    border-bottom: 1px dashed var(--zine-paper-edge);
  }

  &__link {
    display: flex;
    align-items: center;
    gap: var(--ft-space-2);
    padding: var(--ft-space-2) var(--ft-space-1);
    color: inherit;
    text-decoration: none;

    &:hover .ranking__name {
      text-decoration: underline;
    }
  }

  &__index {
    flex: none;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border: 2px solid var(--ft-color-text);
    font-family: var(--ft-font-family-title);
    font-weight: 900;

    &.is-top {
      background: var(--ft-color-primary);
      color: #fff;
    }
  }

  &__name {
    flex: 1;
    min-width: 0;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__stamp {
    flex: none;
  }

  &__score {
    flex: none;
  }
}
</style>
