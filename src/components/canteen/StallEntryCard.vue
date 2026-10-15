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
      <span class="stall-entry__tape" aria-hidden="true"></span>
      <MediaImage
        :src="stall.coverImageUrl || ''"
        :alt="stall.name"
        loading="lazy"
        width="320"
        height="200"
      />
    </div>
    <div class="stall-entry__content">
      <span class="stamp">档口</span>
      <h3 class="stall-entry__name">{{ stall.name }}</h3>
      <span class="stall-entry__link handwrite">看看菜单 →</span>
    </div>
  </RouterLink>
</template>

<style scoped lang="scss">
.stall-entry {
  position: relative;
  display: block;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card);
  box-shadow: 5px 7px 0 rgb(58 36 24 / 18%);
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

  &__tape {
    position: absolute;
    z-index: 2;
    top: -13px;
    left: 18px;
    width: 90px;
    height: 28px;
    background: var(--zine-decor-tape-red) center / contain no-repeat;
    opacity: 0.76;
    transform: rotate(-7deg);
    mix-blend-mode: multiply;
  }

  &__content {
    padding: var(--ft-space-2);
  }

  &__name {
    margin: 12px 0 0;
    padding: 0;
    font-family: var(--ft-font-family-title);
    font-size: var(--ft-font-size-lg);
  }

  &__link {
    display: block;
    margin-top: var(--ft-space-1);
    color: var(--zine-stamp-red);
    font-size: 19px;
  }
}
</style>
