import { ref } from 'vue';

const CACHE_TTL_MS = 300_000;
const position = ref(null);
const locating = ref(false);
const error = ref('');
const watching = ref(false);
let watchId = null;
let watchSubscribers = 0;

function isFresh(fix) {
  return Boolean(fix && Date.now() - fix.acquiredAt <= CACHE_TTL_MS);
}

function acceptCoords(coords) {
  const { latitude, longitude, accuracy } = coords || {};
  if (![latitude, longitude].every(Number.isFinite)) return false;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
    return false;
  if (Number.isFinite(accuracy) && (accuracy < 0 || accuracy > 1000))
    return false;
  position.value = {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : 25,
    acquiredAt: Date.now(),
  };
  error.value = '';
  return true;
}

function translateGeoError(failure) {
  if (failure?.code === 1) return '定位未授权，可在浏览器权限中重新开启';
  if (failure?.code === 3) return '定位超时，请到开阔处重试';
  return failure?.message || '定位失败，请重试';
}

export function useCampusLocation() {
  async function locateOnce({ force = false } = {}) {
    if (!force && isFresh(position.value)) return position.value;
    if (locating.value) return position.value;
    if (!globalThis.isSecureContext || !navigator?.geolocation) {
      error.value = '当前浏览器无法定位，请使用 HTTPS 页面';
      return null;
    }
    locating.value = true;
    error.value = '';
    try {
      const result = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: force ? 0 : 60000,
        }),
      );
      if (!acceptCoords(result.coords)) {
        error.value = '定位精度不足，请到开阔处重试';
        return null;
      }
      return position.value;
    } catch (failure) {
      error.value = translateGeoError(failure);
      return null;
    } finally {
      locating.value = false;
    }
  }

  function startWatching() {
    if (!globalThis.isSecureContext || !navigator?.geolocation) return false;
    watchSubscribers++;
    if (watchId !== null) return true;
    watching.value = true;
    watchId = navigator.geolocation.watchPosition(
      (result) => {
        acceptCoords(result.coords);
      },
      (failure) => {
        if (failure?.code === 1) {
          error.value = translateGeoError(failure);
          stopWatching(true);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
    return true;
  }

  function stopWatching(force = false) {
    watchSubscribers = force ? 0 : Math.max(0, watchSubscribers - 1);
    if (watchSubscribers === 0 && watchId !== null && navigator?.geolocation) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
      watching.value = false;
    }
  }

  function clearLocation() {
    position.value = null;
    error.value = '';
  }

  return {
    position,
    locating,
    error,
    watching,
    locateOnce,
    startWatching,
    stopWatching,
    clearLocation,
  };
}
