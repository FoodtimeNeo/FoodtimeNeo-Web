import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
const api = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));
vi.mock('@/api/auth.api.js', () => api);
import { useAuthStore } from './useAuthStore.js';
beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  Object.values(api).forEach((fn) => fn.mockReset());
});
const user = {
  id: 'one',
  email: '20260001@bjtu.edu.cn',
  displayName: '测试用户',
  role: 'user',
};
describe('服务端会话', () => {
  it('本地伪造Token和超管角色不能恢复身份', async () => {
    localStorage.setItem(
      'foodtime_auth_session',
      JSON.stringify({ token: 'fake', user: { role: 'superadmin' } }),
    );
    api.fetchCurrentUser.mockRejectedValue({ status: 401 });
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);
    await store.refresh();
    expect(store.role).toBe('guest');
    expect(localStorage.length).toBe(0);
  });
  it('登录按嵌套user设置状态，不写入浏览器存储', async () => {
    api.login.mockResolvedValue({
      user: { ...user, role: 'admin' },
      expiresAt: 'future',
    });
    const store = useAuthStore();
    await store.login({});
    expect(store.isAdmin).toBe(true);
    expect(store.displayName).toBe('测试用户');
    expect(localStorage.length).toBe(0);
    expect(store.token).toBeUndefined();
  });
  it('刷新及角色降级由me响应决定', async () => {
    api.fetchCurrentUser
      .mockResolvedValueOnce({ ...user, role: 'superadmin' })
      .mockResolvedValueOnce(user);
    const store = useAuthStore();
    await store.refresh();
    expect(store.isSuperadmin).toBe(true);
    await store.refresh();
    expect(store.isAdmin).toBe(false);
  });
  it('退出失败不假称注销成功，成功才清除身份', async () => {
    const store = useAuthStore();
    store.setSession({ user });
    api.logout.mockRejectedValueOnce({ status: 503, message: 'offline' });
    await expect(store.logout()).rejects.toMatchObject({ status: 503 });
    expect(store.isAuthenticated).toBe(true);
    await store.logout();
    expect(store.isAuthenticated).toBe(false);
  });
  it('注册不自动登录；未知服务端角色不能授予权限', async () => {
    const store = useAuthStore();
    await store.register({});
    expect(store.isAuthenticated).toBe(false);
    api.fetchCurrentUser.mockResolvedValue({ ...user, role: 'owner' });
    await expect(store.refresh()).rejects.toMatchObject({ code: 'PROTOCOL' });
    expect(store.isAuthenticated).toBe(false);
  });
  it('旧身份刷新迟到时不能覆盖新登录用户', async () => {
    let resolve;
    api.fetchCurrentUser.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const store = useAuthStore();
    const refresh = store.refresh();
    api.login.mockResolvedValue({ user: { ...user, id: 'new' } });
    await store.login({});
    resolve({ ...user, role: 'superadmin' });
    await refresh;
    expect(store.user.id).toBe('new');
    expect(store.isSuperadmin).toBe(false);
  });
});
