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

  it('实际审核路由只允许管理员和超级管理员进入', () => {
    const audit = routes.find((route) => route.name === 'adminAudit');
    expect(audit?.meta.requiresAdmin).toBe(true);
    const to = { ...audit, fullPath: audit.path };
    expect(resolveNavigation(to, GUEST)).toEqual({
      name: 'login',
      query: { redirect: '/admin/audit' },
    });
    expect(resolveNavigation(to, USER)).toEqual({ name: 'home' });
    expect(resolveNavigation(to, ADMIN)).toBe(true);
    expect(resolveNavigation(to, SUPER)).toBe(true);
  });

  it('实际超管路由仅允许超级管理员进入', () => {
    const superadmin = routes.find((route) => route.name === 'superadmin');
    expect(superadmin?.meta.requiresSuperadmin).toBe(true);
    const to = { ...superadmin, fullPath: superadmin.path };
    expect(resolveNavigation(to, GUEST)).toEqual({
      name: 'login',
      query: { redirect: '/superadmin' },
    });
    expect(resolveNavigation(to, USER)).toEqual({ name: 'home' });
    expect(resolveNavigation(to, ADMIN)).toEqual({ name: 'home' });

    expect(resolveNavigation(to, SUPER)).toBe(true);
  });

  it('用户管理路由仅允许超级管理员进入', () => {
    const users = routes.find((route) => route.name === 'superadminUsers');
    expect(users?.meta.requiresSuperadmin).toBe(true);
    const to = { ...users, fullPath: users.path };
    expect(resolveNavigation(to, GUEST)).toEqual({
      name: 'login',
      query: { redirect: '/superadmin/users' },
    });
    expect(resolveNavigation(to, ADMIN)).toEqual({ name: 'home' });
    expect(resolveNavigation(to, SUPER)).toBe(true);
  });
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
