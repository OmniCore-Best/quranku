const CACHE_VERSION = 'v18'; 

const STATIC_CACHE = `quranku-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `quranku-dynamic-${CACHE_VERSION}`;
const QURAN_API_CACHE = `quran-api-cache-${CACHE_VERSION}`;
const AUDIO_CACHE = `quran-audio-cache-${CACHE_VERSION}`;

// Daftar aset statis yang akan di-cache saat install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/favicon.ico',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap',
  'https://fonts.gstatic.com/s/amiri/v30/J7aRnpd8CGxBHpUrtLMA7w.woff2',
  'https://fonts.gstatic.com/s/amiri/v30/J7aRnpd8CGxBHpUgtLMA7w.woff2',
  'https://fonts.gstatic.com/s/amiri/v30/J7aRnpd8CGxBHpUutLM.woff2',
  'https://fonts.gstatic.com/s/amiri/v30/J7acnpd8CGxBHp2VkaY6zp5yGw.woff2',
  'https://fonts.gstatic.com/s/amiri/v30/J7acnpd8CGxBHp2VkaYxzp5yGw.woff2',
  'https://fonts.gstatic.com/s/amiri/v30/J7acnpd8CGxBHp2VkaY_zp4.woff2'
];

// ================= INSTALL =================
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        console.log('[Service Worker] Caching static assets');
        await cache.addAll(STATIC_ASSETS);
        self.skipWaiting(); // Langsung aktifkan service worker baru
        console.log('[Service Worker] Install completed');
      } catch (error) {
        console.error('[Service Worker] Install failed:', error);
      }
    })()
  );
});

// ================= ACTIVATE =================
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    (async () => {
      // Hapus semua cache lama yang tidak sesuai dengan versi saat ini
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.map(cacheName => {
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('[Service Worker] Menghapus cache lama:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
      
      // Klaim kontrol semua halaman yang terbuka
      await self.clients.claim();
      console.log('[Service Worker] Activation completed');
      
      // Beri tahu semua klien bahwa service worker aktif
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_ACTIVATED',
          version: CACHE_VERSION
        });
      });
    })()
  );
});

// ================= MESSAGE HANDLER =================
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_AUDIO') {
    event.waitUntil(cacheAudioForSurah(event.data.surahId, event.data.audioUrls));
  }

  if (event.data.type === 'GET_CACHE_INFO') {
    event.waitUntil(
      (async () => {
        const cacheNames = await caches.keys();
        const cacheSizes = {};
        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          cacheSizes[name] = keys.length;
        }
        if (event.source) {
          event.source.postMessage({
            type: 'CACHE_INFO',
            data: cacheSizes
          });
        }
      })()
    );
  }
});

// ================= FETCH =================
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) return;
  
  const url = new URL(event.request.url);
  
  // ===== 1. FONT GOOGLE (Cache First) =====
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }
  
  // ===== 2. AUDIO (Cache with network fallback) =====
  if (url.origin === 'https://cdn.equran.id') {
    event.respondWith(networkFirstWithCache(event.request, AUDIO_CACHE));
    return;
  }
  
  // ===== 3. API QURAN (Stale-While-Revalidate) =====
  if (url.href.includes('api.devnova.icu/api/islamic/al-quran')) {
    event.respondWith(staleWhileRevalidate(event.request, QURAN_API_CACHE));
    return;
  }
  
  // ===== 4. API LAIN (Network First) =====
  if (url.pathname.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // ===== 5. NAVIGASI (Stale-While-Revalidate) =====
  if (event.request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(event.request, DYNAMIC_CACHE));
    return;
  }
  
  // ===== 6. STATIC ASSETS (Cache First) =====
  event.respondWith(cacheFirst(event.request, STATIC_CACHE));
});

// ================= STRATEGI CACHING =================

// Cache First: coba ambil dari cache, jika tidak ada baru fetch dan simpan
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('', { status: 404 });
  }
}

// Stale-While-Revalidate: kembalikan cache (jika ada), sambil update di background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const networkPromise = fetch(request)
    .then(response => {
      if (response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  
  // Jika ada cache, kembalikan segera dan update di background
  if (cached) {
    networkPromise.then(() => {}); // trigger background update
    return cached;
  }
  
  // Jika tidak ada cache, tunggu network
  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;
  
  // Fallback offline untuk navigasi
  if (request.mode === 'navigate') {
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) return offlinePage;
  }
  
  return new Response('', { status: 404 });
}

// Network First: coba fetch, jika gagal ambil dari cache
async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('', { status: 404, statusText: 'Not available offline' });
  }
}

// ================= FUNGSI PEMBANTU CACHING =================
async function cacheAudioForSurah(surahId, audioUrls) {
  try {
    const cache = await caches.open(AUDIO_CACHE);
    let cachedCount = 0;
    
    for (const url of audioUrls) {
      try {
        const response = await fetch(url);
        if (response.status === 200) {
          await cache.put(url, response);
          cachedCount++;
        }
      } catch (error) {
        console.error(`Error caching audio ${url}:`, error);
      }
    }
    
    console.log(`[Service Worker] Cached ${cachedCount} audio files for surah ${surahId}`);
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'AUDIO_CACHED',
        data: { surahId, cachedCount, total: audioUrls.length }
      });
    });
  } catch (error) {
    console.error('[Service Worker] Audio caching failed:', error);
  }
}