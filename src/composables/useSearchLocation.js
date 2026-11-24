import { ref } from 'vue';
import { fetchSearchCapabilities } from '@/api/search.api.js';

export function useSearchLocation() {
  const position = ref(null);
  const locating = ref(false);
  const error = ref('');
  let generation = 0;
  function clear() {
    generation++;
    position.value = null;
    error.value = '';
    locating.value = false;
  }
  async function locate() {
    if (locating.value) return false;
    const request = ++generation;
    locating.value = true;
    error.value = '';
    try {
      const capabilities = await fetchSearchCapabilities();
      if (request !== generation) return false;
      if (!capabilities.distanceHallIds?.length)
        throw new Error('食堂位置待补充，暂不能按距离排序');
      if (!globalThis.isSecureContext || !navigator.geolocation)
        throw new Error('当前浏览器无法定位，请使用 HTTPS 页面');
      const result = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }),
      );
      if (request !== generation) return false;
      const { latitude, longitude, accuracy } = result.coords;
      if (
        ![latitude, longitude, accuracy].every(Number.isFinite) ||
        accuracy > 1000
      )
        throw new Error('定位精度不足，请到开阔处重试');
      position.value = {
        latitude,
        longitude,
        acquiredAt: Date.now(),
        accuracy,
      };
      return true;
    } catch (failure) {
      if (request === generation)
        error.value =
          failure.code === 1
            ? '定位未授权，可继续搜索或重新授权'
            : failure.message || '定位失败，请重试';
      return false;
    } finally {
      if (request === generation) locating.value = false;
    }
  }
  return { position, locating, error, locate, clear };
}
