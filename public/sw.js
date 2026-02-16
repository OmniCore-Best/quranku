const STATIC_CACHE = 'quranku-static-v14';
const DYNAMIC_CACHE = 'quranku-dynamic-v14';
const QURAN_API_CACHE = 'quran-api-cache-v14';
const AUDIO_CACHE = 'quran-audio-cache-v14';

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
        
        // Cache semua aset statis
        await cache.addAll(STATIC_ASSETS);
        
        // Skip waiting agar segera aktif
        self.skipWaiting();
        
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
      // Hapus cache lama
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.map(cacheName => {
          if (![STATIC_CACHE, DYNAMIC_CACHE, QURAN_API_CACHE, AUDIO_CACHE].includes(cacheName)) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
      
      // Klaim klien segera
      await self.clients.claim();
      
      console.log('[Service Worker] Activation completed');
      
      // Kirim pesan ke semua klien bahwa SW aktif
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_ACTIVATED',
          version: 'v14'
        });
      });
    })()
  );
});

// ================= MESSAGE HANDLER =================
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data.type === 'CACHE_AUDIO') {
    // Pre-cache audio untuk surah tertentu
    event.waitUntil(cacheAudioForSurah(event.data.surahId, event.data.audioUrls));
  }
  
  if (event.data.type === 'GET_CACHE_INFO') {
    // Kembalikan informasi cache ke klien
    event.waitUntil(
      (async () => {
        const cacheNames = await caches.keys();
        const cacheSizes = {};
        
        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          cacheSizes[name] = keys.length;
        }
        
        // Kirim balik ke klien
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
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(event.request);
        
        if (cached) {
          return cached;
        }
        
        try {
          const response = await fetch(event.request);
          if (response.status === 200) {
            await cache.put(event.request, response.clone());
          }
          return response;
        } catch (error) {
          // Return offline fallback untuk font
          return new Response('', { 
            status: 200,
            headers: { 'Content-Type': 'text/css' }
          });
        }
      })()
    );
    return;
  }
  
  // ===== 2. AUDIO (Cache with network fallback) =====
  if (url.origin === 'https://cdn.equran.id') {
    event.respondWith(
      (async () => {
        // Coba cache audio terlebih dahulu
        const audioCache = await caches.open(AUDIO_CACHE);
        const cachedAudio = await audioCache.match(event.request);
        
        if (cachedAudio) {
          return cachedAudio;
        }
        
        // Jika tidak ada di cache, fetch dari network
        try {
          const response = await fetch(event.request);
          if (response.status === 200) {
            // Simpan ke cache untuk penggunaan berikutnya
            await audioCache.put(event.request, response.clone());
          }
          return response;
        } catch (error) {
          // Jika offline dan audio tidak ada di cache, kembalikan respons 404
          return new Response('', {
            status: 404,
            statusText: 'Audio not available offline'
          });
        }
      })()
    );
    return;
  }
  
  // ===== 3. API QURAN (Stale-While-Revalidate) =====
  if (url.href.includes('api.devnova.icu/api/islamic/al-quran')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(QURAN_API_CACHE);
        const cached = await cache.match(event.request);
        
        // Selalu return cache jika ada (bahkan jika ada error)
        if (cached) {
          // Update di background
          event.waitUntil(
            (async () => {
              try {
                const response = await fetch(event.request);
                if (response.status === 200) {
                  await cache.put(event.request, response.clone());
                }
              } catch (error) {
                // Jika gagal fetch, tetap gunakan cache yang ada
                console.log('[Service Worker] Background update failed:', error);
              }
            })()
          );
          return cached;
        }
        
        // Jika tidak ada cache, fetch dari network
        try {
          const response = await fetch(event.request);
          if (response.status === 200) {
            await cache.put(event.request, response.clone());
          }
          return response;
        } catch (error) {
          // Jika offline dan tidak ada cache
          return new Response(
            JSON.stringify({
              code: 503,
              message: 'You are offline. Using cached data if available.'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      })()
    );
    return;
  }
  
  // ===== 4. API LAIN (Network First) =====
  if (url.pathname.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // ===== 5. NAVIGATION (Cache First, Network Fallback) =====
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Coba cache terlebih dahulu
          const cache = await caches.open(DYNAMIC_CACHE);
          const cached = await cache.match(event.request);
          
          if (cached) {
            return cached;
          }
          
          // Jika tidak ada di cache, fetch dari network
          const response = await fetch(event.request);
          
          // Cache respons yang valid
          if (response.status === 200 && response.type === 'basic') {
            await cache.put(event.request, response.clone());
          }
          
          return response;
        } catch (error) {
          // Jika offline dan halaman tidak ada di cache
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) {
            return offlinePage;
          }
          
          // Fallback ke respons offline
          return new Response(
            '<h1>Offline</h1><p>Please check your internet connection.</p>',
            {
              status: 503,
              headers: { 'Content-Type': 'text/html' }
            }
          );
        }
      })()
    );
    return;
  }
  
  // ===== 6. STATIC ASSETS (Cache First) =====
  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(event.request);
      
      if (cached) {
        return cached;
      }
      
      try {
        const response = await fetch(event.request);
        if (response.status === 200) {
          await cache.put(event.request, response.clone());
        }
        return response;
      } catch (error) {
        // Return empty response jika offline
        return new Response('', { status: 404 });
      }
    })()
  );
});

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
    
    // Beri tahu klien
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