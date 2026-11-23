import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  isStaleVersion,
  createVersionUpdater,
  clearObsoleteAppCaches,
  deploymentIsReady,
} from './versionRefresh.js';

describe('version refresh', () => {
  it('只有服务端返回了不同构建号时才强制刷新', () => {
    expect(isStaleVersion('abc123', 'def456')).toBe(true);
    expect(isStaleVersion('abc123', 'abc123')).toBe(false);
    expect(isStaleVersion('abc123', '')).toBe(false);
    expect(isStaleVersion('abc123', null)).toBe(false);
    expect(isStaleVersion('abc123', undefined)).toBe(false);
  });
});

let clock, safe, online, fetcher, ready, cleanup, location, state, updater;
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  clock = 100000;
  safe = true;
  online = true;
  fetcher = vi.fn(async () => ({
    ok: true,
    json: async () => ({ id: 'new-build' }),
  }));
  ready = vi.fn(async () => true);
  cleanup = vi.fn();
  state = vi.fn();
  location = {
    href: 'https://example.test/community?tab=mine#comments',
    replace: vi.fn(),
  };
  updater = createVersionUpdater({
    buildId: 'old-build',
    fetcher,
    ready,
    cleanup,
    location,
    now: () => clock,
    safe: () => safe,
    available: () => online,
    state,
  });
});

describe('automatic version transition', () => {
  it('aborts a stalled metadata request and permits a later retry', async () => {
    vi.useFakeTimers();
    try {
      fetcher.mockImplementationOnce(
        (_url, options) =>
          new Promise((_resolve, reject) =>
            options.signal.addEventListener('abort', () =>
              reject(new Error('timeout')),
            ),
          ),
      );
      const pending = updater.check();
      await vi.advanceTimersByTimeAsync(8000);
      await pending;
      expect(location.replace).not.toHaveBeenCalled();
      clock += 60000;
      await updater.check();
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
  it('waits for editing/upload completion, preserving route and user storage', async () => {
    localStorage.setItem('preferences', 'keep');
    sessionStorage.setItem('draft-key', 'keep');
    safe = false;
    await updater.check();
    expect(location.replace).not.toHaveBeenCalled();
    expect(ready).not.toHaveBeenCalled();
    expect(state).toHaveBeenLastCalledWith({ phase: 'waiting' });
    safe = true;
    await updater.apply();
    expect(location.replace).toHaveBeenCalledWith(
      'https://example.test/community?tab=mine&v=new-build#comments',
    );
    expect(localStorage.getItem('preferences')).toBe('keep');
    expect(sessionStorage.getItem('draft-key')).toBe('keep');
    await updater.apply();
    expect(location.replace).toHaveBeenCalledOnce();
  });
  it('rechecks safety after waiting for target resources', async () => {
    ready.mockImplementation(async () => {
      safe = false;
      return true;
    });
    await updater.check();
    expect(location.replace).not.toHaveBeenCalled();
    expect(cleanup).not.toHaveBeenCalled();
  });
  it('rechecks safety after asynchronous cache cleanup', async () => {
    cleanup.mockImplementation(async () => {
      safe = false;
    });
    await updater.check();
    expect(location.replace).not.toHaveBeenCalled();
  });
  it('does not reload for current/invalid metadata or while offline', async () => {
    for (const id of ['old-build', '<html>', null]) {
      clock += 60000;
      fetcher.mockResolvedValueOnce({ ok: true, json: async () => ({ id }) });
      await updater.check();
    }
    online = false;
    clock += 60000;
    await updater.check();
    expect(location.replace).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('backs off partial deployments and reloads when resources become consistent', async () => {
    ready.mockResolvedValueOnce(false);
    await updater.check();
    expect(location.replace).not.toHaveBeenCalled();
    await updater.apply();
    expect(ready).toHaveBeenCalledOnce();
    clock += 30000;
    await updater.apply();
    expect(location.replace).toHaveBeenCalledOnce();
  });
  it('coalesces version checks and bounds forced error checks', async () => {
    safe = false;
    await Promise.all([updater.check(), updater.check()]);
    expect(fetcher).toHaveBeenCalledOnce();
    await updater.check({ force: true });
    await updater.check({ force: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('avoids loops even when storage is unavailable, and cache cleanup failure is nonfatal', async () => {
    const storage = {
      getItem: () => {
        throw new Error('unavailable');
      },
      setItem: () => {
        throw new Error('unavailable');
      },
    };
    location.href = 'https://example.test/login?v=new-build';
    const guarded = createVersionUpdater({
      buildId: 'old-build',
      fetcher,
      ready,
      location,
      storage,
      available: () => true,
    });
    await guarded.check();
    expect(location.replace).not.toHaveBeenCalled();
    cleanup.mockRejectedValueOnce(new Error('cache failure'));
    await updater.check();
    expect(location.replace).not.toHaveBeenCalled();
    location.href = 'https://example.test/login';
    clock += 60000;
    await updater.check();
    expect(location.replace).toHaveBeenCalledOnce();
  });
  it('clears only obsolete app-shell caches', async () => {
    const caches = {
      keys: async () => [
        'foodtime-static-v1',
        'foodtime-shell-v0',
        'foodtime-media-v2',
        'other-app',
      ],
      delete: vi.fn(),
    };
    await clearObsoleteAppCaches(caches);
    expect(caches.delete.mock.calls.map(([name]) => name)).toEqual([
      'foodtime-static-v1',
      'foodtime-shell-v0',
    ]);
  });
});

describe('target deployment verification', () => {
  it('rejects mixed HTML and metadata, missing chunks and SPA fallback HTML', async () => {
    const html = () =>
      new Response(
        '<script type="module" src="/assets/index-new12345.js"></script>',
        { headers: { 'content-type': 'text/html' } },
      );
    expect(
      await deploymentIsReady(
        { id: 'new-build', entry: '/assets/index-other.js' },
        vi.fn(async () => html()),
      ),
    ).toBe(false);
    for (const response of [
      new Response('missing', { status: 404 }),
      new Response('<html>', { headers: { 'content-type': 'text/html' } }),
    ]) {
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(html())
        .mockResolvedValueOnce(response);
      expect(await deploymentIsReady({ id: 'new-build' }, fetcher)).toBe(false);
    }
  });
  it('validates entry bytes against metadata and supports legacy build ids', async () => {
    const html = () =>
      new Response(
        '<script type="module" src="/assets/index-new12345.js"></script>',
        { headers: { 'content-type': 'text/html' } },
      );
    const code = 'const build="new-build";';
    const sha = [
      ...new Uint8Array(
        await webcrypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(code),
        ),
      ),
    ]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('');
    vi.stubGlobal('crypto', webcrypto);
    try {
      for (const [target, expected] of [
        [{ id: 'new-build', entrySha256: sha }, true],
        [{ id: 'new-build', entrySha256: '0'.repeat(64) }, false],
        [{ id: 'new-build' }, true],
      ]) {
        const fetcher = vi
          .fn()
          .mockResolvedValueOnce(html())
          .mockResolvedValueOnce(
            new Response(code, {
              headers: { 'content-type': 'text/javascript' },
            }),
          );
        expect(await deploymentIsReady(target, fetcher)).toBe(expected);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
