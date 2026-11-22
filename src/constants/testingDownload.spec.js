import { describe, expect, it } from 'vitest';
import { isNewerTestingApk } from './testingDownload.js';

describe('testing APK upgrade availability', () => {
  it('offers only a prerelease with a higher Android version code', () => {
    const stable = { versionCode: 25 };
    expect(
      isNewerTestingApk({ versionCode: 26, prerelease: true }, stable),
    ).toBe(true);
    for (const versionCode of [24, 25, '26', undefined]) {
      expect(isNewerTestingApk({ versionCode, prerelease: true }, stable)).toBe(
        false,
      );
    }
    expect(
      isNewerTestingApk({ versionCode: 26, prerelease: false }, stable),
    ).toBe(false);
  });
});
