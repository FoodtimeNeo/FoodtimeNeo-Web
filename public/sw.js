self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'FOODTIME_MEDIA_POLICY')
    event.ports?.[0]?.postMessage({ version: 2 });
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('foodtime-media-'))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});
// Migration worker: media now follows HTTP Cache-Control and authorization.
// Keep this URL so previously controlled clients can upgrade; never intercept fetch.
