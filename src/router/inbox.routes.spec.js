import { describe, expect, it } from 'vitest';
import { routes } from './routes.js';

describe('信箱路由', () => {
  it('注册用户信箱路由', () => {
    const route = routes.find((entry) => entry.name === 'inboxView');
    expect(route).toMatchObject({
      path: '/inbox',
      meta: {
        title: '消息信箱',
        layout: 'default',
        requiresAuth: true,
        nav: 'profile',
      },
    });
  });

  it('注册管理端公告路由', () => {
    const route = routes.find((entry) => entry.name === 'adminNotices');
    expect(route).toMatchObject({
      path: '/admin/notices',
      meta: {
        title: '公告管理',
        layout: 'admin',
        requiresAuth: true,
        requiresAdmin: true,
      },
    });
  });
});
