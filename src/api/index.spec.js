import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installApi } from './index.js';
import { http } from './http.js';
import { clearSession, writeSession } from '@/utils/authSession.js';

/**
 * 构造一个最小的 router 替身：记录 replace 调用，暴露可改写的 currentRoute。
 */
function createRouterStub(current) {
  return {
    currentRoute: { value: current },
    replace: vi.fn(),
  };
}

describe('installApi', () => {
  beforeEach(() => {
    clearSession();
    // 还原 axios 行为：非 2xx 以带 response 的错误 reject，走错误拦截器。
    http.defaults.adapter = (config) => {
      const status = config.__mockStatus ?? 200;
      const response = {
        data: config.__mockData,
        status,
        statusText: 'ERR',
        headers: {},
        config,
      };
      if (status >= 200 && status < 300) return Promise.resolve(response);
      const error = new Error(`status ${status}`);
      error.response = response;
      return Promise.reject(error);
    };
  });

  afterEach(() => {
    delete http.defaults.adapter;
  });

  it('401 时清理会话并跳转登录，带 redirect', async () => {
    writeSession({ token: 't', user: {} });
    const router = createRouterStub({ name: 'profile', fullPath: '/profile' });
    installApi({ router });

    await expect(
      http.get('/profile', {
        __mockStatus: 401,
        __mockData: { message: '过期' },
      }),
    ).rejects.toMatchObject({ status: 401 });

    expect(router.replace).toHaveBeenCalledWith({
      name: 'login',
      query: { redirect: '/profile' },
    });
  });

  it('已在登录页时 401 不再重复跳转', async () => {
    const router = createRouterStub({ name: 'login', fullPath: '/login' });
    installApi({ router });

    await expect(
      http.get('/auth/login', { __mockStatus: 401, __mockData: {} }),
    ).rejects.toMatchObject({ status: 401 });

    expect(router.replace).not.toHaveBeenCalled();
  });

  it('403 时触发权限提示', async () => {
    const router = createRouterStub({ name: 'home', fullPath: '/' });
    const notifyForbidden = vi.fn();
    installApi({ router, notifyForbidden });

    await expect(
      http.get('/admin', {
        __mockStatus: 403,
        __mockData: { message: '没有权限' },
      }),
    ).rejects.toMatchObject({ status: 403 });

    expect(notifyForbidden).toHaveBeenCalledWith('没有权限');
  });
});
