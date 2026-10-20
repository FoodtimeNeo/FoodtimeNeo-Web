import { useAuthStore } from '@/store/useAuthStore.js';

export const APP_TITLE = '北交干饭吧';

/**
 * 根据路由 meta.title 生成页面标题。
 * @param {import('vue-router').RouteLocationNormalized} to
 * @returns {string}
 */
export function resolveDocumentTitle(to) {
  const title = to.meta?.title;
  return title ? `${title} · ${APP_TITLE}` : APP_TITLE;
}

/**
 * 根据目标路由的 meta 与当前会话，决定导航去向。
 * 纯函数，便于测试；不读取全局状态，会话信息由调用方传入。
 *
 * @param {import('vue-router').RouteLocationNormalized} to
 * @param {{ isAuthenticated: boolean, isAdmin: boolean, isSuperadmin: boolean }} auth
 * @returns {true | import('vue-router').RouteLocationRaw}
 *   true 表示放行，否则返回重定向目标。
 */
export function resolveNavigation(to, auth) {
  const meta = to.meta ?? {};

  // 已登录用户访问登录/注册页时，直接回首页。
  if ((to.name === 'login' || to.name === 'register') && auth.isAuthenticated) {
    return { name: 'home' };
  }

  if (meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (meta.requiresSuperadmin && !auth.isSuperadmin) {
    return auth.isAuthenticated ? { name: 'home' } : { name: 'login' };
  }

  if (meta.requiresAdmin && !auth.isAdmin) {
    return auth.isAuthenticated ? { name: 'home' } : { name: 'login' };
  }

  return true;
}

/**
 * 注册全局导航守卫：鉴权/角色拦截 + 页面标题。
 * @param {import('vue-router').Router} router
 */
export function installGuards(router) {
  router.beforeEach(async (to) => {
    const auth = useAuthStore();
    if (!auth.initialized) {
      await auth.refresh();
    } else if (
      to.meta.requiresAuth ||
      to.meta.requiresAdmin ||
      to.meta.requiresSuperadmin
    ) {
      if (!auth.isAuthenticated) {
        await auth.refresh();
      } else {
        auth.refresh().catch(() => {});
      }
    }
    return resolveNavigation(to, {
      isAuthenticated: auth.isAuthenticated,
      isAdmin: auth.isAdmin,
      isSuperadmin: auth.isSuperadmin,
    });
  });

  router.afterEach((to) => {
    document.title = resolveDocumentTitle(to);
  });
}
