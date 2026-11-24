import { expect, it } from 'vitest';
import { pageIdentity } from './pageIdentity.js';
it('统一搜索切换排序或类型时复用页面，账号隔离仍由 App 的外层 key 保证', () => {
  expect(
    pageIdentity({
      name: 'dishSearch',
      path: '/canteens/search',
      fullPath: '/canteens/search?sort=distance',
    }),
  ).toBe('/canteens/search');
  expect(
    pageIdentity({
      name: 'dishSearch',
      path: '/canteens/search',
      fullPath: '/canteens/search?tab=notes',
    }),
  ).toBe('/canteens/search');
});
it('其它业务路由仍按完整路径区分页面', () => {
  expect(
    pageIdentity({ name: 'profile', fullPath: '/profile?tab=history' }),
  ).toBe('/profile?tab=history');
});
