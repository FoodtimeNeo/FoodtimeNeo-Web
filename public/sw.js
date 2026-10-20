const CACHE_NAME = 'foodtime-media-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 针对 /api/v1/media/ 下的不可变图片资源，实施 Cache-First 策略，绕过后端 no-store
  if (url.pathname.startsWith('/api/v1/media/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) {
          return cached;
        }

        try {
          const response = await fetch(event.request);
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch (error) {
          if (cached) return cached;
          throw error;
        }
      }),
    );
  }
});
