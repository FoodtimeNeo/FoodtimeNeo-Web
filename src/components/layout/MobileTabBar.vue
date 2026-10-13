<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const items = [
  { name: 'home', label: '首页', icon: '⌂' },
  { name: 'canteenList', label: '食堂', icon: '▤' },
  { name: 'reviewCreate', label: '点评', icon: '✎' },
  { name: 'rantWall', label: '吐槽', icon: '✺' },
  { name: 'profile', label: '我的', icon: '◯' },
];
</script>

<template>
  <nav class="mobile-tab-bar" aria-label="底部导航">
    <template v-for="item in items" :key="item.name">
      <RouterLink
        v-if="router.hasRoute(item.name)"
        class="mobile-tab-bar__item"
        :to="{ name: item.name }"
        active-class="is-active"
      >
        <span class="mobile-tab-bar__icon" aria-hidden="true">{{
          item.icon
        }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>
      <span
        v-else
        class="mobile-tab-bar__item is-pending"
        aria-disabled="true"
        :title="`${item.label}将在后续阶段开放`"
      >
        <span class="mobile-tab-bar__icon" aria-hidden="true">{{
          item.icon
        }}</span>
        <span>{{ item.label }}</span>
      </span>
    </template>
  </nav>
</template>

<style scoped>
.mobile-tab-bar {
  display: none;
}

@media (max-width: 768px) {
  .mobile-tab-bar {
    position: fixed;
    z-index: 30;
    right: 0;
    bottom: 0;
    left: 0;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    min-height: calc(
      var(--app-mobile-tabbar-height) + var(--app-mobile-safe-bottom)
    );
    padding: 4px max(4px, env(safe-area-inset-right))
      var(--app-mobile-safe-bottom) max(4px, env(safe-area-inset-left));
    border-top: 1px solid var(--ft-color-secondary);
    background: linear-gradient(
      180deg,
      rgb(255 250 240 / 96%),
      rgb(242 239 230 / 98%)
    );
    backdrop-filter: blur(8px);
  }

  .mobile-tab-bar__item {
    display: flex;
    min-width: 0;
    min-height: 54px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    color: var(--ft-color-text-muted);
    font-size: var(--ft-font-size-xs);
    line-height: 1.2;
    text-align: center;
  }

  .mobile-tab-bar__item.is-active {
    color: var(--zine-stamp-red);
    font-weight: 700;
  }

  .mobile-tab-bar__item.is-pending {
    opacity: 0.45;
  }

  .mobile-tab-bar__icon {
    font-size: 25px;
    line-height: 1;
  }
}
</style>
