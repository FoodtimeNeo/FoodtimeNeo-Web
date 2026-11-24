<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getNavigationItems,
  navigationTarget,
  resolveActiveNavigation,
} from './navigation.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import AppIcon from '@/components/base/AppIcon.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const navigationItems = computed(() => getNavigationItems(auth.isAdmin));
const activeName = computed(() => resolveActiveNavigation(route));
</script>

<template>
  <nav class="mobile-tab-bar" aria-label="底部导航">
    <template v-for="item in navigationItems" :key="item.name">
      <RouterLink
        v-if="router.hasRoute(item.name)"
        class="mobile-tab-bar__item"
        :to="navigationTarget(item, route)"
        :class="{ 'is-active': activeName === item.name }"
        :aria-current="activeName === item.name ? 'location' : undefined"
      >
        <span class="mobile-tab-bar__icon" aria-hidden="true">
          <AppIcon :name="item.iconName || 'home'" />
        </span>
        <span class="mobile-tab-bar__label">{{ item.label }}</span>
      </RouterLink>
      <span
        v-else
        class="mobile-tab-bar__item is-pending"
        aria-disabled="true"
        :title="`${item.label}将在后续阶段开放`"
      >
        <span class="mobile-tab-bar__icon" aria-hidden="true">
          <AppIcon :name="item.iconName || 'home'" />
        </span>
        <span class="mobile-tab-bar__label">{{ item.label }}</span>
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
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    min-height: calc(62px + var(--app-mobile-safe-bottom));
    padding: 6px max(8px, env(safe-area-inset-right))
      calc(6px + var(--app-mobile-safe-bottom))
      max(8px, env(safe-area-inset-left));
    border-top: 1px solid var(--ft-border-subtle);
    background: rgb(var(--ft-overlay-paper-rgb) / 92%);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 -2px 12px rgb(58 36 24 / 6%);
  }

  .mobile-tab-bar__item {
    display: flex;
    min-width: 0;
    min-height: 48px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: var(--ft-color-text-muted);
    font-size: 11px;
    font-weight: 500;
    line-height: 1.2;
    text-align: center;
    transition: color var(--ft-transition-fast);
  }

  .mobile-tab-bar__item.is-active {
    color: var(--ft-color-primary);
    font-weight: 700;
  }

  .mobile-tab-bar__item.is-active .mobile-tab-bar__icon {
    background: var(--zine-stamp-red-soft);
    color: var(--ft-color-primary);
  }

  .mobile-tab-bar__item.is-active .mobile-tab-bar__icon svg {
    stroke-width: 2.1;
  }

  .mobile-tab-bar__item.is-pending {
    opacity: 0.45;
  }

  .mobile-tab-bar__icon {
    display: grid;
    width: 44px;
    height: 28px;
    place-items: center;
    border-radius: var(--ft-radius-pill);
    transition:
      background var(--ft-transition-fast),
      color var(--ft-transition-fast);
  }

  .mobile-tab-bar__icon svg {
    width: 20px;
    height: 20px;
  }

  .mobile-tab-bar__label {
    white-space: nowrap;
  }
}
</style>
