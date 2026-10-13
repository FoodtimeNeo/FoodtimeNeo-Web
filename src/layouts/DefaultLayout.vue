<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';
import MobileTabBar from '@/components/layout/MobileTabBar.vue';
import { resolveBreadcrumbs } from '@/components/layout/navigation.js';

const route = useRoute();
const breadcrumbs = computed(() => resolveBreadcrumbs(route));
</script>

<template>
  <div class="default-layout">
    <AppHeader />
    <div class="default-layout__paper">
      <nav class="breadcrumbs" aria-label="面包屑">
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.name">
          <span v-if="index" class="breadcrumbs__separator" aria-hidden="true"
            >/</span
          >
          <span v-if="index === breadcrumbs.length - 1" aria-current="page">
            {{ crumb.title }}
          </span>
          <RouterLink v-else :to="{ name: crumb.name }">{{
            crumb.title
          }}</RouterLink>
        </template>
      </nav>
      <main id="main-content" class="default-layout__main">
        <slot />
      </main>
    </div>
    <MobileTabBar />
  </div>
</template>

<style scoped>
.default-layout {
  min-height: 100vh;
}

.default-layout__paper {
  width: min(calc(100% - var(--zine-page-padding) * 2), var(--page-max-width));
  min-height: calc(100vh - 124px);
  margin: var(--ft-space-3) auto var(--ft-space-5);
  border: 1px solid var(--zine-paper-edge);
  background: var(--zine-paper-card);
  box-shadow: var(--ft-shadow-lg);
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: var(--ft-space-1);
  min-height: 44px;
  padding: var(--ft-space-1) var(--ft-space-3);
  border-bottom: 1px dashed var(--ft-color-border);
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
}

.breadcrumbs [aria-current='page'] {
  color: var(--zine-stamp-red);
  font-weight: 700;
}

.default-layout__main {
  min-width: 0;
}

@media (max-width: 768px) {
  .default-layout__paper {
    width: 100%;
    min-height: calc(100vh - 64px);
    margin: 0;
    border: 0;
    box-shadow: none;
  }

  .default-layout {
    padding-bottom: calc(
      var(--app-mobile-tabbar-height) + var(--app-mobile-safe-bottom)
    );
  }

  .breadcrumbs {
    padding: var(--ft-space-1) var(--zine-page-padding-mobile);
  }
}
</style>
