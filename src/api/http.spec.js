import { describe, expect, it } from 'vitest';
import { ApiError, toApiError } from './http.js';

describe('toApiError', () => {
  it('识别超时', () => {
    expect(toApiError({ code: 'ECONNABORTED' }).code).toBe('TIMEOUT');
  });

  it('无响应时视为网络错误', () => {
    expect(toApiError(new Error('boom')).code).toBe('NETWORK');
  });

  it('映射鉴权失败并保留服务端消息', () => {
    const error = toApiError({
      response: { status: 401, data: { message: '登录已过期' } },
    });
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.message).toBe('登录已过期');
  });

  it('5xx 归为服务端错误', () => {
    expect(toApiError({ response: { status: 502, data: {} } }).code).toBe(
      'SERVER',
    );
  });
});
