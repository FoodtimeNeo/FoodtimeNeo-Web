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
      <p>
        {{
          canteen.averageScore == null
            ? '暂无评分'
            : `★ ${Number(canteen.averageScore).toFixed(1)} · ${canteen.reviewCount} 条评价`
        }}<template
          v-if="
            canteen.stallCount !== undefined &&
            canteen.stallCount !== null &&
            Number.isFinite(Number(canteen.stallCount)) &&
            Number(canteen.stallCount) >= 0
          "
        >
          · {{ Number(canteen.stallCount) }} 个档口</template
        >
      </p>
      <span class="canteen-entry__link handwrite">翻开看看 →</span>
    </div>
  </RouterLink>
</template>

<style scoped lang="scss">
.canteen-entry {
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
    transform var(--ft-transition-fast, 180ms cubic-bezier(0.16, 1, 0.3, 1)),
    box-shadow var(--ft-transition-fast, 180ms cubic-bezier(0.16, 1, 0.3, 1)),
    border-color var(--ft-transition-fast, 180ms ease);

  &:hover {
    transform: translateY(-3px);
    border-color: var(--ft-border-control);
    box-shadow: var(--ft-shadow-card-hover);
  }

  &__cover {
    position: relative;
    aspect-ratio: 3 / 2;
    overflow: hidden;
    background: var(--zine-paper-card-alt);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform var(--ft-transition-base, 320ms ease);
    }
  }

  &:hover &__cover img {
    transform: scale(1.03);
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px 16px;

    p {
      margin: 0;
      color: var(--ft-color-text-muted);
      font-size: var(--ft-font-size-sm);
    }

    .sticker {
      align-self: flex-start;
      padding: 2px 9px;
      border-color: var(--ft-border-subtle);
      border-radius: var(--ft-radius-pill);
      background: var(--zine-paper-card-alt);
      box-shadow: none;
      color: var(--ft-color-text-muted);
      font-size: 11px;
      letter-spacing: 0.04em;
      transform: none;
    }
  }

  &__postage,
  &__tape {
    display: none;
  }

  &__name {
    margin: 2px 0 0;
    color: var(--ft-color-text);
    font-family: var(--ft-font-family-title);
    font-size: var(--ft-font-size-lg);
    line-height: 1.3;
  }

  &__distance {
    margin: 0;
    color: var(--ft-color-primary) !important;
    font-size: 12px !important;
    font-weight: 700;
  }

  &__link {
    display: inline-flex;
    align-items: center;
    margin-top: auto;
    padding-top: 4px;
    color: var(--ft-color-primary);
    font-family: var(--ft-font-family);
    font-size: var(--ft-font-size-sm);
    font-weight: 700;
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
    box-shadow: var(--ft-shadow-card);
  }

  .canteen-entry:hover .canteen-entry__cover img {
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .canteen-entry,
  .canteen-entry:hover,
  .canteen-entry__cover img {
    transform: none !important;
    transition: none !important;
  }
}
@media (prefers-reduced-motion: no-preference) {
  .canteen-entry {
    animation: catalogCardIn 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @for $i from 1 through 8 {
    .canteen-entry:nth-child(#{$i}) {
      animation-delay: #{($i - 1) * 45}ms;
    }
  }
}

@keyframes catalogCardIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
