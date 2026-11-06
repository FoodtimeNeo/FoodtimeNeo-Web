import { beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useAsyncData, clearAsyncDataCache } from './useAsyncData.js';
import { ApiError } from '@/api/http.js';

async function tick() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
beforeEach(() => clearAsyncDataCache());

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

  it('后台刷新保留成功内容，首次加载和刷新分别提供状态', async () => {
    let complete;
    const loader = vi
      .fn()
      .mockResolvedValueOnce(['原内容'])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          }),
      );
    const state = useAsyncData(loader);
    expect(state.initialLoading.value).toBe(true);
    await tick();
    const pending = state.load();
    expect(state.loading.value).toBe(true);
    expect(state.initialLoading.value).toBe(false);
    expect(state.data.value).toEqual(['原内容']);
    complete(['新内容']);
    await pending;
    expect(state.data.value).toEqual(['新内容']);
  });

  it('网络失败保留内容，权限或资源失效则撤下旧内容', async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce(['可见内容'])
      .mockRejectedValueOnce(new ApiError('断网', { status: 0 }))
      .mockRejectedValueOnce(new ApiError('已下架', { status: 404 }));
    const state = useAsyncData(loader, { initial: [] });
    await tick();
    await state.load();
    expect(state.data.value).toEqual(['可见内容']);
    await state.load();
    expect(state.data.value).toEqual([]);
    expect(state.hasLoaded.value).toBe(false);
  });

  it('身份变化清理缓存后，迟到请求不能重新写回旧账号数据', async () => {
    let complete;
    const loader = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            complete = resolve;
          }),
      )
      .mockResolvedValueOnce(['新身份']);
    const old = useAsyncData(loader, { cacheKey: 'private' });
    clearAsyncDataCache();
    complete(['旧身份']);
    await tick();
    expect(old.data.value).toBeNull();
    const next = useAsyncData(loader, { cacheKey: 'private' });
    await tick();
    expect(next.data.value).toEqual(['新身份']);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('页面离开会取消读取，迟到结果不能更新已离开的页面', async () => {
    let complete, signal;
    const scope = effectScope();
    const state = scope.run(() =>
      useAsyncData((options) => {
        signal = options.signal;
        return new Promise((resolve) => {
          complete = resolve;
        });
      }),
    );
    scope.stop();
    expect(signal.aborted).toBe(true);
    complete('迟到结果');
    await tick();
    expect(state.data.value).toBeNull();
  });

  it('缓存身份失效后，旧请求失败也不能覆盖当前页面状态', async () => {
    let fail;
    const state = useAsyncData(
      () =>
        new Promise((resolve, reject) => {
          fail = reject;
        }),
    );
    clearAsyncDataCache();
    fail(new ApiError('旧身份请求失败', { status: 403 }));
    await tick();
    expect(state.error.value).toBeNull();
    expect(state.loading.value).toBe(false);
  });
});
