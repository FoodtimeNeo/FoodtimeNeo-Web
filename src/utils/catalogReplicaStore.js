// Separate from drafts, identity and community caches. IndexedDB serializes budget enforcement.
const DATABASE = 'foodtime-public-catalog-v1';
const STORE = 'replicas';
export const CATALOG_CACHE_LIMIT = 100 * 1024 * 1024;
const MAX_ENTRY = 20 * 1024 * 1024;

async function digest(bytes) {
  if (!globalThis.crypto?.subtle) return '';
  const value = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(value)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
const encode = (value) => new TextEncoder().encode(value);
const keyFor = (value) => digest(encode(value));

function database() {
  if (!globalThis.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = request.onblocked = () => resolve(null);
  });
}

async function transaction(action) {
  let db;
  try {
    db = await database();
    if (!db) return null;
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      let result = null;
      action(tx.objectStore(STORE), (value) => (result = value));
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Private mode, quota, disabled storage or corruption never blocks a network success.
    return null;
  } finally {
    db?.close();
  }
}

/** Internal sync storage. Callers must revalidate before presenting any returned replica. */
export function createCatalogReplicaStore(limit = CATALOG_CACHE_LIMIT) {
  const store = {
    async get(source) {
      const key = await keyFor(source);
      if (!key) return null;
      const record = await transaction((store, done) => {
        const request = store.get(key);
        request.onsuccess = () => {
          if (!request.result) return;
          const value = request.result;
          value.accessed = Date.now();
          store.put(value);
          done(value);
        };
      });
      if (!record) return null;
      try {
        const bytes =
          record.kind === 'image'
            ? await record.payload.arrayBuffer()
            : encode(record.payload);
        if (
          record.bytes > limit ||
          !record.checksum ||
          record.checksum !== (await digest(bytes))
        ) {
          await this.remove(source);
          return null;
        }
        return record;
      } catch {
        await this.remove(source);
        return null;
      }
    },
    async put(source, { kind, payload, etag, type = '' }) {
      if (!['json', 'image'].includes(kind) || typeof etag !== 'string') return;
      const raw =
        kind === 'image' ? await payload.arrayBuffer() : encode(payload);
      const bytes = raw.byteLength + encode(etag + type).byteLength + 512;
      if (bytes > limit || bytes > MAX_ENTRY) return;
      const key = await keyFor(source);
      if (!key) return;
      const checksum = await digest(raw);
      await transaction((store) => {
        store.put({
          key,
          kind,
          payload,
          etag,
          type,
          checksum,
          bytes,
          accessed: Date.now(),
        });
        const rows = [];
        let total = 0;
        const cursor = store.openCursor();
        cursor.onsuccess = () => {
          const current = cursor.result;
          if (current) {
            const { key, bytes, accessed } = current.value;
            rows.push({ key, bytes, accessed });
            total += bytes;
            current.continue();
          } else {
            rows.sort((a, b) => a.accessed - b.accessed);
            while (rows.length && (total > limit || rows.length > 4096)) {
              const oldest = rows.shift();
              store.delete(oldest.key);
              total -= oldest.bytes;
            }
          }
        };
      });
    },
    async remove(source) {
      const key = await keyFor(source);
      if (key) await transaction((store) => store.delete(key));
    },
  };
  // Browser storage/crypto/Blob implementations may fail independently of HTTP.
  return Object.fromEntries(
    Object.keys(store).map((method) => [
      method,
      async (...args) => {
        try {
          return await store[method](...args);
        } catch {
          return method === 'get' ? null : undefined;
        }
      },
    ]),
  );
}

export const catalogReplicaStore = createCatalogReplicaStore();
