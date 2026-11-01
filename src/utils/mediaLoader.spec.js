import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  acquireMedia,
  allowMediaSession,
  invalidateMedia,
  setMediaGate,
} from './mediaLoader.js';

const url = '/api/v1/media/00000000-0000-4000-8000-000000000001?size=thumb';
const response = (policy = 'private, no-cache', status = 200) => ({
  ok: status === 200,
  status,
  headers: new Headers({
    'Cache-Control': policy,
    'Content-Type': 'image/png',
  }),
  blob: async () => new Blob(['image']),
});
beforeEach(() => {
  setMediaGate(() => Promise.resolve());
  allowMediaSession();
  invalidateMedia();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()));
  URL.createObjectURL = vi.fn().mockReturnValue('blob:media');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  invalidateMedia();
  vi.unstubAllGlobals();
});

it('并发图片请求合并；再次展示复用已加载图片并在后台重新校验', async () => {
  const one = acquireMedia(url),
    two = acquireMedia(url);
  await Promise.all([one.promise, two.promise]);
  expect(fetch).toHaveBeenCalledTimes(1);
  one.release();
  two.release();
  // 展示缓存持有引用，释放组件不会立即撤销，避免返回页面时白屏。
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();

  const next = acquireMedia(url);
  // 同步即可拿到已缓存的图片
  expect(await next.promise).toBe('blob:media');
  // 后台仍按 no-cache 重新校验权限
  expect(fetch.mock.calls[1][1].cache).toBe('no-cache');
  next.release();
});
it('只对服务端明确允许的不可变公开图片使用HTTP新鲜缓存', async () => {
  fetch.mockResolvedValue(response('public, max-age=31536000, immutable'));
  const first = acquireMedia(url);
  await first.promise;
  first.release();
  const second = acquireMedia(url);
  await second.promise;
  second.release();
  expect(fetch.mock.calls[1][1].cache).toBe('default');
});
it('退出或切号后迟到响应不能创建展示引用', async () => {
  let resolve;
  fetch.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const request = acquireMedia(url);
  await Promise.resolve();
  invalidateMedia();
  resolve(response());
  await expect(request.promise).rejects.toThrow('失效');
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  request.release();
});
it('旧Worker迁移确认前不会向可能被Cache-First拦截的媒体地址发请求', async () => {
  let ready;
  setMediaGate(
    () =>
      new Promise((resolve) => {
        ready = resolve;
      }),
  );
  const request = acquireMedia(url);
  expect(fetch).not.toHaveBeenCalled();
  ready();
  await request.promise;
  expect(fetch).toHaveBeenCalledOnce();
  request.release();
});
it('no-store预览不成为后续展示的可复用条目，失败不回退旧图片', async () => {
  fetch
    .mockResolvedValueOnce(response('no-store'))
    .mockResolvedValueOnce(response('', 404));
  const first = acquireMedia(url);
  await first.promise;
  first.release();
  const second = acquireMedia(url);
  await expect(second.promise).rejects.toThrow();
  second.release();
  expect(fetch.mock.calls[1][1].cache).toBe('no-cache');
});
