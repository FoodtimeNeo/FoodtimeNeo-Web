/**
 * 路由表。层级关系见 docs/architecture.md「路由树」。
 * 约定：path 使用 kebab-case，name 使用 camelCase，页面组件一律懒加载。
 */
export const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/home/HomeView.vue'),
    meta: { title: '首页', layout: 'default', requiresAuth: true },
  },
  {
    path: '/canteens',
    name: 'canteenList',
    component: () => import('@/views/canteen/CanteenListView.vue'),
    meta: { title: '食堂', layout: 'default', requiresAuth: true },
  },
  {
    path: '/canteens/:canteenId',
    name: 'canteenDetail',
    component: () => import('@/views/canteen/CanteenDetailView.vue'),
    meta: {
      title: '食堂详情',
      layout: 'default',
      requiresAuth: true,
      nav: 'canteenList',
    },
  },
  {
    path: '/canteens/:canteenId/stalls/:stallId',
    name: 'stallDetail',
    component: () => import('@/views/canteen/StallDetailView.vue'),
    meta: {
      title: '档口',
      layout: 'default',
      requiresAuth: true,
      nav: 'canteenList',
    },
  },
  {
    path: '/canteens/:canteenId/stalls/:stallId/dishes/:dishId',
    name: 'dishDetail',
    component: () => import('@/views/dish/DishDetailView.vue'),
    meta: {
      title: '菜品',
      layout: 'default',
      requiresAuth: true,
      nav: 'canteenList',
    },
  },
  {
    path: '/canteens/:canteenId/stalls/:stallId/dishes/:dishId/gallery',
    name: 'dishGallery',
    component: () => import('@/views/dish/DishGalleryView.vue'),
    meta: {
      title: '图册',
      layout: 'default',
      requiresAuth: true,
      nav: 'canteenList',
    },
  },
  {
    path: '/reviews/new',
    name: 'reviewCreate',
    component: () => import('@/views/review/ReviewCreateView.vue'),
    meta: { title: '写点评', layout: 'default', requiresAuth: true },
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
    path: '/admin/audit',
    name: 'adminAudit',
    component: () => import('@/views/admin/AdminAuditView.vue'),
    meta: {
      title: '内容审核',
      layout: 'admin',
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: '/admin/manage',
    name: 'adminManage',
    component: () => import('@/views/admin/AdminManageView.vue'),
    meta: {
      title: '内容管理',
      layout: 'admin',
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: '/superadmin',
    name: 'superadmin',
    component: () => import('@/views/superadmin/SuperadminView.vue'),
    meta: {
      title: '超级管理员看板',
      layout: 'admin',
      requiresAuth: true,
      requiresSuperadmin: true,
    },
  },
  {
    path: '/superadmin/users',
    name: 'superadminUsers',
    component: () => import('@/views/superadmin/SuperadminUsersView.vue'),
    meta: {
      title: '用户与邀请码管理',
      layout: 'admin',
      requiresAuth: true,
      requiresSuperadmin: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('@/views/error/NotFoundView.vue'),
    meta: { title: '页面不存在', layout: 'default' },
  },
];
