import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useSearchLocation } from './useSearchLocation.js';
import { fetchSearchCapabilities } from '@/api/search.api.js';
vi.mock('@/api/search.api.js', () => ({ fetchSearchCapabilities: vi.fn() }));
beforeEach(() => {
  fetchSearchCapabilities.mockResolvedValue({ distanceHallIds: ['hall'] });
  vi.stubGlobal('isSecureContext', true);
});
afterEach(() => vi.unstubAllGlobals());
it('食堂尚无坐标时不触发定位授权', async () => {
  fetchSearchCapabilities.mockResolvedValue({ distanceHallIds: [] });
  const state = useSearchLocation();
  expect(await state.locate()).toBe(false);
  expect(state.error.value).toContain('位置待补充');
});
it('拒绝授权后可继续使用普通搜索，定位状态不会卡住', async () => {
  vi.stubGlobal('navigator', {
    geolocation: { getCurrentPosition: (_ok, fail) => fail({ code: 1 }) },
  });
  const state = useSearchLocation();
  expect(await state.locate()).toBe(false);
  expect(state.position.value).toBeNull();
  expect(state.locating.value).toBe(false);
  expect(state.error.value).toContain('未授权');
});
it('仅使用当次位置并在清理后丢弃晚到结果', async () => {
  let callback;
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: (ok) => {
        callback = ok;
      },
    },
  });
  const state = useSearchLocation();
  const result = state.locate();
  await Promise.resolve();
  state.clear();
  callback({ coords: { latitude: 39.95, longitude: 116.34, accuracy: 12 } });
  expect(await result).toBe(false);
  expect(state.position.value).toBeNull();
});
it('精度不足不执行距离排序', async () => {
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: (ok) =>
        ok({ coords: { latitude: 39, longitude: 116, accuracy: 5000 } }),
    },
  });
  const state = useSearchLocation();
  expect(await state.locate()).toBe(false);
  expect(state.error.value).toContain('精度不足');
});
