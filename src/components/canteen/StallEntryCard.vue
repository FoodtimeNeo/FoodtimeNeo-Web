<script setup>
import MediaImage from '@/components/base/MediaImage.vue';
/**
 * 档口入口卡片：封面 + 名称，点击进入档口页。
 * 使用后端已有的 id、name、coverImageUrl 和 diningHallId。
 */
defineProps({
  stall: { type: Object, required: true },
  canteenId: { type: String, required: true },
});
</script>

<template>
  <RouterLink
    class="stall-entry"
    :aria-label="`${stall.name}，查看菜单`"
    :to="{
      name: 'stallDetail',
      params: { canteenId, stallId: stall.id },
    }"
  >
    <div
      v-if="stall.coverImageUrl"
      class="stall-entry__cover"
      aria-hidden="true"
    >
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
      <p class="stall-entry__score">
        {{
          stall.averageScore == null
            ? '暂无评分'
            : Number(stall.averageScore).toFixed(1) +
              ' 分 · ' +
              stall.reviewCount +
              ' 人评价'
        }}
      </p>
      <span class="stall-entry__link handwrite">看看菜单 →</span>
    </div>
  </RouterLink>
</template>

<style scoped lang="scss">
.stall-entry__score {
  color: var(--ft-color-text-muted);
  font-size: 13px;
  margin: 6px 0 8px;
}
.stall-entry {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--ft-border-subtle);
  border-radius: var(--ft-radius-lg);
  background: var(--zine-paper-card);
  box-shadow: var(--ft-shadow-card);
  color: inherit;
  text-decoration: none;
  transition:
    transform var(--ft-transition-fast),
    box-shadow var(--ft-transition-fast),
    border-color var(--ft-transition-fast);

  &:hover {
    transform: translateY(-2px);
    border-color: var(--ft-border-control);
    box-shadow: var(--ft-shadow-card-hover);
  }

  &__cover {
    position: relative;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    background: var(--zine-paper-card-alt);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform var(--ft-transition-base);
    }
  }

  &:hover &__cover img {
    transform: scale(1.03);
  }

  &__tape {
    display: none;
  }

  &__content {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 14px 16px 16px;

    .stamp {
      align-self: flex-start;
      min-width: auto;
      min-height: auto;
      padding: 2px 9px;
      border: 1px solid var(--ft-border-subtle);
      border-radius: var(--ft-radius-pill);
      background: var(--zine-paper-card-alt);
      color: var(--ft-color-text-muted);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      transform: none;

      &::after {
        display: none;
      }
    }
  }

  &__name {
    margin: 8px 0 0;
    padding: 0;
    color: var(--ft-color-text);
    font-family: var(--ft-font-family-title);
    font-size: var(--ft-font-size-lg);
    line-height: 1.3;
  }

  &__link {
    display: inline-flex;
    align-items: center;
    margin-top: auto;
    color: var(--ft-color-primary);
    font-family: var(--ft-font-family);
    font-size: var(--ft-font-size-sm);
    font-weight: 700;
  }
}

@media (max-width: 768px) {
  .stall-entry {
    flex-direction: row;
    align-items: center;
    min-height: 88px;
    padding: 10px;
    gap: 12px;
    box-shadow: var(--ft-shadow-card);

    &:hover {
      transform: none;
      box-shadow: var(--ft-shadow-card);
    }
    &:hover &__cover img {
      transform: none;
    }
    &__cover {
      flex: 0 0 76px;
      height: 76px;
      aspect-ratio: 1;
      border-radius: var(--ft-radius-md);
    }
    &__cover :deep(.media-image) {
      min-height: 0;
    }
    &__content {
      flex: 1;
      min-width: 0;
      padding: 2px 4px;
    }
    &__content .stamp {
      display: none;
    }
    &__name {
      margin: 0;
      font-size: 17px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    &__score {
      margin: 4px 0 2px;
    }
    &__link {
      font-size: 13px;
      margin-top: 2px;
    }
  }
}
</style>
