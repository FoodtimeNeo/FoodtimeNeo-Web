import { setForbiddenHandler, setUnauthorizedHandler } from './http.js';

/**
 * 把 api 层与应用环境（router / 提示）连接起来。在 main.js 中调用一次。
 * api 层不直接依赖 router 或 UI 组件库，鉴权失效跳转与权限提示由这里注入。
 * @param {{ router: import('vue-router').Router, notifyForbidden?: (message: string) => void }} deps
 */
export function installApi({ router, notifyForbidden }) {
  setUnauthorizedHandler(() => {
    const current = router.currentRoute.value;
    if (current.name === 'login') return;
    router.replace({
      name: 'login',
      query: { redirect: current.fullPath },
    });
  });

  if (notifyForbidden) {
    setForbiddenHandler((error) =>
      notifyForbidden(error.message || '没有权限'),
    );
  }
}

export { http, ApiError } from './http.js';
