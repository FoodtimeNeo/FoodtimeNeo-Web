import { describe, expect, it, vi } from 'vitest';
import { useAsyncData } from './useAsyncData.js';
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
});
