import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { webcrypto } from 'node:crypto';
import { Blob as NodeBlob } from 'node:buffer';
import {
  createCatalogReplicaStore,
  CATALOG_CACHE_LIMIT,
} from './catalogReplicaStore.js';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('crypto', webcrypto);
});
afterEach(() => vi.unstubAllGlobals());
const entry = (payload) => ({ kind: 'json', payload, etag: '"one"' });

it('persists visited JSON/images across instances in one combined 100 MB budget', async () => {
  expect(CATALOG_CACHE_LIMIT).toBe(100 * 1024 * 1024);
  const store = createCatalogReplicaStore();
  await store.put('/catalog', entry('[{"name":"食堂"}]'));
  await store.put('/image', {
    kind: 'image',
    payload: new NodeBlob(['pixels']),
    etag: '"image"',
    type: 'image/png',
  });
  const restarted = createCatalogReplicaStore();
  expect((await restarted.get('/catalog')).payload).toContain('食堂');
  expect(await (await restarted.get('/image')).payload.text()).toBe('pixels');
});
it('atomically enforces LRU for concurrent writers and keeps unrelated storage intact', async () => {
  let now = 1;
  const clock = vi.spyOn(Date, 'now').mockImplementation(() => now++);
  try {
    const store = createCatalogReplicaStore(2200);
    localStorage.setItem('draft-remains', 'unchanged');
    await store.put('old', entry('x'.repeat(400)));
    await store.put('recent', entry('y'.repeat(400)));
    await store.get('old');
    await store.put('new', entry('z'.repeat(400)));
    expect(await store.get('recent')).toBeNull();
    expect(await store.get('old')).not.toBeNull();
    await Promise.all(
      ['a', 'b', 'c'].map((key) => store.put(key, entry('x'.repeat(400)))),
    );
    const remaining = await Promise.all(
      ['old', 'new', 'a', 'b', 'c'].map((key) => store.get(key)),
    );
    expect(
      remaining.filter(Boolean).reduce((sum, row) => sum + row.bytes, 0),
    ).toBeLessThanOrEqual(2200);
    expect(localStorage.getItem('draft-remains')).toBe('unchanged');
    localStorage.removeItem('draft-remains');
  } finally {
    clock.mockRestore();
  }
});
it('rejects corrupted bytes and recovers from unavailable storage without throwing', async () => {
  const store = createCatalogReplicaStore();
  await store.put('source', entry('valid'));
  const db = await new Promise((resolve) => {
    const request = indexedDB.open('foodtime-public-catalog-v1');
    request.onsuccess = () => resolve(request.result);
  });
  await new Promise((resolve) => {
    const tx = db.transaction('replicas', 'readwrite');
    const table = tx.objectStore('replicas');
    const request = table.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) cursor.update({ ...cursor.value, payload: 'tampered' });
    };
    tx.oncomplete = resolve;
  });
  db.close();
  expect(await store.get('source')).toBeNull();
  vi.stubGlobal('indexedDB', undefined);
  await expect(store.put('source', entry('new'))).resolves.toBeUndefined();
  expect(await store.get('source')).toBeNull();
});
