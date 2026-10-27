<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getNavigationItems,
  navigationTarget,
  resolveActiveNavigation,
} from './navigation.js';
import { useAuthStore } from '@/store/useAuthStore.js';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const navigationItems = computed(() => getNavigationItems(auth.isAdmin));
const activeName = computed(() => resolveActiveNavigation(route));
</script>

<template>
  <header class="app-header">
    <span
      class="app-header__decor app-header__decor--stamp"
      aria-hidden="true"
    ></span>
    <span
      class="app-header__decor app-header__decor--food"
      aria-hidden="true"
    ></span>
    <span
      class="app-header__decor app-header__decor--tape"
      aria-hidden="true"
    ></span>
    <div class="app-header__inner">
      <RouterLink class="app-header__brand" :to="{ name: 'home' }">
        <strong>北交干饭吧</strong>
        <span>一页一餐的校园手账</span>
      </RouterLink>

      <nav class="app-header__nav" aria-label="主导航">
        <RouterLink
          v-for="(item, index) in navigationItems.filter((entry) =>
            router.hasRoute(entry.name),
          )"
          :key="item.name"
          :to="navigationTarget(item, route)"
          :class="{ 'is-active': activeName === item.name }"
          :aria-current="activeName === item.name ? 'location' : undefined"
        >
          <span aria-hidden="true">{{
            item.code || String(index).padStart(2, '0')
          }}</span>
          {{ item.label }}
        </RouterLink>
      </nav>

      <span class="app-header__account">
        {{ auth.isAuthenticated ? auth.displayName : '访客模式' }}
      </span>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  z-index: 20;
  top: 0;
  min-height: 82px;
  border-bottom: 1px solid var(--ft-color-secondary);
  background: rgb(242 239 230 / 94%);
  backdrop-filter: blur(8px);
}

.app-header__inner {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--ft-space-4);
  width: min(calc(100% - var(--zine-page-padding) * 2), var(--page-max-width));
  min-height: 82px;
  margin: auto;
}

.app-header__brand {
  display: grid;
  flex: none;
  line-height: 1.2;
}

.app-header__brand strong {
  font-family: var(--ft-font-family-title);
  font-size: 34px;
  font-weight: 900;
}

.app-header__brand span {
  color: var(--zine-stamp-red);
  font-family: var(--ft-font-family-note);
  font-size: 18px;
}

.app-header__nav {
  display: flex;
  align-items: center;
  flex: 1;
  gap: var(--ft-space-2);
}

.app-header__nav a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 48px;
  padding: 0 var(--ft-space-1);
  border: 1px solid transparent;
  font-weight: 700;
}

.app-header__nav a.is-active {
  border-color: var(--zine-stamp-red);
  color: var(--zine-stamp-red);
  box-shadow: 3px 3px 0 rgb(58 36 24 / 40%);
  transform: rotate(-1deg);
}

.app-header__account {
  flex: none;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
  font-family: var(--ft-font-family-note);
}

.app-header__admin {
  flex: none;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--ft-color-text);
  color: var(--ft-color-text);
  font-weight: 700;
  text-decoration: none;
  box-shadow: 2px 2px 0 var(--ft-color-text);
  transform: rotate(1deg);
}

.app-header__decor {
  position: absolute;
  z-index: 1;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.app-header__decor--stamp {
  top: -14px;
  left: max(430px, calc((100vw - var(--page-max-width)) / 2 + 374px));
  width: 98px;
  height: 98px;
  background-image: var(--zine-decor-stamp-recommend);
  opacity: 0.26;
  transform: rotate(-9deg);
}

.app-header__decor--food {
  right: max(18px, calc((100vw - var(--page-max-width)) / 2 + 8px));
  bottom: -22px;
  width: 78px;
  height: 78px;
  background-image: var(--zine-decor-food-sketch-4);
  opacity: 0.24;
  transform: rotate(7deg);
}

.app-header__decor--tape {
  bottom: 7px;
  left: max(310px, calc((100vw - var(--page-max-width)) / 2 + 278px));
  width: 130px;
  height: 34px;
  background-image: var(--zine-decor-tape-blue);
  opacity: 0.36;
  transform: rotate(3deg);
}

@media (max-width: 1180px) {
  .app-header__decor {
    display: none;
  }
}

@media (max-width: 768px) {
  .app-header,
  .app-header__inner {
    min-height: 64px;
  }

  .app-header__inner {
    width: calc(100% - var(--zine-page-padding-mobile) * 2);
    justify-content: space-between;
  }

  .app-header__brand strong {
    font-size: 22px;
  }

  .app-header__brand span,
  .app-header__nav,
  .app-header__account {
    display: none;
  }
}
</style>
