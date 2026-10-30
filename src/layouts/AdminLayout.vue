<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/store/useAuthStore.js';
import DefaultLayout from './DefaultLayout.vue';

const route = useRoute();
const auth = useAuthStore();

const links = computed(() => [
  { name: 'adminAudit', label: '内容审核' },
  { name: 'adminManage', label: '内容管理' },
  { name: 'managedReviews', label: '评论管理' },
  { name: 'moderationLogs', label: '审核日志' },
  ...(auth.isSuperadmin
    ? [
        { name: 'adminNotices', label: '公告管理' },
        { name: 'superadminAnalytics', label: '数据分析' },
        { name: 'superadminUsers', label: '用户管理' },
      ]
    : []),
]);
</script>

<template>
  <DefaultLayout>
    <div class="admin-layout">
      <header class="admin-layout__header">
        <div>
          <span class="stamp">管理工作台</span>
          <h1>管理中心</h1>
        </div>
        <p>当前账号：{{ auth.displayName }}</p>
      </header>
      <nav class="admin-layout__nav" aria-label="管理导航">
        <RouterLink
          v-for="link in links"
          :key="link.name"
          :to="{ name: link.name }"
          :aria-current="route.name === link.name ? 'page' : undefined"
        >
          {{ link.label }}
        </RouterLink>
      </nav>
      <slot />
    </div>
  </DefaultLayout>
</template>

<style scoped lang="scss">
.admin-layout {
  padding: var(--ft-space-3);

  &__header {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: var(--ft-space-2);

    h1 {
      margin: var(--ft-space-1) 0 0;
      font-family: var(--ft-font-family-title);
    }

    p {
      margin: 0;
      color: var(--ft-color-text-muted);
    }
  }

  &__nav {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ft-space-1);
    margin: var(--ft-space-3) 0;
    border-bottom: 2px solid var(--ft-color-text);
    overflow-x: auto;

    a {
      min-height: 44px;
      padding: 10px var(--ft-space-2);
      color: var(--ft-color-text);
      font-weight: 700;
      text-decoration: none;
    }

    a[aria-current='page'] {
      background: var(--ft-color-text);
      color: var(--zine-paper-card);
      box-shadow: 2px 2px 0 var(--ft-color-primary);
    }
  }
}

@media (max-width: 768px) {
  .admin-layout {
    padding: var(--zine-page-padding-mobile);
  }
}
</style>
