import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  http,
  invalidateSession,
  setUnauthorizedHandler,
  setForbiddenHandler,
  toApiError,
} from './http.js';
let received;
const originalAdapter = http.defaults.adapter;
function response(config, data, status = 200) {
  return { data, status, headers: {}, config, statusText: 'OK' };
}
beforeEach(() => {
  invalidateSession();
  setUnauthorizedHandler(null);
  setForbiddenHandler(null);
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
});
