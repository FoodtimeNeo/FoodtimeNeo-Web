import { afterEach, expect, it, vi } from 'vitest';
import { probeMediaWorker, ensureMediaWorkerMigration } from './mediaWorker.js';
class Channel {
  constructor() {
    this.port1 = { onmessage: null, close() {} };
    this.port2 = {
      close() {},
      postMessage: (data) => this.port1.onmessage({ data }),
    };
  }
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('控制器更换后重新确认策略，不能沿用旧控制器的成功结果', async () => {
  vi.stubGlobal('MessageChannel', Channel);
  const workers = {
    controller: {
      postMessage: (_, ports) => ports[0].postMessage({ version: 2 }),
    },
    register: vi.fn().mockRejectedValue(new Error('offline')),
  };
  vi.stubGlobal('navigator', { serviceWorker: workers });
  await ensureMediaWorkerMigration();
  workers.controller = {
    postMessage: (_, ports) => ports[0].postMessage({ version: 1 }),
  };
  await expect(ensureMediaWorkerMigration()).rejects.toThrow('offline');
});
it('通过消息确认新的媒体策略，不能只依赖相同的sw.js地址', async () => {
  vi.stubGlobal('MessageChannel', Channel);
  const worker = {
    postMessage: (message, ports) => {
      expect(message.type).toBe('FOODTIME_MEDIA_POLICY');
      ports[0].postMessage({ version: 2 });
    },
  };
  expect(await probeMediaWorker(worker)).toBe(true);
});
it('没有新策略确认的旧Worker不能放行媒体请求', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('MessageChannel', Channel);
  const pending = probeMediaWorker({ postMessage() {} });
  await vi.advanceTimersByTimeAsync(500);
  expect(await pending).toBe(false);
});
