import { describe, expect, it } from 'vitest';
import { createRouter, createMemoryHistory } from 'vue-router';
import { routes } from '@/router/routes.js';
import {
  navigationItems,
  getNavigationItems,
  navigationTarget,
  resolveActiveNavigation,
  resolveBreadcrumbs,
} from './navigation.js';

const home = { name: 'home', meta: { title: '首页' } };
const canteens = { name: 'canteenList', meta: { title: '食堂' } };
const detail = { name: 'canteenDetail', meta: { title: '第一食堂' } };

describe('布局导航', () => {
  it('主导航包含食堂、社区与我的入口，旧点评地址不匹配业务页面', () => {
    expect(navigationItems.map((item) => item.name)).toEqual([
      'canteenList',
      'community',
      'profile',
    ]);
    const router = createRouter({ history: createMemoryHistory(), routes });
    expect(router.resolve('/reviews/new').name).toBe('notFound');
  });
  it('点评地址必须保留菜品上下文，并使用食堂栏目及完整父级面包屑', () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    const route = router.resolve({
      name: 'dishReviewCreate',
      params: { canteenId: 'c1', stallId: 's1', dishId: 'd1' },
    });
    expect(route.path).toBe('/canteens/c1/stalls/s1/dishes/d1/reviews/new');
    expect(route.meta.requiresAuth).toBe(true);
    expect(resolveActiveNavigation(route)).toBe('canteenList');
    const crumbs = resolveBreadcrumbs(route);
    expect(crumbs.map((crumb) => crumb.name)).toEqual([
      'home',
      'canteenList',
      'canteenDetail',
      'stallDetail',
      'dishDetail',
      'dishReviewCreate',
    ]);
    expect(
      router.resolve({ name: crumbs[4].name, params: crumbs[4].params }).path,
    ).toBe('/canteens/c1/stalls/s1/dishes/d1');
  });
  it('社区与帖子详情页能正确解析高亮与面包屑', () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    const feedRoute = router.resolve('/community');
    expect(feedRoute.name).toBe('community');
    expect(resolveActiveNavigation(feedRoute)).toBe('community');

    const detailRoute = router.resolve('/community/posts/post-101');
    expect(detailRoute.name).toBe('communityDetail');
    expect(resolveActiveNavigation(detailRoute)).toBe('community');
    const crumbs = resolveBreadcrumbs(detailRoute);
    expect(crumbs.map((c) => c.name)).toEqual([
      'home',
      'community',
      'communityDetail',
    ]);
  });
  it('首页只有一个面包屑，食堂标签仍能进入食堂列表', () => {
    const route = { matched: [home], meta: home.meta };
    expect(resolveBreadcrumbs(route)).toEqual([
      { name: 'home', title: '首页' },
    ]);
    expect(resolveActiveNavigation(route)).toBeNull();
    expect(navigationTarget(navigationItems[0], route)).toEqual({
      name: 'canteenList',
    });
  });

  it('由嵌套路由生成完整面包屑，并高亮所属栏目', () => {
    const route = { matched: [canteens, detail], meta: detail.meta };
    expect(resolveBreadcrumbs(route)).toEqual([
      { name: 'home', title: '首页' },
      { name: 'canteenList', title: '食堂' },
      { name: 'canteenDetail', title: '第一食堂' },
    ]);
    expect(resolveActiveNavigation(route)).toBe('canteenList');
  });

  it('独立路由可通过 meta.nav 指定高亮栏目', () => {
    const route = {
      matched: [{ name: 'dishDetail', meta: { title: '菜品详情' } }],
      meta: { nav: 'canteenList' },
    };
    expect(resolveActiveNavigation(route)).toBe('canteenList');
    expect(resolveBreadcrumbs(route)).toEqual([
      { name: 'home', title: '首页' },
      { name: 'dishDetail', title: '菜品详情' },
    ]);
  });

  it('未知路由没有高亮项', () => {
    expect(
      resolveActiveNavigation({
        matched: [{ name: 'notFound', meta: { title: '页面不存在' } }],
        meta: {},
      }),
    ).toBeNull();
  });

  it('只有管理员在社区和我的之间有管理入口，所有管理页面均高亮管理', () => {
    expect(getNavigationItems(false).map((item) => item.label)).toEqual([
      '食堂',
      '社区',
      '我的',
    ]);
    expect(getNavigationItems(true).map((item) => item.label)).toEqual([
      '食堂',
      '社区',
      '管理',
      '我的',
    ]);
    const router = createRouter({ history: createMemoryHistory(), routes });
    for (const name of [
      'adminAudit',
      'adminManage',
      'managedReviews',
      'moderationLogs',
      'superadminUsers',
    ]) {
      expect(resolveActiveNavigation(router.resolve({ name }))).toBe(
        'adminAudit',
      );
    }
  });

  it('重复点击当前栏目保留详情页和参数，其他栏目正常切换', () => {
    const router = createRouter({ history: createMemoryHistory(), routes });
    const route = router.resolve('/canteens/c1/stalls/s1/dishes/d1');
    expect(navigationTarget(navigationItems[0], route)).toBe(route.fullPath);
    expect(navigationTarget(navigationItems[2], route)).toEqual({
      name: 'profile',
    });
  });
});
