<script setup>
import MediaImage from '@/components/base/MediaImage.vue';
/**
 * 食堂入口卡片：封面 + 名称，点击进入食堂详情。
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
      <span class="canteen-entry__postage" aria-hidden="true"></span>
      <span class="canteen-entry__tape" aria-hidden="true"></span>
      <MediaImage
        :src="canteen.coverImageUrl || ''"
        :alt="canteen.name"
        loading="lazy"
        width="400"
        height="260"
      />
    </div>
    <div class="canteen-entry__body">
      <span class="sticker sticker--r-1">食堂档案</span>
      <h3 class="canteen-entry__name">{{ canteen.name }}</h3>
      <span class="canteen-entry__link handwrite">翻开看看 →</span>
    </div>
  </RouterLink>
</template>

<style scoped lang="scss">
.canteen-entry {
  position: relative;
  display: block;
  border: 1px solid var(--ft-color-text);
  background: var(--zine-paper-card, #fffaf0);
  box-shadow: 6px 8px 0 rgb(58 36 24 / 16%);
  color: inherit;
  text-decoration: none;
  transition:
    transform var(--ft-transition-fast, 180ms cubic-bezier(0.16, 1, 0.3, 1)),
    box-shadow var(--ft-transition-fast, 180ms cubic-bezier(0.16, 1, 0.3, 1));

  &:hover {
    transform: translate(-3px, -4px) rotate(-0.5deg);
    box-shadow: 9px 12px 0 rgb(58 36 24 / 20%);
  }

  &__cover {
    position: relative;
    aspect-ratio: 3 / 2;
    margin: 10px 10px 0;
    padding: 8px 8px 18px;
    overflow: visible;
    border: 0;
    background: #fff;
    box-shadow: 3px 3px 0 rgb(58 36 24 / 22%);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__body {
    padding: var(--ft-space-2);
  }

  &__postage {
    position: absolute;
    z-index: 1;
    inset: 0;
    background: var(--zine-decor-postage) center / 100% 100% no-repeat;
    opacity: 0.72;
    mix-blend-mode: multiply;
    pointer-events: none;
  }

  &__tape {
    position: absolute;
    z-index: 2;
    top: -16px;
    left: 50%;
    width: 96px;
    height: 30px;
    background: var(--zine-decor-tape-blue) center / contain no-repeat;
    opacity: 0.8;
    transform: translateX(-50%) rotate(-5deg);
    mix-blend-mode: multiply;
    pointer-events: none;
    transition: transform var(--ft-transition-fast, 180ms ease);
  }

  &:hover &__tape {
    transform: translateX(-50%) rotate(-3deg) translateY(-1px);
  }

  &__name {
    margin: 12px 0 0;
    font-family: var(--ft-font-family-title);
    font-size: var(--ft-font-size-lg);
  }

  &__link {
    display: block;
    margin-top: var(--ft-space-1);
    color: var(--zine-stamp-red);
    font-size: 20px;
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

@media (max-width: 768px) {
  .canteen-entry:hover {
    transform: none;
    box-shadow: var(--app-mobile-shadow);
  }

  .canteen-entry__tape {
    width: 72px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .canteen-entry,
  .canteen-entry:hover,
  .canteen-entry:hover .canteen-entry__tape {
    transform: none !important;
    transition: none !important;
  }
}
</style>
