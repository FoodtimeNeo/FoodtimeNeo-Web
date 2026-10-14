import { describe, expect, it } from 'vitest';
import { localProxyTarget } from './proxy-target.js';

describe('开发代理目标', () => {
  it('支持默认后端及独立隔离联调端口', () => {
    expect(localProxyTarget()).toBe('http://127.0.0.1:8080');
    expect(localProxyTarget('http://127.0.0.1:18080/')).toBe(
      'http://127.0.0.1:18080',
    );
    expect(localProxyTarget('https://[::1]:8080')).toBe('https://[::1]:8080');
  });
  it.each([
    'https://example.com',
    'http://localhost.evil.test',
    'http://user:pass@localhost:8080',
    'http://localhost:8080/api',
    'http://localhost:8080/?token=secret',
    'javascript:alert(1)',
  ])('拒绝外站或带凭据目标 %s', (value) => {
    expect(() => localProxyTarget(value)).toThrow();
  });
});
