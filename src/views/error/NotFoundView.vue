<template>
  <main class="not-found-page">
    <h1>这一页还没开张</h1>
    <RouterLink :to="{ name: 'home' }">回到首页</RouterLink>
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

  a {
    color: var(--ft-color-primary);
    font-weight: 700;
  }
}
</style>
