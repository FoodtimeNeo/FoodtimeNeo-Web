/**
 * 每账号在本机只有一份活动发帖草稿。键为 (serviceOrigin, accountUuid)，不按邮箱或昵称隔离；
 * 图片以 Blob 存入 IndexedDB，ObjectURL 只用于当前展示。
 */
const DB_NAME = 'foodtime-post-drafts';
const STORE = 'drafts';
const VERSION = 1;

function database() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE))
        db.createObjectStore(STORE, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run(mode, action) {
  return database().then(
    (db) =>
      new Promise((resolve, reject) => {
        if (!db) {
          resolve(null);
          return;
        }
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
        let request;
        try {
          request = action(store);
        } catch (error) {
          reject(error);
          return;
        }
        transaction.oncomplete = () => resolve(request?.result ?? null);
        transaction.onerror = () =>
          reject(
            transaction.error || request?.error || new Error('草稿存储失败'),
          );
        transaction.onabort = () =>
          reject(transaction.error || new Error('草稿存储已取消'));
      }),
  );
}

export function draftKey(serviceOrigin, ownerId) {
  return `${serviceOrigin}::${ownerId}`;
}

export function isBlankDraft({ title = '', content = '', images = [] } = {}) {
  return !title.trim() && !content.trim() && images.length === 0;
}

export async function loadDraft(serviceOrigin, ownerId) {
  if (!ownerId) return null;
  const key = draftKey(serviceOrigin, ownerId);
  const record = await run('readonly', (store) => store.get(key));
  if (!record) return null;
  return record;
}

export async function saveDraft(serviceOrigin, ownerId, draft) {
  if (!ownerId) return null;
  const key = draftKey(serviceOrigin, ownerId);
  const existing = await loadDraft(serviceOrigin, ownerId);
  const record = {
    ...draft,
    key,
    ownerId,
    serviceOrigin,
    schemaVersion: VERSION,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
    localRevision: (existing?.localRevision || 0) + 1,
  };
  await run('readwrite', (store) => store.put(record));
  return record;
}

export async function deleteDraft(serviceOrigin, ownerId) {
  if (!ownerId) return;
  await run('readwrite', (store) =>
    store.delete(draftKey(serviceOrigin, ownerId)),
  );
}

export async function draftUsage(serviceOrigin, ownerId) {
  const draft = await loadDraft(serviceOrigin, ownerId);
  if (!draft) return 0;
  return (draft.images || []).reduce(
    (total, image) => total + (image.blob?.size || 0),
    0,
  );
}

/** 注销成功后清理该 UUID 的本机草稿；普通退出不调用。 */
export async function purgeActor(serviceOrigin, ownerId) {
  await deleteDraft(serviceOrigin, ownerId);
}
