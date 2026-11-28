import { describe, expect, it, vi } from 'vitest';
import {
  dismissIosInstallBanner,
  isInAppBrowser,
  isIosDevice,
  isIosSafariBrowser,
  isStandaloneMode,
  shouldShowIosInstallBanner,
  syncAppBadge,
} from './iosPwa.js';

const IPHONE_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
const IPHONE_WECHAT_UA = `${IPHONE_SAFARI_UA} MicroMessenger/8.0.50`;
const IPHONE_CHROME_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
  };
}

describe('iosPwa utilities', () => {
  it('准确识别 iPhone、桌面模式 iPad 与非 iOS 设备', () => {
    expect(isIosDevice({ userAgent: IPHONE_SAFARI_UA })).toBe(true);
    expect(
      isIosDevice({
        userAgent: IPAD_DESKTOP_UA,
        platform: 'MacIntel',
        maxTouchPoints: 5,
      }),
    ).toBe(true);
    expect(
      isIosDevice({
        userAgent: IPAD_DESKTOP_UA,
        platform: 'MacIntel',
        maxTouchPoints: 0,
      }),
    ).toBe(false);
    expect(isIosDevice({ userAgent: ANDROID_CHROME_UA })).toBe(false);
  });

  it('区分 iOS Safari、微信内置浏览器与其他第三方浏览器', () => {
    expect(isIosSafariBrowser({ userAgent: IPHONE_SAFARI_UA })).toBe(true);
    expect(isInAppBrowser({ userAgent: IPHONE_WECHAT_UA })).toBe(true);
    expect(isIosSafariBrowser({ userAgent: IPHONE_WECHAT_UA })).toBe(false);
    expect(isIosSafariBrowser({ userAgent: IPHONE_CHROME_UA })).toBe(false);
    expect(isIosSafariBrowser({ userAgent: ANDROID_CHROME_UA })).toBe(false);
  });

  it('兼容 navigator.standalone 与 display-mode: standalone 检测', () => {
    expect(isStandaloneMode({}, { standalone: true })).toBe(true);
    expect(
      isStandaloneMode(
        { matchMedia: () => ({ matches: true }) },
        { standalone: false },
      ),
    ).toBe(true);
    expect(
      isStandaloneMode(
        { matchMedia: () => ({ matches: false }) },
        { standalone: false },
      ),
    ).toBe(false);
  });

  it('安装引导条仅在非独立模式的 iOS 浏览器展示，并遵循 14 天冷却', () => {
    const storage = createMemoryStorage();
    const win = { matchMedia: () => ({ matches: false }) };
    const nav = { userAgent: IPHONE_SAFARI_UA, standalone: false };
    const now = 1_700_000_000_000;

    expect(shouldShowIosInstallBanner({ win, nav, storage, now })).toBe(true);
    expect(
      shouldShowIosInstallBanner({
        win,
        nav: { ...nav, standalone: true },
        storage,
        now,
      }),
    ).toBe(false);
    expect(
      shouldShowIosInstallBanner({
        win,
        nav: { userAgent: ANDROID_CHROME_UA },
        storage,
        now,
      }),
    ).toBe(false);

    dismissIosInstallBanner(storage, now);
    expect(
      shouldShowIosInstallBanner({ win, nav, storage, now: now + 1000 }),
    ).toBe(false);
    expect(
      shouldShowIosInstallBanner({
        win,
        nav,
        storage,
        now: now + 15 * 24 * 60 * 60 * 1000,
      }),
    ).toBe(true);
  });

  it('安全同步桌面图标角标并在 API 不存在或抛错时静默降级', async () => {
    const setAppBadge = vi.fn().mockResolvedValue(undefined);
    const clearAppBadge = vi.fn().mockResolvedValue(undefined);
    const nav = { setAppBadge, clearAppBadge };

    await syncAppBadge(5, nav);
    expect(setAppBadge).toHaveBeenCalledWith(5);

    await syncAppBadge(0, nav);
    expect(clearAppBadge).toHaveBeenCalledTimes(1);

    await expect(
      syncAppBadge(3, {
        setAppBadge: vi.fn().mockRejectedValue(new Error('not allowed')),
      }),
    ).resolves.toBeUndefined();
    await expect(syncAppBadge(3, {})).resolves.toBeUndefined();
  });
});
