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
    path: '/canteens',
    name: 'canteenList',
    component: () => import('@/views/canteen/CanteenListView.vue'),
    meta: { title: '食堂', layout: 'default' },
  },
  {
    path: '/canteens/:canteenId',
    name: 'canteenDetail',
    component: () => import('@/views/canteen/CanteenDetailView.vue'),
    meta: { title: '食堂详情', layout: 'default' },
  },
  {
    path: '/canteens/:canteenId/stalls/:stallId',
    name: 'stallDetail',
    component: () => import('@/views/canteen/StallDetailView.vue'),
    meta: { title: '档口', layout: 'default' },
  },
  {
    path: '/canteens/:canteenId/dishes/:dishId',
    name: 'dishDetail',
    component: () => import('@/views/dish/DishDetailView.vue'),
    meta: { title: '菜品', layout: 'default' },
  },
  {
    path: '/canteens/:canteenId/dishes/:dishId/gallery',
    name: 'dishGallery',
    component: () => import('@/views/dish/DishGalleryView.vue'),
    meta: { title: '图册', layout: 'default' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { title: '登录', layout: 'blank' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { title: '注册', layout: 'blank' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('@/views/error/NotFoundView.vue'),
    meta: { title: '页面不存在', layout: 'default' },
  },
];
