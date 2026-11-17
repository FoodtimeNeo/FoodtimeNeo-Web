import { describe, expect, it } from 'vitest';
import { displayVersion, versionLabel } from './version.js';

describe('release version presentation', () => {
  it('preserves alpha and beta in the public display', () => {
    expect(displayVersion('2.0.0-alpha')).toBe('2.0.0α');
    expect(versionLabel('2.0.0-alpha')).toBe('v2.0.0α 测试版');
    expect(versionLabel('2.0.0-beta')).toBe('v2.0.0β 测试版');
  });
  it('keeps suffix-free versions formal and never strips an unknown stage', () => {
    expect(versionLabel('2.0.0')).toBe('v2.0.0');
    expect(versionLabel('2.0.0-rc.1')).toBe('v2.0.0-rc.1 测试版');
  });
});
