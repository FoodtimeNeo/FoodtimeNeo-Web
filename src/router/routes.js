/**
 * 路由表。层级关系见 docs/architecture.md「路由树」。
 * 约定：path 使用 kebab-case，name 使用 camelCase，页面组件一律懒加载。
 */
export const routes = [
  {
    path: '/profile/review-replies',
    name: 'myReviewReplies',
    component: () => import('@/views/profile/MyReviewRepliesView.vue'),
    meta: {
      title: '我的回复',
      layout: 'default',
      requiresAuth: true,
      nav: 'profile',
    },
  },
  {
    path: '/admin/reviews',
    name: 'managedReviews',
    component: () => import('@/views/admin/ManagedReviewsView.vue'),
    meta: {
      title: '正式评论管理',
      layout: 'admin',
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  {
    path: '/admin/moderation/logs',
    name: 'moderationLogs',
    component: () => import('@/views/admin/ModerationLogsView.vue'),
    meta: {
      title: '审核日志',
      layout: 'admin',
      requiresAuth: true,
      requiresAdmin: true,
    },
  },
  ...[
    [
      'photo',
      '/canteens/:canteenId/stalls/:stallId/dishes/:dishId/images/new',
      'photoSubmission',
      '上传菜品图片',
    ],
    [
      'dish',
      '/canteens/:canteenId/stalls/:stallId/submissions/new',
      'dishSubmission',
      '投稿菜品',
    ],
    [
      'stall',
      '/canteens/:canteenId/submissions/new',
      'stallSubmission',
      '投稿档口',
    ],
  ].map(([kind, path, name, title]) => ({
    path,
    name,
    component: () => import('@/views/submission/SubmissionCreateView.vue'),
    meta: {
      title,
      layout: 'default',
      requiresAuth: true,
      nav: 'canteenList',
      submissionKind: kind,
    },
  })),
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/profile/ProfileView.vue'),
    meta: {
      title: '我的',
      layout: 'default',
      requiresAuth: true,
      nav: 'profile',
    },
  },
  {
    path: '/profile/reviews',
    name: 'myReviews',
    component: () => import('@/views/profile/MyReviewsView.vue'),
    meta: {
      title: '我的评论',
      layout: 'default',
      requiresAuth: true,
      nav: 'profile',
    },
  },
  {
    path: '/profile/submissions',
    name: 'mySubmissions',
    component: () => import('@/views/profile/MySubmissionsView.vue'),
    meta: {
      title: '我的提交',
      layout: 'default',
      requiresAuth: true,
      nav: 'profile',
    },
  },
  {
    path: '/profile/password',
    name: 'changePassword',
    component: () => import('@/views/profile/ChangePasswordView.vue'),
    meta: {
      title: '修改密码',
      layout: 'default',
      requiresAuth: true,
      nav: 'profile',
    },
  },
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
    path: '/community',
    name: 'community',
    component: () => import('@/views/community/CommunityFeedView.vue'),
    meta: {
      title: '社区',
      layout: 'default',
      requiresAuth: true,
      nav: 'community',
    },
  },
  {
    path: '/community/posts/:postId',
    name: 'communityDetail',
    component: () => import('@/views/community/CommunityDetailView.vue'),
    meta: {
      title: '帖子详情',
      layout: 'default',
      requiresAuth: true,
      nav: 'community',
    },
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
    path: '/canteens/:canteenId/stalls/:stallId/dishes/:dishId/reviews/new',
    name: 'dishReviewCreate',
    component: () => import('@/views/dish/DishReviewCreateView.vue'),
    meta: {
      title: '写点评',
      layout: 'default',
      requiresAuth: true,
      nav: 'canteenList',
    },
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
    redirect: { name: 'superadminUsers' },
    meta: {
      title: '用户管理',
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
      title: '用户管理',
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
