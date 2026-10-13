/**
 * 路由表。层级关系见 docs/architecture.md「路由树」。
 * 约定：path 使用 kebab-case，name 使用 camelCase，页面组件一律懒加载。
 */
export const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/home/HomeView.vue'),
    meta: { title: '首页', layout: 'default' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('@/views/error/NotFoundView.vue'),
    meta: { title: '页面不存在', layout: 'default' },
  },
];
