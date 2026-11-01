<script setup>
/**
 * 个人中心子页面统一的返回入口。
 * 纸质页顶部的波浪遮罩会裁掉约 24–38px，全局 main 已补足顶部间距，这里只负责视觉样式。
 */
defineProps({
  to: { type: [String, Object], default: 'profile' },
});
</script>

<template>
  <RouterLink
    class="back-link"
    :to="typeof to === 'string' ? { name: to } : to"
  >
    <span class="back-link__arrow" aria-hidden="true">←</span>
    <span>返回我的</span>
  </RouterLink>
</template>

<style scoped>
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  margin-bottom: var(--ft-space-2);
  padding: 8px 16px;
  border: 1px solid var(--ft-color-text);
  border-radius: 999px;
  background: var(--ft-color-surface);
  color: var(--ft-color-text);
  font-weight: 700;
  text-decoration: none;
}

.back-link:hover,
.back-link:focus-visible {
  border-color: var(--zine-stamp-red);
  color: var(--zine-stamp-red);
}

.back-link__arrow {
  font-size: 16px;
  line-height: 1;
}
</style>
