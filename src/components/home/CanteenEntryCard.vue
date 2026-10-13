<script setup>
/**
 * 食堂入口卡片：封面 + 名称 + 概要，点击进入食堂详情。
 * 纯展示，数据与跳转由父级决定（通过 RouterLink 的 to）。
 */
defineProps({
  canteen: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <RouterLink
    class="canteen-entry"
    :to="{ name: 'canteenDetail', params: { canteenId: canteen.id } }"
  >
    <div class="canteen-entry__cover">
      <img
        :src="canteen.imageUrl"
        :alt="canteen.name"
        loading="lazy"
        width="400"
        height="260"
      />
    </div>
    <div class="canteen-entry__body">
      <h3 class="canteen-entry__name">{{ canteen.name }}</h3>
      <p v-if="canteen.summary" class="canteen-entry__summary">
        {{ canteen.summary }}
      </p>
    </div>
  </RouterLink>
</template>

<style scoped lang="scss">
.canteen-entry {
  display: block;
  border: 2px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  box-shadow: 5px 5px 0 var(--ft-color-text);
  color: inherit;
  text-decoration: none;
  transition:
    transform var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast);

  &:hover {
    transform: translate(-2px, -2px);
    box-shadow: 7px 7px 0 var(--ft-color-text);
  }

  &__cover {
    aspect-ratio: 3 / 2;
    overflow: hidden;
    border-bottom: 2px solid var(--ft-color-text);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__body {
    padding: var(--ft-space-2);
  }

  &__name {
    margin: 0;
    font-family: var(--ft-font-family-title);
    font-size: var(--ft-font-size-lg);
  }

  &__summary {
    margin: var(--ft-space-1) 0 0;
    color: var(--ft-color-text-muted);
    font-size: var(--ft-font-size-sm);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
</style>
