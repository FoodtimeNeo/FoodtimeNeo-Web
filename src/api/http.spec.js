import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  http,
  getCsrf,
  invalidateSession,
  setUnauthorizedHandler,
  setForbiddenHandler,
  toApiError,
  setApiFailureHandler,
} from './http.js';
import { isPageUpdateSafe } from '@/utils/updateSafety.js';
let received;
const originalAdapter = http.defaults.adapter;
function response(config, data, status = 200) {
  return { data, status, headers: {}, config, statusText: 'OK' };
}
beforeEach(() => {
  invalidateSession();
  setUnauthorizedHandler(null);
  setForbiddenHandler(null);
  setApiFailureHandler(null);
  received = [];
  http.defaults.adapter = vi.fn(async (config) => {
    received.push(config);
    return response(config, {
      code: 'OK',
      data:
        config.url === '/auth/csrf'
          ? { headerName: 'X-CSRF-TOKEN', token: 'test-csrf' }
          : (config.mockData ?? []),
    });
  });
});
afterEach(() => {
  http.defaults.adapter = originalAdapter;
});
describe('真实HTTP契约', () => {
  it('等待已有CSRF期间切换会话，旧写请求不会进入传输层', async () => {
    await getCsrf();
    const task = http.post('/dishes/d/reviews', {
      rating: 5,
      content: '旧账号草稿',
    });
    await Promise.resolve();
    invalidateSession();
    await expect(task).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    expect(
      received.filter((config) => config.url !== '/auth/csrf'),
    ).toHaveLength(0);
  });
  it('仅按OK解包，Cookie凭据启用且不发送旧Bearer', async () => {
    expect(
      await http.get('/dining-halls', {
        headers: { Authorization: 'Bearer old' },
        mockData: [{ id: 'hall' }],
      }),
    ).toEqual([{ id: 'hall' }]);
    expect(received[0].withCredentials).toBe(true);
    expect(received[0].headers.Authorization).toBeUndefined();
  });
  it('并发写请求共用内存CSRF，获取令牌在写入之前', async () => {
    await Promise.all([http.post('/one', {}), http.put('/two', {})]);
    expect(received.filter((r) => r.url === '/auth/csrf')).toHaveLength(1);
    expect(received[0].url).toBe('/auth/csrf');
    received
      .filter((r) => r.url !== '/auth/csrf')
      .forEach((r) => expect(r.headers['X-CSRF-TOKEN']).toBe('test-csrf'));
    expect(localStorage.length).toBe(0);
  });
  it.each([
    'https://evil.example/x',
    '//evil.example/x',
    '/../logout',
    '/%2e%2e/logout',
    '/x\\y',
  ])('拒绝越界URL %s且不会向传输层发请求', async (url) => {
    await expect(http.post(url, {})).rejects.toMatchObject({
      code: 'UNSAFE_URL',
    });
    expect(received).toHaveLength(0);
  });
  it('拒绝baseURL覆盖', async () => {
    await expect(
      http.get('/dining-halls', { baseURL: 'https://evil.example' }),
    ).rejects.toMatchObject({ code: 'UNSAFE_URL' });
  });
  it('拒绝旧code=0及HTML成功响应', async () => {
    http.defaults.adapter = async (config) =>
      response(config, { code: 0, data: {} });
    await expect(http.get('/x')).rejects.toMatchObject({ code: 'PROTOCOL' });
    http.defaults.adapter = async (config) =>
      response(config, '<html>wrong proxy</html>');
    await expect(http.get('/x')).rejects.toMatchObject({ code: 'PROTOCOL' });
  });
  it('CSRF失效不重放写入，下次手动请求才重新获取', async () => {
    const denied = vi.fn();
    setForbiddenHandler(denied);
    const adapter = http.defaults.adapter;
    let writes = 0;
    http.defaults.adapter = async (config) => {
      if (config.url === '/auth/csrf') return adapter(config);
      writes += 1;
      if (writes === 1)
        throw {
          config,
          response: response(
            config,
            { code: 'CSRF_INVALID', message: '令牌失效' },
            403,
          ),
        };
      return adapter(config);
    };
    await expect(http.post('/one', {})).rejects.toMatchObject({
      bizCode: 'CSRF_INVALID',
    });
    expect(writes).toBe(1);
    expect(denied).not.toHaveBeenCalled();
    await http.post('/one', {});
    expect(received.filter((r) => r.url === '/auth/csrf')).toHaveLength(2);
  });
  it('切换会话后旧401不清空新账号', async () => {
    const unauthorized = vi.fn();
    setUnauthorizedHandler(unauthorized);
    let reject;
    http.defaults.adapter = (config) =>
      new Promise((resolve, fail) => {
        reject = () => fail({ config, response: response(config, {}, 401) });
      });
    const task = http.get('/users/me/profile');
    await vi.waitFor(() => expect(reject).toBeTypeOf('function'));
    invalidateSession();
    reject();
    await expect(task).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
    expect(unauthorized).not.toHaveBeenCalled();
  });
  it('错误只保留安全字段，识别限流等待时间', () => {
    const error = toApiError({
      response: {
        status: 429,
        headers: { 'retry-after': '30' },
        data: { code: 'LOGIN_RATE_LIMITED', message: '稍后再试' },
      },
      config: { data: { password: 'secret' } },
    });
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'RATE_LIMITED', retryAfter: 30 });
    expect(error.cause).toBeUndefined();
    expect(error.config).toBeUndefined();
    expect(toApiError({ code: 'ECONNABORTED' }).code).toBe('TIMEOUT');
    expect(toApiError(new Error()).code).toBe('NETWORK');
  });
  it('写请求从准备CSRF起阻止自动更新，失败后释放且绝不重发', async () => {
    let finish;
    let writes = 0;
    http.defaults.adapter = async (config) => {
      if (config.url === '/auth/csrf')
        return new Promise((resolve) => {
          finish = () =>
            resolve(
              response(config, {
                code: 'OK',
                data: { headerName: 'X-CSRF-TOKEN', token: 'token' },
              }),
            );
        });
      writes++;
      throw {
        config,
        response: response(
          config,
          {
            code: 'INTERNAL_ERROR',
            message: '服务器内部错误',
            requestId: 'req-500',
          },
          500,
        ),
      };
    };
    const observer = vi.fn();
    setApiFailureHandler(observer);
    const task = http.post('/reviews', { content: 'private' });
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    expect(isPageUpdateSafe()).toBe(false);
    finish();
    await expect(task).rejects.toMatchObject({
      requestId: 'req-500',
      code: 'SERVER',
      message: '服务器内部错误（请求编号：req-500）',
    });
    expect(isPageUpdateSafe()).toBe(true);
    expect(observer).toHaveBeenCalledOnce();
    expect(writes).toBe(1);
  });
  it('CSRF准备失败也释放写入保护', async () => {
    http.defaults.adapter = async (config) => {
      throw {
        config,
        response: response(config, { code: 'INTERNAL_ERROR' }, 500),
      };
    };
    await expect(http.post('/reviews', {})).rejects.toMatchObject({
      status: 500,
    });
    expect(isPageUpdateSafe()).toBe(true);
  });
  it('短暂读取故障只重试一次，真正500和写入从不重放', async () => {
    let attempts = 0;
    http.defaults.adapter = async (config) => {
      attempts++;
      if (attempts === 1)
        throw {
          config,
          response: response(config, { code: 'DATA_UNAVAILABLE' }, 503),
        };
      return response(config, { code: 'OK', data: ['recovered'] });
    };
    expect(await http.get('/dining-halls')).toEqual(['recovered']);
    expect(attempts).toBe(2);
    attempts = 0;
    http.defaults.adapter = async (config) => {
      attempts++;
      throw {
        config,
        response: response(config, { code: 'INTERNAL_ERROR' }, 500),
      };
    };
    await expect(http.get('/dining-halls')).rejects.toMatchObject({
      status: 500,
    });
    expect(attempts).toBe(1);
    attempts = 0;
    http.defaults.adapter = async (config) => {
      attempts++;
      throw {
        config,
        response: response(config, { code: 'DATA_UNAVAILABLE' }, 503),
      };
    };
    await expect(http.get('/dining-halls')).rejects.toMatchObject({
      status: 503,
    });
    expect(attempts).toBe(2);
  });
  it('故障编号与构建号可关联，错误不保留敏感请求内容', () => {
    const error = toApiError({
      response: {
        status: 500,
        data: { message: '服务器内部错误', requestId: 'req-123' },
        headers: {},
      },
      config: { data: { password: 'private' } },
    });
    expect(error.message).toContain('req-123');
    expect(error.clientBuild).toBeTruthy();
    expect(error.config).toBeUndefined();
    expect(error.cause).toBeUndefined();
    expect(
      toApiError({
        response: {
          status: 500,
          data: { requestId: 'bad\r\nvalue' },
          headers: {},
        },
      }).requestId,
    ).toBe('');
  });
});
