import { ref } from 'vue';
import { safeMediaUrl } from './mediaUrl.js';

// Only live display references are retained here; persistent bytes belong to HTTP caching.
export const mediaRevision = ref(0);
const pending = new Map();
const publicResources = new Set();
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
  mediaRevision.value += 1;
}
export function acquireMedia(value) {
  const source = safeMediaUrl(value);
  if (blocked)
    return { promise: Promise.reject(new Error('会话已失效')), release() {} };
  if (!source)
    return { promise: Promise.reject(new Error('图片地址无效')), release() {} };
  if (!source.startsWith('/api/v1/media/'))
    return { promise: Promise.resolve(source), release() {} };
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
        if (task.url) URL.revokeObjectURL(task.url);
        if (pending.get(source) === task) pending.delete(source);
      }
    },
  };
}
