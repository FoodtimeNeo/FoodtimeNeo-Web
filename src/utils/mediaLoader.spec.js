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
  // 浏览器遵循响应的 no-cache 策略，在后台校验权限。
  expect(fetch.mock.calls[1][1].cache).toBe('default');
  next.release();
});
it('不可变目录图命中展示缓存时不再访问网络', async () => {
  fetch.mockResolvedValue(response('public, max-age=31536000, immutable'));
  const first = acquireMedia(url);
  await first.promise;
  first.release();
  const second = acquireMedia(url);
  await second.promise;
  second.release();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][1].cache).toBe('default');
});
it('公开食记的同会话缩略图与已请求原图各自复用，过期才发起校验', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000);
  const original = url.replace('thumb', 'full');
  fetch.mockResolvedValue(response('private, max-age=300, must-revalidate'));
  try {
    for (const target of [url, url, original, url, original]) {
      const request = acquireMedia(target);
      await request.promise;
      request.release();
    }
    expect(fetch.mock.calls.map(([target]) => target)).toEqual([url, original]);
    clock.mockReturnValue(301_000);
    fetch.mockResolvedValue(response('', 404));
    const expired = acquireMedia(url);
    await expect(expired.promise).rejects.toThrow('暂不可用');
    expired.release();
    expect(fetch).toHaveBeenCalledTimes(3);
  } finally {
    clock.mockRestore();
  }
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
it('单张超过 8MB 的原图不进入展示缓存', async () => {
  const huge = {
    ok: true,
    status: 200,
    headers: new Headers({
      'Cache-Control': 'private, no-cache',
      'Content-Type': 'image/png',
    }),
    blob: async () => ({ size: 9 * 1024 * 1024 }),
  };
  fetch.mockResolvedValue(huge);
  const first = acquireMedia(url);
  await first.promise;
  first.release();
  const second = acquireMedia(url);
  await second.promise;
  second.release();
  // 未命中缓存，重新请求
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('总字节超过预算时淘汰最早加载的图片', async () => {
  const urls = Array.from(
    { length: 5 },
    (_, i) =>
      `/api/v1/media/00000000-0000-4000-8000-00000000000${i + 1}?size=full`,
  );
  fetch.mockImplementation(async () => ({
    ok: true,
    status: 200,
    headers: new Headers({
      'Cache-Control': 'private, no-cache',
      'Content-Type': 'image/png',
    }),
    blob: async () => ({ size: 8 * 1024 * 1024 }),
  }));
  for (const target of urls) {
    const request = acquireMedia(target);
    await request.promise;
    request.release();
  }
  // 5 × 8MB = 40MB，超过 32MB 预算，最早的一张应已被淘汰
  const first = acquireMedia(urls[0]);
  await first.promise;
  first.release();
  expect(fetch).toHaveBeenCalledTimes(6);
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
  expect(fetch.mock.calls[1][1].cache).toBe('default');
});
