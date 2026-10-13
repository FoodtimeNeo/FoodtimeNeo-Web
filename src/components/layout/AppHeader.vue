<template>
  <header class="app-header">
    <div class="app-header__inner">
      <RouterLink class="app-header__brand" :to="{ name: 'home' }">
        <strong>北交干饭吧</strong>
        <span>一页一餐的校园手账</span>
      </RouterLink>

      <nav class="app-header__nav" aria-label="主导航">
        <RouterLink :to="{ name: 'home' }" active-class="is-active">
          <span aria-hidden="true">01</span> 首页
        </RouterLink>
      </nav>

      <span class="app-header__account">访客模式</span>
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
  border-bottom: 2px solid transparent;
  font-weight: 700;
}

.app-header__nav a.is-active {
  border-color: var(--zine-stamp-red);
  color: var(--zine-stamp-red);
}

.app-header__account {
  flex: none;
  color: var(--ft-color-text-muted);
  font-size: var(--ft-font-size-sm);
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
  .app-header__nav {
    display: none;
  }
}
</style>
