/**
 * 部署后强制换新：index.html 指向新的 hash 资源，但长时间打开的页面（或
 * 浏览器/代理缓存）可能仍运行旧包。启动和回到前台时比对 version.json，
 * 不一致就清掉 CacheStorage/Service Worker 并带版本参数整页重载。
 */
const BUILD_ID = import.meta.env.VITE_BUILD_ID || '';
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const RELOAD_GUARD = 'foodtime:version-reload';
let lastCheckedAt = 0;
let checking = false;

export function isStaleVersion(localId, remoteId) {
  return Boolean(remoteId) && remoteId !== localId;
}

export async function ensureLatestVersion({ force = false } = {}) {
  if (!import.meta.env.PROD || !BUILD_ID || checking) return;
  const now = Date.now();
  if (!force && now - lastCheckedAt < CHECK_INTERVAL_MS) return;
  lastCheckedAt = now;
  checking = true;
  try {
    const response = await fetch(`/version.json?t=${now}`, {
      cache: 'no-store',
    });
    if (!response.ok) return;
    const data = await response.json();
    if (!isStaleVersion(BUILD_ID, data?.id)) {
      removeReloadGuard();
      return;
    }
    // 已经为这个版本重载过一次仍然不一致，说明服务端资源未同步，避免死循环。
    if (reloadGuardValue() === data.id) return;
    setReloadGuard(data.id);
    await clearClientCaches();
    const url = new URL(window.location.href);
    url.searchParams.set('v', data.id);
    window.location.replace(url.toString());
  } catch {
    // 离线或接口暂不可用：继续使用当前版本，下次回到前台再试。
  } finally {
    checking = false;
  }
}

function reloadGuardValue() {
  try {
    return sessionStorage.getItem(RELOAD_GUARD);
  } catch {
    return null;
  }
}

function setReloadGuard(id) {
  try {
    sessionStorage.setItem(RELOAD_GUARD, id);
  } catch {
    /* 隐私模式下忽略 */
  }
}

function removeReloadGuard() {
  try {
    sessionStorage.removeItem(RELOAD_GUARD);
  } catch {
    /* 隐私模式下忽略 */
  }
}

async function clearClientCaches() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    /* 清理失败不阻塞重载 */
  }
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister()),
      );
    }
  } catch {
    /* 清理失败不阻塞重载 */
  }
}
