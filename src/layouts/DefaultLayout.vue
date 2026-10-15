<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppFooter from '@/components/layout/AppFooter.vue';
import MobileTabBar from '@/components/layout/MobileTabBar.vue';
import { resolveBreadcrumbs } from '@/components/layout/navigation.js';

const route = useRoute();
const breadcrumbs = computed(() => resolveBreadcrumbs(route));
</script>

<template>
  <div class="default-layout">
    <div class="desk-decor desk-decor--torn-left" aria-hidden="true"></div>
    <div class="desk-decor desk-decor--note-left" aria-hidden="true"></div>
    <div class="desk-decor desk-decor--stamp-left" aria-hidden="true"></div>
    <div class="desk-decor desk-decor--stamp-right" aria-hidden="true"></div>
    <div class="desk-decor desk-decor--sketch-right" aria-hidden="true"></div>
    <div class="desk-decor desk-decor--tape-bottom" aria-hidden="true"></div>
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
          <RouterLink v-else :to="{ name: crumb.name, params: crumb.params }">{{
            crumb.title
          }}</RouterLink>
        </template>
      </nav>
      <main id="main-content" class="default-layout__main">
        <slot />
      </main>
    </div>
    <AppFooter />
    <MobileTabBar />
  </div>
</template>

<style scoped>
.default-layout {
  position: relative;
  min-height: 100vh;
  isolation: isolate;
}

.default-layout__paper {
  --paper-wave-height: clamp(24px, 3.2vw, 38px);
  --paper-wave-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 56' preserveAspectRatio='none'%3E%3Cpath fill='black' d='M0 20 C75 6 165 6 240 20 C315 34 405 34 480 20 C555 6 645 6 720 20 C795 34 885 34 960 20 C1035 6 1125 6 1200 20 L1200 56 L0 56 Z'/%3E%3C/svg%3E");
  position: relative;
  z-index: 1;
  width: min(calc(100% - var(--zine-page-padding) * 2), var(--page-max-width));
  min-height: calc(100vh - 124px);
  margin: 36px auto 56px;
  border: 1px solid var(--zine-paper-edge);
  background:
    linear-gradient(
      90deg,
      rgb(255 255 255 / 18%),
      transparent 10% 90%,
      rgb(58 36 24 / 5%)
    ),
    radial-gradient(circle at 18% 12%, rgb(183 47 28 / 5%) 0, transparent 24%),
    var(--zine-paper-card);
  box-shadow:
    0 18px 48px var(--zine-paper-shadow),
    inset 0 0 80px rgb(58 36 24 / 5%);
}

@supports ((-webkit-mask-image: url('')) or (mask-image: url(''))) {
  .default-layout__paper {
    -webkit-mask:
      var(--paper-wave-mask) top center / 100% var(--paper-wave-height)
        no-repeat,
      linear-gradient(#000 0 0) bottom / 100%
        calc(100% - var(--paper-wave-height) + 1px) no-repeat;
    mask:
      var(--paper-wave-mask) top center / 100% var(--paper-wave-height)
        no-repeat,
      linear-gradient(#000 0 0) bottom / 100%
        calc(100% - var(--paper-wave-height) + 1px) no-repeat;
  }
}

.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
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

.desk-decor {
  position: fixed;
  z-index: 0;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.desk-decor--torn-left {
  top: 154px;
  left: max(12px, calc((100vw - var(--page-max-width)) / 2 - 230px));
  width: 260px;
  height: 120px;
  background-image: var(--zine-decor-torn-edge);
  opacity: 0.36;
  transform: rotate(-7deg);
}

.desk-decor--note-left {
  top: 36vh;
  left: max(18px, calc((100vw - var(--page-max-width)) / 2 - 148px));
  width: 136px;
  height: 136px;
  background-image: var(--zine-decor-sticky-note);
  opacity: 0.42;
  transform: rotate(var(--zine-decor-rotate-left));
}

.desk-decor--stamp-left {
  top: 62vh;
  left: max(20px, calc((100vw - var(--page-max-width)) / 2 - 142px));
  width: 128px;
  height: 128px;
  background-image: var(--zine-decor-stamp-round);
  opacity: var(--zine-decor-opacity-bg);
  transform: rotate(-14deg);
}

.desk-decor--stamp-right {
  top: 28vh;
  right: max(18px, calc((100vw - var(--page-max-width)) / 2 - 160px));
  width: 146px;
  height: 146px;
  background-image: var(--zine-decor-stamp-premium);
  opacity: 0.3;
  transform: rotate(12deg);
}

.desk-decor--sketch-right {
  top: 56vh;
  right: max(18px, calc((100vw - var(--page-max-width)) / 2 - 146px));
  width: 132px;
  height: 132px;
  background-image: var(--zine-decor-food-sketch-5);
  opacity: 0.42;
  transform: rotate(-8deg);
}

.desk-decor--tape-bottom {
  right: max(20px, calc((100vw - var(--page-max-width)) / 2 - 154px));
  bottom: 18vh;
  width: 160px;
  height: 42px;
  background-image: var(--zine-decor-tape-blue);
  opacity: 0.54;
  transform: rotate(var(--zine-decor-rotate-right));
}

@media (max-width: 768px) {
  .default-layout__paper {
    width: 100%;
    min-height: calc(100vh - 64px);
    margin: 0;
    border: 0;
    box-shadow: none;
    mask: none;
    -webkit-mask: none;
  }

  .default-layout {
    padding-bottom: calc(
      var(--app-mobile-tabbar-height) + var(--app-mobile-safe-bottom)
    );
  }

  .breadcrumbs {
    padding: var(--ft-space-1) var(--zine-page-padding-mobile);
  }

  .desk-decor {
    display: none;
  }
}
</style>
