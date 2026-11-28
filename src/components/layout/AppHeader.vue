<script setup>
import { computed } from 'vue';
import PageTools from './PageTools.vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getNavigationItems,
  navigationTarget,
  resolveActiveNavigation,
} from './navigation.js';
import { useAuthStore } from '@/store/useAuthStore.js';
import { useInboxStore } from '@/store/useInboxStore.js';
import AppIcon from '@/components/base/AppIcon.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const inbox = useInboxStore();
const navigationItems = computed(() => getNavigationItems(auth.isAdmin));
const activeName = computed(() => resolveActiveNavigation(route));
const ROOT_TABS = new Set([
  'home',
  'canteenList',
  'community',
  'profile',
  'adminAudit',
]);
const canGoBack = computed(
  () => Boolean(route.name) && !ROOT_TABS.has(String(route.name)),
);
function goBack() {
  if (typeof window !== 'undefined' && window.history.state?.back) {
    router.back();
    return;
  }
  const fallback =
    activeName.value && router.hasRoute(activeName.value)
      ? activeName.value
      : 'home';
  router.push({ name: fallback });
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <div class="app-header__start">
        <button
          v-if="canGoBack"
          type="button"
          class="app-header__back"
          aria-label="返回上一页"
          data-testid="mobile-header-back"
          @click="goBack"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <RouterLink class="app-header__brand" :to="{ name: 'home' }">
          <strong>北交干饭吧</strong>
        </RouterLink>
      </div>

      <nav class="app-header__nav" aria-label="主导航">
        <RouterLink
          v-for="item in navigationItems.filter((entry) =>
            router.hasRoute(entry.name),
          )"
          :key="item.name"
          :to="navigationTarget(item, route)"
          :class="{ 'is-active': activeName === item.name }"
          :aria-current="activeName === item.name ? 'location' : undefined"
        >
          <AppIcon
            class="app-header__nav-icon"
            :name="item.iconName || 'home'"
          />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <PageTools
        v-if="route.meta?.nav !== 'community'"
        :home="route.name !== 'home'"
        :search="route.name !== 'dishSearch'"
      />
      <span class="app-header__account">
        <RouterLink
          v-if="auth.isAuthenticated"
          class="app-header__inbox"
          :to="{ name: 'inboxView' }"
          :class="{ 'is-active': route.name === 'inboxView' }"
        >
          <AppIcon class="app-header__inbox-icon" name="inbox" />
          <span>信箱</span>
          <span
            v-if="inbox.hasUnread"
            class="app-header__dot"
            role="status"
            :aria-label="`有 ${inbox.unreadCount} 条未读`"
            >{{ inbox.unreadCount > 99 ? '99+' : inbox.unreadCount }}</span
          >
        </RouterLink>
        <RouterLink
          class="app-header__user"
          :to="{ name: 'profile' }"
          aria-label="进入我的页"
          >{{
            auth.isAuthenticated ? auth.displayName : '访客模式'
          }}</RouterLink
        >
      </span>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  z-index: 20;
  top: 0;
  min-height: calc(68px + var(--app-mobile-safe-top));
  padding-top: var(--app-mobile-safe-top);
  padding-right: var(--app-mobile-safe-right);
  padding-left: var(--app-mobile-safe-left);
  border-bottom: 1px solid var(--ft-border-subtle);
  background: rgb(var(--ft-overlay-paper-rgb) / 92%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  user-select: none;
  -webkit-touch-callout: none;
}

.app-header__start {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 0 1 auto;
  min-width: 0;
}

.app-header__back {
  display: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-left: -10px;
  padding: 0;
  border: 0;
  border-radius: var(--ft-radius-pill);
  background: transparent;
  color: var(--ft-color-text);
  cursor: pointer;
  flex: none;
}

.app-header__back svg {
  width: 22px;
  height: 22px;
  stroke-width: 2.1;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.app-header__back:active {
  background: var(--ft-color-surface-ink);
  transform: scale(0.94);
}

.app-header__inner {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--ft-space-3);
  width: min(calc(100% - var(--zine-page-padding) * 2), var(--page-max-width));
  min-height: 68px;
  margin: auto;
}

.app-header__brand {
  display: grid;
  flex: 0 1 auto;
  min-width: 0;
  line-height: 1.2;
}

.app-header__brand strong {
  font-family: var(--ft-font-family-title);
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.app-header__nav {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 6px;
}

.app-header__nav a {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: var(--ft-radius-pill);
  color: var(--ft-color-text-muted);
  font-size: 15px;
  font-weight: 600;
  transition:
    background var(--ft-transition-fast),
    color var(--ft-transition-fast);
}

.app-header__nav a:hover,
.app-header__nav a:focus-visible {
  background: var(--ft-color-surface-ink);
  color: var(--ft-color-text);
}

.app-header__nav a.is-active {
  background: var(--zine-stamp-red-soft);
  color: var(--ft-color-primary);
  font-weight: 700;
}

.app-header__nav-icon {
  width: 17px;
  height: 17px;
  flex: none;
}

.app-header__account {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: none;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}

.app-header__inbox {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 38px;
  padding: 0 13px;
  border: 1px solid var(--ft-border-control);
  border-radius: 999px;
  background: var(--ft-color-surface);
  color: var(--ft-color-text);
  font-weight: 600;
  transition:
    border-color var(--ft-transition-fast),
    color var(--ft-transition-fast),
    background var(--ft-transition-fast);
}

.app-header__inbox-icon {
  width: 16px;
  height: 16px;
  flex: none;
}

.app-header__inbox:hover,
.app-header__inbox:focus-visible,
.app-header__inbox.is-active {
  border-color: var(--ft-color-primary);
  background: var(--zine-stamp-red-soft);
  color: var(--ft-color-primary);
}

.app-header__user {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 10px;
  border-radius: var(--ft-radius-pill);
  color: var(--ft-color-text);
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition:
    background var(--ft-transition-fast),
    color var(--ft-transition-fast);
}

.app-header__user:hover,
.app-header__user:focus-visible {
  background: var(--ft-color-surface-ink);
  color: var(--ft-color-primary);
}

.app-header__dot {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border-radius: 999px;
  color: #fff;
  background: var(--ft-color-primary);
  font-size: 11px;
  font-weight: 700;
  line-height: 19px;
  text-align: center;
}

@media (max-width: 768px) {
  .app-header {
    min-height: calc(54px + var(--app-mobile-safe-top));
  }

  .app-header__inner {
    min-height: 54px;
  }

  .app-header__back {
    display: inline-flex;
  }

  .app-header__inner {
    gap: 8px;
    width: calc(100% - var(--zine-page-padding-mobile) * 2);
    justify-content: space-between;
  }

  .app-header__brand strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 20px;
  }

  .app-header__nav,
  .app-header__user {
    display: none;
  }

  /* 移动端保留信箱入口，否则未读角标完全不可见。 */
  .app-header__account {
    display: inline-flex;
    align-items: center;
  }

  .app-header__inbox {
    min-height: 36px;
    padding: 0 11px;
    font-size: 13px;
  }
}
</style>
