import { catalogReplicaStore } from './catalogReplicaStore.js';
import { safeMediaUrl } from './mediaUrl.js';

const ID = '[0-9a-f-]{36}';
const RESOURCE = new RegExp(
  `^/(?:dining-halls|dining-halls/${ID}/stalls|stalls/${ID}(?:/dishes)?|dishes/search|dishes/${ID}(?:/images)?)$`,
  'i',
);
const media = new Map();
export function catalogRequestKey(config, uri) {
  if ((config.method || 'get').toLowerCase() !== 'get') return '';
  const url = new URL(uri, window.location.origin);
  if (url.origin !== window.location.origin || url.hash) return '';
  if (!RESOURCE.test(url.pathname.replace(/^\/api\/v1/, ''))) return '';
  url.searchParams.sort();
  return url.origin + url.pathname + url.search;
}
function registerMedia(data) {
  if (typeof data === 'string') {
    const safe = safeMediaUrl(data);
    if (!safe.startsWith('/api/v1/media/')) return;
    const key = safe.split('?')[0];
    media.delete(key);
    media.set(key, true);
    while (media.size > 4096) media.delete(media.keys().next().value);
  } else if (Array.isArray(data)) data.forEach(registerMedia);
  else if (data && typeof data === 'object')
    Object.values(data).forEach(registerMedia);
}
export function isCatalogMedia(source) {
  return media.has(source.split('?')[0]);
}
export function clearCatalogMediaRegistry() {
  media.clear();
}
function marked(headers) {
  return (
    headers['x-foodtime-public-catalog'] === '1' &&
    /^"catalog-v1-[0-9a-f]{64}"$/.test(headers.etag || '') &&
    !/no-store/i.test(headers['cache-control'] || '')
  );
}
export async function prepareCatalogRequest(config, uri) {
  config.catalogKey = catalogRequestKey(config, uri);
  config.catalogReplica = null;
  if (!config.catalogKey) return;
  config.headers.delete('If-None-Match');
  if (!config.catalogUnconditional)
    config.catalogReplica = await catalogReplicaStore.get(config.catalogKey);
  if (config.catalogReplica)
    config.headers.set('If-None-Match', config.catalogReplica.etag);
  config.validateStatus = (status) =>
    (status >= 200 && status < 300) || status === 304;
}
export function restoreCatalogResponse(response) {
  const { catalogReplica } = response.config;
  if (
    !catalogReplica ||
    !marked(response.headers) ||
    response.headers.etag !== catalogReplica.etag
  )
    return null;
  try {
    const data = JSON.parse(catalogReplica.payload);
    registerMedia(data);
    return { code: 'OK', data };
  } catch {
    return null;
  }
}
export async function saveCatalogResponse(response) {
  const key = response.config.catalogKey;
  if (!key) return;
  if (response.status === 304) return;
  if (
    response.status === 200 &&
    response.data?.code === 'OK' &&
    marked(response.headers)
  ) {
    registerMedia(response.data.data);
    await catalogReplicaStore.put(key, {
      kind: 'json',
      payload: JSON.stringify(response.data.data),
      etag: response.headers.etag,
    });
  } else await catalogReplicaStore.remove(key);
}
export async function discardCatalogRequest(config) {
  if (config?.catalogKey) await catalogReplicaStore.remove(config.catalogKey);
}

/** Catalog images revalidate before display. Other media retain their existing cache behavior. */
export async function fetchCatalogImage(
  source,
  { signal, valid = () => true } = {},
) {
  const key = window.location.origin + source;
  const cached = await catalogReplicaStore.get(key);
  if (signal?.aborted || !valid()) throw new Error('图片请求已失效');
  const options = {
    credentials: 'same-origin',
    redirect: 'error',
    cache: 'no-store',
    signal,
    headers: cached ? { 'If-None-Match': cached.etag } : {},
  };
  let response = await fetch(source, options);
  if (signal?.aborted || !valid()) throw new Error('图片请求已失效');
  if (response.status === 304) {
    if (
      cached?.kind === 'image' &&
      cached.etag === response.headers.get('ETag') &&
      /public/i.test(response.headers.get('Cache-Control') || '') &&
      !/no-store/i.test(response.headers.get('Cache-Control') || '')
    )
      return new Response(cached.payload, {
        status: 200,
        headers: {
          'Content-Type': cached.type,
          'Cache-Control': 'private, no-cache',
          ETag: cached.etag,
        },
      });
    response = await fetch(source, { ...options, headers: {} });
  }
  if (signal?.aborted || !valid()) throw new Error('图片请求已失效');
  const policy = response.headers.get('Cache-Control') || '';
  const type = response.headers.get('Content-Type') || '';
  if (
    response.ok &&
    /public/i.test(policy) &&
    !/private|no-store/i.test(policy) &&
    type.startsWith('image/') &&
    response.headers.get('ETag')
  ) {
    const blob = await response.clone().blob();
    if (signal?.aborted || !valid()) throw new Error('图片请求已失效');
    await catalogReplicaStore.put(key, {
      kind: 'image',
      payload: blob,
      type,
      etag: response.headers.get('ETag'),
    });
  } else await catalogReplicaStore.remove(key);
  return response;
}
