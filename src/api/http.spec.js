import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApiError, http, setUnauthorizedHandler, toApiError } from './http.js';
import { clearSession, writeSession } from '@/utils/authSession.js';

describe('toApiError', () => {
  it('识别超时', () => {
    expect(toApiError({ code: 'ECONNABORTED' }).code).toBe('TIMEOUT');
  });

  it('无响应时视为网络错误', () => {
    expect(toApiError(new Error('boom')).code).toBe('NETWORK');
  });

  it('映射鉴权失败并保留服务端消息与业务码', () => {
    const error = toApiError({
      response: {
        status: 401,
        data: { message: '登录已过期', code: 'AUTH_401_001' },
      },
    });
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.bizCode).toBe('AUTH_401_001');
    expect(error.message).toBe('登录已过期');
  });

  it('5xx 归为服务端错误', () => {
    expect(toApiError({ response: { status: 502, data: {} } }).code).toBe(
      'SERVER',
    );
  });
});

describe('http 拦截器', () => {
  let received;

  beforeEach(() => {
    clearSession();
    setUnauthorizedHandler(null);
    // 用自定义 adapter 拦截请求，不发真实网络请求。
    received = null;
    http.defaults.adapter = (config) => {
      received = config;
      return Promise.resolve({
        data: config.__mockData,
        status: config.__mockStatus ?? 200,
        statusText: 'OK',
        headers: {},
        config,
      });
    };
  });

  afterEach(() => {
    delete http.defaults.adapter;
  });

  it('默认 baseURL 指向 /api/v1', () => {
    expect(http.defaults.baseURL).toBe('/api/v1');
  });

  it('成功响应解包 data 字段', async () => {
    const result = await http.get('/canteens', {
      __mockData: { code: 0, message: 'success', data: [{ id: 'c1' }] },
    });
    expect(result).toEqual([{ id: 'c1' }]);
  });

  it('业务错误（code!==0）抛出 ApiError 并带 bizCode', async () => {
    await expect(
      http.get('/dishes/x', {
        __mockData: { code: 'DINING_404_002', message: '菜品不存在' },
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      code: 'BUSINESS',
      bizCode: 'DINING_404_002',
      message: '菜品不存在',
    });
  });

  it('存在会话时自动带上 Authorization 头', async () => {
    writeSession({ token: 'jwt-abc', user: { id: 'u1' } });
    await http.get('/profile', { __mockData: { code: 0, data: {} } });
    expect(received.headers.Authorization).toBe('Bearer jwt-abc');
  });

  it('无会话时不带 Authorization 头', async () => {
    await http.get('/canteens', { __mockData: { code: 0, data: [] } });
    expect(received.headers.Authorization).toBeUndefined();
  });
});
