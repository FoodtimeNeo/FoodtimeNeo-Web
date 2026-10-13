import { describe, expect, it } from 'vitest';
import { resolveActiveNavigation, resolveBreadcrumbs } from './navigation.js';

const home = { name: 'home', meta: { title: '首页' } };
const canteens = { name: 'canteenList', meta: { title: '食堂' } };
const detail = { name: 'canteenDetail', meta: { title: '第一食堂' } };

describe('布局导航', () => {
  it('首页只有一个面包屑并高亮首页', () => {
    const route = { matched: [home], meta: home.meta };
    expect(resolveBreadcrumbs(route)).toEqual([
      { name: 'home', title: '首页' },
    ]);
    expect(resolveActiveNavigation(route)).toBe('home');
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
});
