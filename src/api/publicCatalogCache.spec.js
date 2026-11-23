import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { webcrypto } from 'node:crypto';
import { Blob as NodeBlob } from 'node:buffer';
import { http, invalidateSession } from './http.js';
import { catalogReplicaStore } from '@/utils/catalogReplicaStore.js';
import {
  catalogRequestKey,
  fetchCatalogImage,
  isCatalogMedia,
} from '@/utils/publicCatalogCache.js';

const original = http.defaults.adapter;
const tag = '"catalog-v1-' + 'a'.repeat(64) + '"';
const image = '/api/v1/media/00000000-0000-4000-8000-000000000001?size=thumb';
const headers = {
  etag: tag,
  'x-foodtime-public-catalog': '1',
  'cache-control': 'private, no-cache',
};
const reply = (config, data, status = 200, responseHeaders = headers) => ({
  config,
  status,
  headers: responseHeaders,
  data,
});
beforeEach(() => {
  invalidateSession();
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('crypto', webcrypto);
});
afterEach(() => {
  http.defaults.adapter = original;
  vi.unstubAllGlobals();
});

it('revalidates on every access, restores 304 and replaces changed public data', async () => {
  const conditions = [];
  let changed = false;
  http.defaults.adapter = async (config) => {
    conditions.push(config.headers.get('If-None-Match'));
    return changed
      ? reply(config, { code: 'OK', data: [{ name: 'new' }] }, 200, {
          ...headers,
          etag: '"catalog-v1-' + 'b'.repeat(64) + '"',
        })
      : conditions.length === 1
        ? reply(config, {
            code: 'OK',
            data: [{ name: 'old', imageUrl: image }],
          })
        : reply(config, '', 304);
  };
  expect((await http.get('/dining-halls'))[0].name).toBe('old');
  expect((await http.get('/dining-halls'))[0].name).toBe('old');
  expect(isCatalogMedia(image)).toBe(true);
  expect((await http.get('/dining-halls'))[0].name).toBe('old');
  expect(conditions).toEqual([undefined, tag, tag]);
  changed = true;
  expect((await http.get('/dining-halls'))[0].name).toBe('new');
});
it('does not return stale data on server errors or persist unmarked/private requests', async () => {
  http.defaults.adapter = async (config) =>
    reply(config, { code: 'OK', data: [{ name: 'old' }] });
  await http.get('/dining-halls');
  http.defaults.adapter = async (config) => {
    throw { config, response: reply(config, { message: 'denied' }, 404) };
  };
  await expect(http.get('/dining-halls')).rejects.toMatchObject({
    status: 404,
  });
  const key = window.location.origin + '/api/v1/dining-halls';
  expect(await catalogReplicaStore.get(key)).toBeNull();
  for (const url of [
    '/users/me/profile',
    '/community/posts',
    '/admin/dining-halls',
    '/feedback',
  ]) {
    expect(catalogRequestKey({ method: 'get' }, '/api/v1' + url)).toBe('');
  }
  http.defaults.adapter = async (config) =>
    reply(config, { code: 'OK', data: [] }, 200, {});
  await http.get('/dining-halls');
  expect(await catalogReplicaStore.get(key)).toBeNull();
});
it('recovers once from an unusable 304 without an infinite loop', async () => {
  const adapter = vi.fn(async (config) => reply(config, '', 304));
  http.defaults.adapter = adapter;
  await expect(http.get('/dining-halls')).rejects.toMatchObject({
    code: 'PROTOCOL',
  });
  expect(adapter).toHaveBeenCalledTimes(2);
  expect(adapter.mock.calls[1][0].headers.get('If-None-Match')).toBeUndefined();
});
it('revalidates a persisted catalog image before using bytes and never falls back after denial', async () => {
  const key = window.location.origin + image;
  await catalogReplicaStore.put(key, {
    kind: 'image',
    payload: new NodeBlob(['pixels']),
    type: 'image/png',
    etag: '"image"',
  });
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(null, {
        status: 304,
        headers: {
          ETag: '"image"',
          'Cache-Control': 'public, max-age=31536000',
        },
      }),
    ),
  );
  expect(await (await fetchCatalogImage(image)).text()).toBe('pixels');
  expect(fetch.mock.calls[0][1].headers['If-None-Match']).toBe('"image"');
  fetch.mockResolvedValue(new Response('denied', { status: 403 }));
  expect((await fetchCatalogImage(image)).status).toBe(403);
  expect(await catalogReplicaStore.get(key)).toBeNull();
});
