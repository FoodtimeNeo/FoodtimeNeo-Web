import { describe, expect, it } from 'vitest';
import {
  APP_TITLE,
  resolveDocumentTitle,
  resolveNavigation,
} from './guards.js';
import { routes } from './routes.js';

const GUEST = { isAuthenticated: false, isAdmin: false, isSuperadmin: false };
const USER = { isAuthenticated: true, isAdmin: false, isSuperadmin: false };
const ADMIN = { isAuthenticated: true, isAdmin: true, isSuperadmin: false };
const SUPER = { isAuthenticated: true, isAdmin: true, isSuperadmin: true };

describe('resolveNavigation', () => {
  it('无 meta 要求时放行', () => {
    expect(resolveNavigation({ name: 'home', meta: {} }, GUEST)).toBe(true);
  });

  it('未登录访问需鉴权页面时跳登录并带 redirect', () => {
    expect(
      resolveNavigation(
        { name: 'profile', fullPath: '/profile', meta: { requiresAuth: true } },
        GUEST,
      ),
    ).toEqual({ name: 'login', query: { redirect: '/profile' } });
  });

  it('已登录访问登录页时回首页', () => {
    expect(resolveNavigation({ name: 'login', meta: {} }, USER)).toEqual({
      name: 'home',
    });
  });

  it('普通用户访问管理页时被挡回首页', () => {
    expect(
      resolveNavigation(
        { name: 'adminAudit', meta: { requiresAdmin: true } },
        USER,
      ),
    ).toEqual({ name: 'home' });
  });

  it('管理员可进管理页但进不了超管页', () => {
    expect(
      resolveNavigation(
        { name: 'adminAudit', meta: { requiresAdmin: true } },
        ADMIN,
      ),
    ).toBe(true);
    expect(
      resolveNavigation(
        { name: 'superadmin', meta: { requiresSuperadmin: true } },
        ADMIN,
      ),
    ).toEqual({ name: 'home' });
  });

  it('超管畅通', () => {
    expect(
      resolveNavigation(
        {
          name: 'superadmin',
          meta: { requiresAuth: true, requiresSuperadmin: true },
        },
        SUPER,
      ),
    ).toBe(true);
  });

  it.each([
    ['adminAudit', '/admin/audit', 'requiresAdmin'],
    ['adminManage', '/admin/manage', 'requiresAdmin'],
    ['superadmin', '/superadmin', 'requiresSuperadmin'],
    ['superadminAnalytics', '/superadmin/analytics', 'requiresSuperadmin'],
    ['superadminUsers', '/superadmin/users', 'requiresSuperadmin'],
  ])(
    '%s 路由按访客、用户、管理员和超管的权限放行',
    (name, path, roleRequirement) => {
      const route = routes.find((item) => item.name === name);
      expect(route?.path).toBe(path);
      expect(route?.meta.requiresAuth).toBe(true);
      expect(route?.meta[roleRequirement]).toBe(true);
      const to = { ...route, fullPath: path };
      expect(resolveNavigation(to, GUEST)).toEqual({
        name: 'login',
        query: { redirect: path },
      });
      expect(resolveNavigation(to, USER)).toEqual({ name: 'home' });
      expect(resolveNavigation(to, ADMIN)).toEqual(
        roleRequirement === 'requiresAdmin' ? true : { name: 'home' },
      );
      expect(resolveNavigation(to, SUPER)).toBe(true);
    },
  );
});

describe('resolveDocumentTitle', () => {
  it('拼接页面标题', () => {
    expect(resolveDocumentTitle({ meta: { title: '首页' } })).toBe(
      `首页 · ${APP_TITLE}`,
    );
  });

  it('无标题时回退到应用名', () => {
    expect(resolveDocumentTitle({ meta: {} })).toBe(APP_TITLE);
  });
});

describe('routes', () => {
  it('路由名称唯一且为 camelCase', () => {
    const names = routes.map((route) => route.name);
    expect(new Set(names).size).toBe(names.length);
    names.forEach((name) => expect(name).toMatch(/^[a-z][a-zA-Z0-9]*$/));
  });

  it('兜底路由位于最后', () => {
    expect(routes.at(-1).name).toBe('notFound');
  });
});
