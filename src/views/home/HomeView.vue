<template>
  <main class="home-page">
    <p class="home-page__eyebrow">FoodtimeNeo-Web / 项目初始化</p>
    <h1>北交干饭吧</h1>
    <p>食堂手账，从这里重新开始。</p>
  </main>
</template>

<style scoped lang="scss">
.home-page {
  width: min(100% - 32px, 760px);
  margin: 12vh auto;
  padding: clamp(24px, 5vw, 48px);
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  box-shadow: 8px 8px 0 var(--ft-color-secondary);

  &__eyebrow {
    color: var(--ft-color-primary);
    font-size: 14px;
    font-weight: 700;
  }

  h1 {
    margin: 16px 0;
    font-family: var(--ft-font-family-title);
    font-size: clamp(40px, 8vw, 72px);
  }
}
</style>
