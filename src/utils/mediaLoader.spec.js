import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  acquireMedia,
  allowMediaSession,
  invalidateMedia,
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

it('并发图片请求合并；每个新展示重新校验私有图片，释放最后引用后撤销URL', async () => {
  const one = acquireMedia(url),
    two = acquireMedia(url);
  await Promise.all([one.promise, two.promise]);
  expect(fetch).toHaveBeenCalledTimes(1);
  one.release();
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  two.release();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:media');
  const next = acquireMedia(url);
  await next.promise;
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
  invalidateMedia();
  resolve(response());
  await expect(request.promise).rejects.toThrow('失效');
  expect(URL.createObjectURL).not.toHaveBeenCalled();
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
