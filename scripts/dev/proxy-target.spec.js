import { describe, expect, it } from 'vitest';
import { developmentProxyTarget } from './proxy-target.js';

describe('开发代理目标', () => {
  it('支持默认后端及独立隔离联调端口', () => {
    expect(developmentProxyTarget()).toBe('http://127.0.0.1:8080');
    expect(developmentProxyTarget('http://127.0.0.1:18080/')).toBe(
      'http://127.0.0.1:18080',
    );
    expect(developmentProxyTarget('https://[::1]:8080')).toBe(
      'https://[::1]:8080',
    );
  });
  it('支持指定服务器的默认端口', () => {
    expect(developmentProxyTarget('http://154.9.252.201/')).toBe(
      'http://154.9.252.201',
    );
    expect(developmentProxyTarget('https://154.9.252.201')).toBe(
      'https://154.9.252.201',
    );
    expect(developmentProxyTarget('https://kfcvivo50.ddns.net/')).toBe(
      'https://kfcvivo50.ddns.net',
    );
  });
  it.each([
    'https://example.com',
    'http://localhost.evil.test',
    'http://user:pass@localhost:8080',
    'http://localhost:8080/api',
    'http://localhost:8080/?token=secret',
    'javascript:alert(1)',
    'http://154.9.252.201.evil.test',
    'http://154.9.252.201:8080',
    'http://user:pass@154.9.252.201',
    'http://154.9.252.201/api',
  ])('拒绝外站或带凭据目标 %s', (value) => {
    expect(() => developmentProxyTarget(value)).toThrow();
  });
});
