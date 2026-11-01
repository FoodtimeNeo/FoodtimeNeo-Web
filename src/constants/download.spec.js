import { describe, expect, it } from 'vitest';
import {
  APK_DOWNLOAD_URL,
  APK_FILE_NAME,
  APK_SIZE,
  APK_VERSION,
} from './download.js';

describe('download constants', () => {
  it('正确导出安装包下载地址与元数据', () => {
    expect(APK_DOWNLOAD_URL).toMatch(
      /^\/downloads\/FoodtimeNeo-Android\.apk\?v=\d+\.\d+\.\d+-\d+$/,
    );
    expect(
      APK_DOWNLOAD_URL.startsWith(
        `/downloads/FoodtimeNeo-Android.apk?v=${APK_VERSION.slice(1)}-`,
      ),
    ).toBe(true);
    expect(APK_FILE_NAME).toBe('FoodtimeNeo-Android.apk');
    expect(APK_VERSION).toMatch(/^v\d+\.\d+\.\d+/);
    expect(APK_SIZE).toContain('MB');
  });
});
