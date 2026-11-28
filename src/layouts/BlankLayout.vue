<template>
  <main class="blank-layout">
    <span
      class="blank-layout__decor blank-layout__decor--stamp"
      aria-hidden="true"
    ></span>
    <span
      class="blank-layout__decor blank-layout__decor--sketch"
      aria-hidden="true"
    ></span>
    <slot />
  </main>
</template>

<style scoped lang="scss">
.blank-layout {
  position: relative;
  display: grid;
  min-height: 100vh;
  min-height: 100dvh;
  place-items: center;
  overflow: hidden;
  padding: var(--ft-space-4) var(--zine-page-padding);
}

.blank-layout::before {
  position: fixed;
  inset: 5% 8%;
  pointer-events: none;
  border: 1px solid rgb(58 36 24 / 10%);
  background: rgb(var(--ft-overlay-paper-rgb) / 20%);
  content: '';
  transform: rotate(-0.6deg);
}

.blank-layout__decor {
  position: fixed;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.blank-layout__decor--stamp {
  top: 8vh;
  left: 8vw;
  width: 180px;
  height: 180px;
  background-image: var(--zine-decor-stamp-chinese);
  opacity: 0.22;
  transform: rotate(-12deg);
}

.blank-layout__decor--sketch {
  right: 7vw;
  bottom: 8vh;
  width: 170px;
  height: 170px;
  background-image: var(--zine-decor-food-sketch-3);
  opacity: 0.3;
  transform: rotate(9deg);
}

@media (max-width: 768px) {
  .blank-layout {
    padding: max(var(--zine-page-padding-mobile), var(--app-mobile-safe-top))
      max(var(--zine-page-padding-mobile), var(--app-mobile-safe-right))
      max(var(--zine-page-padding-mobile), var(--app-mobile-safe-bottom))
      max(var(--zine-page-padding-mobile), var(--app-mobile-safe-left));
  }

  .blank-layout::before,
  .blank-layout__decor {
    display: none;
  }
}
</style>
