let migration;
let checkedController;
export function probeMediaWorker(worker) {
  if (!worker) return Promise.resolve(false);
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const finish = (ok) => {
      clearTimeout(timeout);
      channel.port1.close();
      channel.port2.close();
      resolve(ok);
    };
    const timeout = setTimeout(() => finish(false), 500);
    channel.port1.onmessage = (event) => finish(event.data?.version === 2);
    try {
      worker.postMessage({ type: 'FOODTIME_MEDIA_POLICY' }, [channel.port2]);
    } catch {
      finish(false);
    }
  });
}
export function ensureMediaWorkerMigration() {
  if (!('serviceWorker' in navigator)) return Promise.resolve();
  if (checkedController !== navigator.serviceWorker.controller) {
    checkedController = navigator.serviceWorker.controller;
    migration = null;
  }
  if (!migration)
    migration = migrate().catch((error) => {
      migration = null;
      throw error;
    });
  return migration;
}
async function migrate() {
  const workers = navigator.serviceWorker;
  if (await probeMediaWorker(workers.controller)) return;
  try {
    const registration = await workers.register('/sw.js', {
      updateViaCache: 'none',
    });
    await registration.update();
    await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        workers.removeEventListener('controllerchange', check);
        if (error) reject(error);
        else resolve();
      };
      const check = async () => {
        if (await probeMediaWorker(workers.controller)) finish();
      };
      const timer = setTimeout(
        () => finish(new Error('旧图片缓存尚未完成迁移，请重试')),
        10000,
      );
      workers.addEventListener('controllerchange', check);
      check();
    });
  } catch (error) {
    if (workers.controller) throw error;
  }
}
