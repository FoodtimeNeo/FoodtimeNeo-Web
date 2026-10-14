<script setup>
import MediaImage from '@/components/base/MediaImage.vue';
/**
 * 档口入口卡片：封面 + 名称，点击进入档口页。
 * 字段对齐后端档口序列化：{ id, name, imageUrl, canteenId }。
 */
defineProps({
  stall: { type: Object, required: true },
  canteenId: { type: String, required: true },
});
</script>

<template>
  <RouterLink
    class="stall-entry"
    :to="{
      name: 'stallDetail',
      params: { canteenId, stallId: stall.id },
    }"
  >
    <div class="stall-entry__cover">
      <MediaImage
        :src="stall.coverImageUrl || ''"
        :alt="stall.name"
        loading="lazy"
        width="320"
        height="200"
      />
    </div>
    <h3 class="stall-entry__name">{{ stall.name }}</h3>
  </RouterLink>
</template>

<style scoped lang="scss">
.stall-entry {
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
    aspect-ratio: 16 / 10;
    overflow: hidden;
    border-bottom: 2px solid var(--ft-color-text);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__name {
    margin: 0;
    padding: var(--ft-space-2);
    font-family: var(--ft-font-family-title);
    font-size: var(--ft-font-size-lg);
  }
}
</style>
