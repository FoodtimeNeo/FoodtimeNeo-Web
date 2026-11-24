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
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <RouterLink class="app-header__brand" :to="{ name: 'home' }">
        <strong>北交干饭吧</strong>
      </RouterLink>

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
  min-height: 68px;
  border-bottom: 1px solid var(--ft-border-subtle);
  background: rgb(var(--ft-overlay-paper-rgb) / 92%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
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
  .app-header,
  .app-header__inner {
    min-height: 54px;
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
