<template>
  <main class="not-found-page">
    <span class="stamp">404 · 空白页</span>
    <h1>这一页还没开张</h1>
    <p class="handwrite">这张纸还没有写下新的食堂故事。</p>
    <div class="not-found-page__actions">
      <RouterLink class="button-ink is-primary" :to="{ name: 'home' }"
        >回到首页</RouterLink
      >
      <RouterLink class="button-ink" :to="{ name: 'canteenList' }"
        >去逛食堂</RouterLink
      >
    </div>
  </main>
</template>

<style scoped lang="scss">
.not-found-page {
  width: min(100% - 32px, 560px);
  margin: 12vh auto;
  padding: 32px;
  border: 1px solid var(--ft-color-secondary);
  background: var(--zine-paper-card);
  box-shadow: 6px 6px 0 var(--ft-color-secondary);

  h1 {
    margin-bottom: var(--ft-space-1);
    font-family: var(--ft-font-family-title);
  }

  p {
    margin: 0 0 var(--ft-space-3);
    color: var(--ft-color-primary);
    font-size: var(--ft-font-size-lg);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ft-space-2);
  }

  a {
    font-weight: 700;
  }
}
</style>
