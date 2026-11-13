import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./http.js', () => ({
  ApiError: class ApiError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.code = options.code;
    }
  },
  http: api,
}));
import { fetchCapabilities } from './capabilities.api.js';

beforeEach(() => api.get.mockReset());

describe('有效能力接口', () => {
  it('读取并保留字符串能力与版本', async () => {
    api.get.mockResolvedValue({
      capabilities: ['catalog.edit', 'report.reply', 42],
      revision: 'policy-v2',
    });
    await expect(fetchCapabilities()).resolves.toEqual({
      capabilities: ['catalog.edit', 'report.reply'],
      revision: 'policy-v2',
    });
    expect(api.get).toHaveBeenCalledWith('/users/me/capabilities');
  });

  it('缺少能力数组或版本时按协议错误处理', async () => {
    api.get.mockResolvedValue({ capabilities: [] });
    await expect(fetchCapabilities()).rejects.toMatchObject({
      code: 'PROTOCOL',
    });
  });
});
