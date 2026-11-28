const DISMISS_KEY = 'foodtime-ios-install-dismissed-at';
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function readUserAgent(nav) {
  return String(nav?.userAgent || '');
}

/**
 * 识别 iPhone / iPad / iPod（兼容 iPadOS 13+ 桌面模式 UA）。
 * @param {Navigator | undefined} nav
 * @returns {boolean}
 */
export function isIosDevice(
  nav = typeof navigator !== 'undefined' ? navigator : undefined,
) {
  if (!nav) return false;
  const ua = readUserAgent(nav);
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  const platform = String(nav.platform || '');
  const touchPoints = Number(nav.maxTouchPoints || 0);
  return (platform === 'MacIntel' || /Macintosh/i.test(ua)) && touchPoints > 1;
}

/**
 * 判断当前是否运行在主屏幕独立 App（PWA standalone）模式。
 * @param {Window | undefined} win
 * @param {Navigator | undefined} nav
 * @returns {boolean}
 */
export function isStandaloneMode(
  win = typeof window !== 'undefined' ? window : undefined,
  nav = typeof navigator !== 'undefined' ? navigator : undefined,
) {
  if (nav?.standalone === true) return true;
  if (win?.matchMedia?.('(display-mode: standalone)').matches) return true;
  return false;
}

/**
 * 判断是否处于微信 / QQ / 微博 / 支付宝等内置浏览器。
 * @param {Navigator | undefined} nav
 * @returns {boolean}
 */
export function isInAppBrowser(
  nav = typeof navigator !== 'undefined' ? navigator : undefined,
) {
  const ua = readUserAgent(nav);
  return /MicroMessenger|QQ\/|Weibo|AlipayClient|DingTalk|FBAN|FBAV/i.test(ua);
}

/**
 * 判断是否为 iOS 原生 Safari 浏览器（可直接点击“分享 → 添加到主屏幕”）。
 * @param {Navigator | undefined} nav
 * @returns {boolean}
 */
export function isIosSafariBrowser(
  nav = typeof navigator !== 'undefined' ? navigator : undefined,
) {
  if (!isIosDevice(nav) || isInAppBrowser(nav)) return false;
  const ua = readUserAgent(nav);
  if (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser|UCBrowser/i.test(ua)) {
    return false;
  }
  return /Safari/i.test(ua);
}

/**
 * 判断是否应展示站内“添加到主屏幕”轻引导条。
 * @param {{ win?: Window, nav?: Navigator, storage?: Storage, now?: number }} [options]
 * @returns {boolean}
 */
export function shouldShowIosInstallBanner({
  win = typeof window !== 'undefined' ? window : undefined,
  nav = typeof navigator !== 'undefined' ? navigator : undefined,
  storage = typeof localStorage !== 'undefined' ? localStorage : undefined,
  now = Date.now(),
} = {}) {
  if (!isIosDevice(nav) || isStandaloneMode(win, nav)) return false;
  try {
    const raw = storage?.getItem(DISMISS_KEY);
    if (raw) {
      const dismissedAt = Number(raw);
      if (Number.isFinite(dismissedAt) && now - dismissedAt < DISMISS_TTL_MS) {
        return false;
      }
    }
  } catch {
    /* Storage can be disabled in private browsing. */
  }
  return true;
}

/**
 * 记录用户关闭站内安装引导条的时间（14 天内不再打扰）。
 * @param {Storage | undefined} storage
 * @param {number} [now]
 */
export function dismissIosInstallBanner(
  storage = typeof localStorage !== 'undefined' ? localStorage : undefined,
  now = Date.now(),
) {
  try {
    storage?.setItem(DISMISS_KEY, String(now));
  } catch {
    /* Ignore storage write failures. */
  }
}

/**
 * 同步主屏幕 PWA 图标未读角标（iOS 16.4+ 主屏幕 Web App 原生支持，无需开发者账号）。
 * @param {number} count
 * @param {Navigator | undefined} nav
 * @returns {Promise<void>}
 */
export async function syncAppBadge(
  count,
  nav = typeof navigator !== 'undefined' ? navigator : undefined,
) {
  if (!nav) return;
  const normalized = Number.isFinite(count)
    ? Math.max(0, Math.floor(count))
    : 0;
  try {
    if (normalized > 0 && typeof nav.setAppBadge === 'function') {
      await nav.setAppBadge(normalized);
    } else if (normalized === 0 && typeof nav.clearAppBadge === 'function') {
      await nav.clearAppBadge();
    }
  } catch {
    /* Badge API may reject outside installed standalone contexts. */
  }
}
