import { ref } from 'vue';
import { safeMediaUrl } from './mediaUrl.js';

// Only live display references are retained here; persistent bytes belong to HTTP caching.
export const mediaRevision = ref(0);
const pending = new Map();
const publicResources = new Set();
// 已解码过的图片在本次会话内直接复用，避免切换页面时出现白屏重载；
// 后台仍会按 no-cache 重新校验权限，校验失败即移除。
const displayCache = new Map();
const DISPLAY_TTL = 5 * 60 * 1000;
const DISPLAY_MAX = 64;
let revalidating = new Set();
let unauthorized = () => {};
let blocked = false;
let gate = () => Promise.resolve();
export function setMediaGate(ready) {
  gate = ready;
}
export function allowMediaSession() {
  blocked = false;
  publicResources.clear();
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
  revalidating = new Set();
  mediaRevision.value += 1;
}

function remember(source, url) {
  const existing = displayCache.get(source);
  // 旧地址可能仍被当前页面使用，延迟回收，避免图片瞬间消失。
  if (existing && existing.url !== url)
    setTimeout(() => URL.revokeObjectURL(existing.url), 30000);
  displayCache.delete(source);
  displayCache.set(source, { url, storedAt: Date.now() });
  while (displayCache.size > DISPLAY_MAX) {
    const [oldest, entry] = displayCache.entries().next().value;
    displayCache.delete(oldest);
    URL.revokeObjectURL(entry.url);
  }
}

/** 同步读取仍可展示的图片，让组件挂载时直接有内容，不再先白屏。 */
export function peekMedia(value) {
  const source = safeMediaUrl(value);
  if (!source || !source.startsWith('/api/v1/media/') || blocked) return '';
  const entry = displayCache.get(source);
  if (!entry) return '';
  if (Date.now() - entry.storedAt > DISPLAY_TTL) {
    displayCache.delete(source);
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
    cache: publicResources.has(source) ? 'default' : 'no-cache',
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
        !response.headers.get('Content-Type')?.startsWith('image/')
      ) {
        const entry = displayCache.get(source);
        if (entry) {
          displayCache.delete(source);
          setTimeout(() => URL.revokeObjectURL(entry.url), 30000);
        }
        return;
      }
      const blob = await response.blob();
      if (generation !== mediaRevision.value) return;
      remember(source, URL.createObjectURL(blob));
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
    revalidate(source);
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
          cache: publicResources.has(source) ? 'default' : 'no-cache',
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
        if (
          /\bpublic\b/i.test(policy) &&
          /\bimmutable\b/i.test(policy) &&
          !/no-store|no-cache/i.test(policy)
        ) {
          if (publicResources.size >= 256)
            publicResources.delete(publicResources.values().next().value);
          publicResources.add(source);
        } else publicResources.delete(source);
        const blob = await response.blob();
        if (
          generation !== mediaRevision.value ||
          task.controller.signal.aborted ||
          !task.count
        )
          throw new Error('图片请求已失效');
        task.url = URL.createObjectURL(blob);
        // no-store 预览（待审/暂存）不能被后续展示复用。
        if (!/no-store/i.test(policy)) remember(source, task.url);
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
