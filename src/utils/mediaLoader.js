import { ref } from 'vue';
import { safeMediaUrl } from './mediaUrl.js';

// Only live display references are retained here; persistent bytes belong to HTTP caching.
export const mediaRevision = ref(0);
const pending = new Map();
// 浏览器负责磁盘缓存，内存中的地址只在同一会话内复用。
const displayCache = new Map();
const DISPLAY_TTL = 5 * 60 * 1000;
// 条数 + 字节双重上限：缩略图很小，但灯箱/画廊的 full 图最大 10MB。
const DISPLAY_MAX = 64;
const DISPLAY_MAX_BYTES = 32 * 1024 * 1024;
const DISPLAY_SINGLE_MAX = 8 * 1024 * 1024;
let displayBytes = 0;
let revalidating = new Set();
let unauthorized = () => {};
let blocked = false;
let gate = () => Promise.resolve();
export function setMediaGate(ready) {
  gate = ready;
}
export function allowMediaSession() {
  blocked = false;
}
export function setMediaUnauthorizedHandler(handler) {
  unauthorized = handler;
}
export function invalidateMedia() {
  const obsolete = [...pending.values()];
  pending.clear();
  for (const task of obsolete) {
    task.controller.abort();
    if (task.url) URL.revokeObjectURL(task.url);
  }
  for (const entry of displayCache.values()) URL.revokeObjectURL(entry.url);
  displayCache.clear();
  displayBytes = 0;
  revalidating = new Set();
  mediaRevision.value += 1;
}

function remember(source, url, bytes, headers) {
  // 单张过大的原图不进入展示缓存，避免一次加载占满预算。
  if (bytes > DISPLAY_SINGLE_MAX) return;
  const existing = displayCache.get(source);
  if (existing) {
    displayBytes -= existing.bytes;
    displayCache.delete(source);
    // 旧地址可能仍被当前页面使用，延迟回收，避免图片瞬间消失。
    if (existing.url !== url)
      setTimeout(() => URL.revokeObjectURL(existing.url), 30000);
  }
  const now = Date.now();
  const policy = headers.get('Cache-Control') || '';
  const maxAge = /(?:^|[,\s])max-age=(\d+)/i.exec(policy);
  const ageHeader = Number(headers.get('Age')) || 0;
  const date = Date.parse(headers.get('Date') || '');
  const age = Math.max(
    0,
    ageHeader * 1000,
    Number.isFinite(date) ? now - date : 0,
  );
  const freshUntil =
    maxAge && !/no-cache/i.test(policy)
      ? now + Number(maxAge[1]) * 1000 - age
      : null;
  displayCache.set(source, { url, storedAt: now, freshUntil, bytes });
  displayBytes += bytes;
  while (displayCache.size > DISPLAY_MAX || displayBytes > DISPLAY_MAX_BYTES) {
    const [oldest, entry] = displayCache.entries().next().value;
    displayCache.delete(oldest);
    displayBytes -= entry.bytes;
    setTimeout(() => URL.revokeObjectURL(entry.url), 30000);
  }
}

/** 同步读取仍可展示的图片，让组件挂载时直接有内容，不再先白屏。 */
export function peekMedia(value) {
  const source = safeMediaUrl(value);
  if (!source || !source.startsWith('/api/v1/media/') || blocked) return '';
  const entry = displayCache.get(source);
  if (!entry) return '';
  if (Date.now() >= (entry.freshUntil ?? entry.storedAt + DISPLAY_TTL)) {
    displayCache.delete(source);
    displayBytes -= entry.bytes;
    setTimeout(() => URL.revokeObjectURL(entry.url), 30000);
    return '';
  }
  return entry.url;
}
function revalidate(source) {
  if (revalidating.has(source) || blocked) return;
  revalidating.add(source);
  const generation = mediaRevision.value;
  fetch(source, {
    credentials: 'same-origin',
    redirect: 'error',
    cache: 'default',
  })
    .then(async (response) => {
      if (generation !== mediaRevision.value) return;
      if (response.status === 401) {
        blocked = true;
        invalidateMedia();
        unauthorized();
        return;
      }
      if (
        !response.ok ||
        !response.headers.get('Content-Type')?.startsWith('image/') ||
        /no-store/i.test(response.headers.get('Cache-Control') || '')
      ) {
        const entry = displayCache.get(source);
        if (entry) {
          displayCache.delete(source);
          displayBytes -= entry.bytes;
          setTimeout(() => URL.revokeObjectURL(entry.url), 30000);
        }
        return;
      }
      const blob = await response.blob();
      if (generation !== mediaRevision.value) return;
      remember(source, URL.createObjectURL(blob), blob.size, response.headers);
    })
    .catch(() => {
      /* 后台校验失败时保留已展示的内容，等下次真正加载时再处理 */
    })
    .finally(() => revalidating.delete(source));
}

export function acquireMedia(value) {
  const source = safeMediaUrl(value);
  if (blocked)
    return { promise: Promise.reject(new Error('会话已失效')), release() {} };
  if (!source)
    return { promise: Promise.reject(new Error('图片地址无效')), release() {} };
  if (!source.startsWith('/api/v1/media/'))
    return { promise: Promise.resolve(source), release() {} };
  const cached = peekMedia(source);
  if (cached) {
    if (displayCache.get(source).freshUntil === null) revalidate(source);
    return { promise: Promise.resolve(cached), release() {} };
  }
  let task = pending.get(source);
  if (!task) {
    const generation = mediaRevision.value;
    task = {
      controller: new AbortController(),
      count: 0,
      url: null,
      settled: false,
    };
    pending.set(source, task);
    task.promise = (async () => {
      try {
        await gate();
        if (
          generation !== mediaRevision.value ||
          task.controller.signal.aborted
        )
          throw new Error('图片请求已失效');
        const response = await fetch(source, {
          credentials: 'same-origin',
          redirect: 'error',
          cache: 'default',
          signal: task.controller.signal,
        });
        if (
          generation !== mediaRevision.value ||
          task.controller.signal.aborted
        )
          throw new Error('图片请求已失效');
        if (response.status === 401) {
          blocked = true;
          invalidateMedia();
          unauthorized();
        }
        if (
          !response.ok ||
          !response.headers.get('Content-Type')?.startsWith('image/')
        )
          throw new Error('图片暂不可用');
        const policy = response.headers.get('Cache-Control') || '';
        const blob = await response.blob();
        if (
          generation !== mediaRevision.value ||
          task.controller.signal.aborted ||
          !task.count
        )
          throw new Error('图片请求已失效');
        task.url = URL.createObjectURL(blob);
        // no-store 预览（待审/暂存）不能被后续展示复用。
        if (!/no-store/i.test(policy))
          remember(source, task.url, blob.size, response.headers);
        return task.url;
      } finally {
        task.settled = true;
        // A completed display is never reused by a later display without revalidation.
        if (pending.get(source) === task) pending.delete(source);
      }
    })();
  }
  task.count += 1;
  let released = false;
  return {
    promise: task.promise,
    release() {
      if (released) return;
      released = true;
      if (--task.count === 0) {
        task.controller.abort();
        if (pending.get(source) === task) pending.delete(source);
      }
    },
  };
}
