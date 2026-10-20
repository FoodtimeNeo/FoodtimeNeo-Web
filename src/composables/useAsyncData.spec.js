import { describe, expect, it, vi } from 'vitest';
import { useAsyncData, clearAsyncDataCache } from './useAsyncData.js';
import { ApiError } from '@/api/http.js';

async function tick() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('useAsyncData', () => {
  it('immediate 时自动加载并填充 data', async () => {
    const { data, loading } = useAsyncData(() => Promise.resolve([1, 2]));
    expect(loading.value).toBe(true);
    await tick();
    expect(loading.value).toBe(false);
    expect(data.value).toEqual([1, 2]);
  });

  it('失败时记录 error 且不自动加载可延后触发', async () => {
    const loader = vi
      .fn()
      .mockRejectedValue(new ApiError('坏了', { status: 500 }));
    const { error, load } = useAsyncData(loader, { immediate: false });
    expect(loader).not.toHaveBeenCalled();
    await load();
    expect(error.value).toBeInstanceOf(ApiError);
    expect(error.value.message).toBe('坏了');
  });

  it('重新 load 时清空上次错误', async () => {
    let ok = false;
    const { data, error, load } = useAsyncData(
      () =>
        ok ? Promise.resolve('好了') : Promise.reject(new ApiError('坏了')),
      { immediate: false },
    );
    await load();
    expect(error.value).not.toBeNull();
    ok = true;
    await load();
    expect(error.value).toBeNull();
    expect(data.value).toBe('好了');
  });

  it('指定 cacheKey 时复用缓存且不重复请求', async () => {
    clearAsyncDataCache();
    const loader = vi.fn().mockResolvedValue(['食堂A', '食堂B']);
    const first = useAsyncData(loader, { cacheKey: 'test_canteen' });
    await tick();
    expect(first.data.value).toEqual(['食堂A', '食堂B']);
    expect(loader).toHaveBeenCalledTimes(1);

    // 第二次调用相同 cacheKey 时，初始值即命中缓存，不再次执行 loader
    const second = useAsyncData(loader, { cacheKey: 'test_canteen' });
    expect(second.data.value).toEqual(['食堂A', '食堂B']);
    expect(second.loading.value).toBe(false);
    expect(loader).toHaveBeenCalledTimes(1);
  });
});
