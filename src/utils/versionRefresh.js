import { shallowRef } from 'vue';
import { isPageUpdateSafe, subscribeUpdateSafety } from './updateSafety.js';

const BUILD_ID = import.meta.env.VITE_BUILD_ID || '';
const VALID_ID = /^[a-zA-Z0-9._-]{1,64}$/;
const GUARD = 'foodtime:version-reload';
const POSITION = 'foodtime:version-position';
export const versionUpdateState = shallowRef({ phase: 'idle' });

export function isStaleVersion(localId, remoteId) {
  return (
    typeof remoteId === 'string' &&
    VALID_ID.test(remoteId) &&
    remoteId !== localId
  );
}

function readStorage(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    /* URL guard still prevents loops. */
  }
}

/** Keep media, other apps, cookies and IndexedDB. Do not unregister Service Workers. */
export async function clearObsoleteAppCaches(cacheStorage = window.caches) {
  if (!cacheStorage) return;
  const names = await cacheStorage.keys();
  await Promise.all(
    names
      .filter((name) => /^foodtime-(static|shell)-/.test(name))
      .map((name) => cacheStorage.delete(name)),
  );
}

/** Check HTML/entry consistency, including a partially copied or cached deployment. */
export async function deploymentIsReady(target, fetcher = fetch) {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 8000);
  const request = (url) =>
    fetcher(url, { cache: 'no-store', signal: controller.signal });
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('v', target.id);
    const html = await request(url.href);
    if (!html.ok || !html.headers.get('content-type')?.includes('text/html'))
      return false;
    const page = new DOMParser().parseFromString(
      await html.text(),
      'text/html',
    );
    const src = page
      .querySelector('script[type=module][src]')
      ?.getAttribute('src');
    if (!src || !/^\/assets\/[a-zA-Z0-9._-]+\.js$/.test(src)) return false;
    if (target.entry && target.entry !== src) return false;
    const entry = await request(src);
    if (
      !entry.ok ||
      !/javascript/.test(entry.headers.get('content-type') || '')
    )
      return false;
    const bytes = await entry.arrayBuffer();
    if (target.entrySha256) {
      if (!/^[a-f0-9]{64}$/.test(target.entrySha256)) return false;
      const hash = [
        ...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
      ]
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');
      return hash === target.entrySha256;
    }
    // Legacy metadata only has an id; its actual entry must contain that build id.
    return new TextDecoder().decode(bytes).includes(JSON.stringify(target.id));
  } finally {
    clearTimeout(deadline);
  }
}

export function createVersionUpdater({
  buildId,
  fetcher = fetch,
  storage = sessionStorage,
  location = window.location,
  now = Date.now,
  safe = isPageUpdateSafe,
  available = () => !document.hidden && navigator.onLine !== false,
  ready = deploymentIsReady,
  cleanup = clearObsoleteAppCaches,
  state = (value) => {
    versionUpdateState.value = value;
  },
}) {
  let lastCheck = -Infinity,
    lastForced = -Infinity,
    checking,
    switching;
  let pending = null,
    verifyAfter = 0;
  async function apply() {
    if (!pending || switching || !available() || now() < verifyAfter) return;
    if (!safe()) {
      state({ phase: 'waiting' });
      return;
    }
    const target = pending;
    if (
      readStorage(storage, GUARD) === target.id ||
      new URL(location.href).searchParams.get('v') === target.id
    ) {
      state({ phase: 'delayed' });
      return;
    }
    switching = true;
    try {
      if (!(await ready(target, fetcher))) {
        verifyAfter = now() + 30000;
        state({ phase: 'delayed' });
        return;
      }
      if (pending !== target || !available() || !safe()) {
        state({ phase: 'waiting' });
        return;
      }
      try {
        await cleanup();
      } catch {
        /* Cleanup is optional; never clear user storage. */
      }
      if (pending !== target || !available() || !safe()) {
        state({ phase: 'waiting' });
        return;
      }
      writeStorage(storage, GUARD, target.id);
      writeStorage(
        storage,
        POSITION,
        JSON.stringify({ id: target.id, x: window.scrollX, y: window.scrollY }),
      );
      const url = new URL(location.href);
      url.searchParams.set('v', target.id);
      state({ phase: 'updating' });
      location.replace(url.href);
    } catch {
      verifyAfter = now() + 30000;
      state({ phase: 'delayed' });
    } finally {
      switching = false;
    }
  }
  async function check({ force = false } = {}) {
    if (checking) return checking;
    if (!available() || !buildId) return;
    const time = now();
    if (time - lastCheck < 60000 && (!force || time - lastForced < 30000))
      return apply();
    lastCheck = time;
    if (force) lastForced = time;
    checking = (async () => {
      const controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetcher(`/version.json?t=${time}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (typeof data?.id !== 'string' || !VALID_ID.test(data.id)) return;
        if (!isStaleVersion(buildId, data.id)) {
          pending = null;
          state({ phase: 'idle' });
          return;
        }
        pending = data;
        await apply();
      } catch {
        /* Offline or invalid metadata leaves the active page intact. */
      } finally {
        clearTimeout(deadline);
        checking = null;
      }
    })();
    return checking;
  }
  return { check, apply };
}

let updater;
let lastInteraction = 0;
export function ensureLatestVersion(options) {
  if (!import.meta.env.PROD || !BUILD_ID) return Promise.resolve();
  updater ||= createVersionUpdater({
    buildId: BUILD_ID,
    safe: () => Date.now() - lastInteraction >= 1500 && isPageUpdateSafe(),
  });
  return updater.check(options);
}

export function startVersionUpdates() {
  const interaction = () => {
    lastInteraction = Date.now();
  };
  const check = () => {
    void ensureLatestVersion();
  };
  const preload = () => {
    void ensureLatestVersion({ force: true });
  };
  const events = [
    'pointerdown',
    'keydown',
    'input',
    'wheel',
    'touchmove',
    'scroll',
    'compositionstart',
    'compositionend',
  ];
  for (const name of events)
    document.addEventListener(name, interaction, {
      passive: true,
      capture: true,
    });
  window.addEventListener('pageshow', check);
  document.addEventListener('visibilitychange', check);
  window.addEventListener('online', check);
  window.addEventListener('vite:preloadError', preload);
  const tick = setInterval(check, 5000);
  const stop = subscribeUpdateSafety(check);
  check();
  return () => {
    clearInterval(tick);
    stop();
    for (const name of events)
      document.removeEventListener(name, interaction, true);
    window.removeEventListener('pageshow', check);
    document.removeEventListener('visibilitychange', check);
    window.removeEventListener('online', check);
    window.removeEventListener('vite:preloadError', preload);
  };
}

export function restoreUpdatePosition() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(POSITION));
    if (saved?.id !== BUILD_ID) return;
    sessionStorage.removeItem(POSITION);
    requestAnimationFrame(() => window.scrollTo(saved.x || 0, saved.y || 0));
  } catch {
    /* Storage may be unavailable. */
  }
}
