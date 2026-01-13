const CACHE_NAME = 'quranku-v1.0.0';
const STATIC_CACHE = 'quranku-static-v1';
const DYNAMIC_CACHE = 'quranku-dynamic-v1';
const QURAN_API_CACHE = 'quran-api-cache-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/favicon.ico'
];

// ================= INSTALL =================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ================= ACTIVATE =================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (
            cacheName !== STATIC_CACHE &&
            cacheName !== DYNAMIC_CACHE &&
            cacheName !== QURAN_API_CACHE
          ) {
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ================= FETCH =================
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  const url = event.request.url;

  // ====== 🔥 KHUSUS API AL-QURAN (STALE WHILE REVALIDATE) ======
  if (url.includes('api.devnova.icu/api/islamic/al-quran')) {
    event.respondWith(
      caches.open(QURAN_API_CACHE).then(async cache => {
        const cached = await cache.match(event.request);

        if (cached) {
          // update di background
          event.waitUntil(
            fetch(event.request)
              .then(res => {
                if (res.status === 200) cache.put(event.request, res.clone());
              })
              .catch(() => {})
          );
          return cached;
        }

        try {
          const response = await fetch(event.request);
          if (response.status === 200) {
            await cache.put(event.request, response.clone());
          }
          return response;
        } catch (err) {
          return new Response(
            JSON.stringify({
              code: 503,
              message: 'Anda sedang offline. Data terbatas.'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      })
    );
    return;
  }

  // ====== REQUEST API LAIN → NETWORK ONLY ======
  if (url.includes('/api/') || !url.startsWith(self.location.origin)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // ====== STATIC + PAGE CACHE ======
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
    })
  );
});

// ================= PUSH =================
self.addEventListener('push', event => {
  const data = event.data?.json() || {
    title: 'Quranku',
    body: 'Ada pembaruan baru!',
    icon: '/icons/icon-192x192.png'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' }
    })
  );
});

// ================= NOTIFICATION CLICK =================
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});

// ================= BACKGROUND SYNC =================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    console.log('Syncing data in background...');
  } catch (error) {
    console.error('Sync failed:', error);
  }
}