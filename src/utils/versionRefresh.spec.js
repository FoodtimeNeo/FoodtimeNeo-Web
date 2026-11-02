import { describe, expect, it } from 'vitest';
import { isStaleVersion } from './versionRefresh.js';

describe('version refresh', () => {
  it('只有服务端返回了不同构建号时才强制刷新', () => {
    expect(isStaleVersion('abc123', 'def456')).toBe(true);
    expect(isStaleVersion('abc123', 'abc123')).toBe(false);
    expect(isStaleVersion('abc123', '')).toBe(false);
    expect(isStaleVersion('abc123', null)).toBe(false);
    expect(isStaleVersion('abc123', undefined)).toBe(false);
  });
});
