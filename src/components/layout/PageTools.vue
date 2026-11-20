<script setup>
defineProps({
  home: { type: Boolean, default: true },
  search: { type: Boolean, default: true },
});
</script>
<template>
  <div class="page-tools">
    <RouterLink
      v-if="search"
      :to="{ name: 'dishSearch' }"
      aria-label="搜索菜品"
      title="搜索菜品"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.2 15.2 5.3 5.3" />
      </svg>
    </RouterLink>
    <RouterLink
      v-if="home"
      :to="{ name: 'home' }"
      aria-label="回到食堂首页"
      title="回到食堂首页"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path d="m3 10.5 9-7.5 9 7.5M5.5 9.5V20h13V9.5M10 20v-6h4v6" />
      </svg>
    </RouterLink>
  </div>
</template>
<style scoped>
.page-tools {
  display: flex;
  align-items: center;
  flex: none;
  gap: 6px;
}
.page-tools a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 14px;
  color: var(--ft-color-text);
  background: transparent;
}
.page-tools svg {
  width: 24px;
  height: 24px;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.page-tools a:hover {
  background: var(--ft-color-bg-soft);
}
.page-tools a:focus-visible {
  outline: 2px solid var(--ft-color-primary);
  outline-offset: 2px;
}
</style>
