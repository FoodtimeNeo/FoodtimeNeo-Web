import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

it('迁移Worker删除旧媒体缓存并接管客户端，不再注册Cache-First处理', async () => {
  const events = {};
  const self = {
    addEventListener: (name, handler) => {
      events[name] = handler;
    },
    clients: { claim: vi.fn() },
    skipWaiting: vi.fn(),
  };
  const caches = {
    keys: async () => ['foodtime-media-v1', 'other-application'],
    delete: vi.fn(),
  };
  runInNewContext(readFileSync('public/sw.js', 'utf8'), { self, caches });
  events.install();
  let completion;
  events.activate({
    waitUntil: (task) => {
      completion = task;
    },
  });
  await completion;
  expect(caches.delete).toHaveBeenCalledExactlyOnceWith('foodtime-media-v1');
  expect(self.clients.claim).toHaveBeenCalledOnce();
  expect(events.fetch).toBeUndefined();
});
