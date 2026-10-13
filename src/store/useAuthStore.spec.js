import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const loginApi = vi.fn();
const registerApi = vi.fn();
vi.mock('@/api/auth.api.js', () => ({
  login: (...args) => loginApi(...args),
  register: (...args) => registerApi(...args),
}));

import { useAuthStore } from './useAuthStore.js';
import { readSession } from '@/utils/authSession.js';

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    loginApi.mockReset();
    registerApi.mockReset();
  });

  it('初始为未登录', () => {
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);
    expect(store.role).toBe('guest');
  });

  it('登录写入 token、用户与持久化', async () => {
    loginApi.mockResolvedValue({
      id: 'u1',
      account: 'a1',
      email: 'a@b.c',
      nickname: '小明',
      role: 'admin',
      token: 'jwt-1',
    });
    const store = useAuthStore();
    const user = await store.login({ loginId: 'a1', password: 'p' });

    expect(user.nickname).toBe('小明');
    expect(store.isAuthenticated).toBe(true);
    expect(store.isAdmin).toBe(true);
    expect(store.isSuperadmin).toBe(false);
    expect(readSession()).toEqual({
      token: 'jwt-1',
      user: {
        id: 'u1',
        account: 'a1',
        email: 'a@b.c',
        nickname: '小明',
        role: 'admin',
      },
    });
  });

  it('注册不写入会话', async () => {
    registerApi.mockResolvedValue({ id: 'u2', account: 'a2', role: 'user' });
    const store = useAuthStore();
    await store.register({ email: 'x@y.z', password: 'p', nickname: 'n' });
    expect(store.isAuthenticated).toBe(false);
    expect(readSession()).toBeNull();
  });

  it('退出登录清空状态与存储', async () => {
    loginApi.mockResolvedValue({
      id: 'u1',
      account: 'a1',
      role: 'user',
      token: 't',
    });
    const store = useAuthStore();
    await store.login({ loginId: 'a1', password: 'p' });
    store.logout();
    expect(store.isAuthenticated).toBe(false);
    expect(readSession()).toBeNull();
  });

  it('刷新后从存储恢复会话', async () => {
    loginApi.mockResolvedValue({
      id: 'u1',
      account: 'a1',
      role: 'superadmin',
      token: 't',
    });
    await useAuthStore().login({ loginId: 'a1', password: 'p' });

    // 模拟新一轮应用启动：重建 pinia，store 从 localStorage 恢复。
    setActivePinia(createPinia());
    const restored = useAuthStore();
    expect(restored.isAuthenticated).toBe(true);
    expect(restored.isSuperadmin).toBe(true);
  });

  it('patchUser 更新字段并保留 token', async () => {
    loginApi.mockResolvedValue({
      id: 'u1',
      account: 'a1',
      role: 'user',
      token: 't',
    });
    const store = useAuthStore();
    await store.login({ loginId: 'a1', password: 'p' });
    store.patchUser({ nickname: '新名' });
    expect(store.displayName).toBe('新名');
    expect(readSession().token).toBe('t');
  });
});
