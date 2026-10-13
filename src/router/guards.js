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
 * 注册全局导航守卫。鉴权与角色守卫在 feature/user-flow 中补充到这里。
 * @param {import('vue-router').Router} router
 */
export function installGuards(router) {
  router.afterEach((to) => {
    document.title = resolveDocumentTitle(to);
  });
}
