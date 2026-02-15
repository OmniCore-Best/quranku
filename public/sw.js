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

// ================= PREFERENSI NOTIFIKASI =================
let prayerPreferences = {
  prayerTypes: ['imsak', 'subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'],
  advanceMinutes: 10
};

const DB_NAME = 'PrayerPrefsDB';
const STORE_NAME = 'preferences';
const DB_VERSION = 1;

function openPreferencesDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function loadPreferences() {
  try {
    const db = await openPreferencesDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const saved = await store.get('preferences');
    if (saved) {
      prayerPreferences = saved;
    }
  } catch (error) {
    console.error('[SW] Gagal load preferensi:', error);
  }
}

async function savePreferences(prefs) {
  try {
    const db = await openPreferencesDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.put(prefs, 'preferences');
  } catch (error) {
    console.error('[SW] Gagal simpan preferensi:', error);
  }
}

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
      await loadPreferences(); // Load preferensi dari IndexedDB
      
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
  
  if (event.data.type === 'UPDATE_PRAYER_PREFERENCES') {
    prayerPreferences = event.data.data;
    savePreferences(prayerPreferences);
    // Opsional: batalkan jadwal lama dan buat ulang
  }
  
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
        event.source.postMessage({
          type: 'CACHE_INFO',
          data: cacheSizes
        });
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

// ================= PUSH NOTIFICATIONS =================
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received');
  
  let data = {};
  try {
    data = event.data?.json() || {
      title: 'quranku',
      body: 'Ada pembaruan baru!',
      icon: '/icons/icon-192x192.png'
    };
  } catch (error) {
    data = {
      title: 'Waktu Sholat',
      body: 'Saatnya menunaikan sholat',
      icon: '/icons/icon-192x192.png',
      data: { type: 'prayer_time', prayer: 'sholat' }
    };
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200, 100, 200],
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: 'Buka' },
      { action: 'dismiss', title: 'Tutup' }
    ],
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'quranku', options)
  );
});

// ================= NOTIFICATION CLICK =================
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ 
        type: 'window',
        includeUncontrolled: true 
      });
      
      // Cari tab yang sudah terbuka
      for (const client of clients) {
        if (client.url.includes(event.notification.data.url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Jika tidak ada tab yang terbuka, buka tab baru
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/');
      }
    })()
  );
});

// ================= BACKGROUND SYNC UNTUK JADWAL SHOLAT =================
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-prayer-times') {
    event.waitUntil(syncAndSchedulePrayers());
  }
  
  if (event.tag === 'sync-quran-data') {
    event.waitUntil(syncQuranData());
  }
});

async function syncAndSchedulePrayers() {
  try {
    console.log('[Service Worker] Syncing prayer times...');
    
    // Ambil lokasi dari IndexedDB atau localStorage melalui klien
    const clients = await self.clients.matchAll();
    let location = null;
    
    // Minta lokasi dari klien yang terbuka
    for (const client of clients) {
      client.postMessage({ type: 'REQUEST_LOCATION' });
      // Tunggu respons? Sulit, jadi lebih baik ambil dari cache sendiri
    }
    
    // Alternatif: coba baca dari cache API jika sebelumnya disimpan
    const cache = await caches.open('prayer-location');
    const cachedLocation = await cache.match('/api/location');
    if (cachedLocation) {
      location = await cachedLocation.json();
    }
    
    if (!location) return;
    
    const response = await fetch(
      `https://api.devnova.icu/api/islamic/prayer-time?type=schedule&province=${location.province_slug}&city=${location.city_slug}`
    );
    
    if (response.ok) {
      const data = await response.json();
      
      // Store in cache
      const cache = await caches.open('prayer-times-v1');
      const cacheKey = `/api/prayer/${location.province_slug}/${location.city_slug}`;
      await cache.put(cacheKey, new Response(JSON.stringify(data)));
      
      console.log('[Service Worker] Prayer times synced successfully');
      
      // Jadwalkan notifikasi berdasarkan preferensi
      scheduleNextPrayers(data.data.today_schedule.prayers);
    }
  } catch (error) {
    console.error('[Service Worker] Prayer times sync failed:', error);
  }
}

function scheduleNextPrayers(prayers) {
  const now = new Date();
  const todayStr = now.toDateString();

  // Urutkan prayer berdasarkan waktu (ascending)
  const sorted = prayers
    .map(p => {
      const [h, m] = p.time_24h.split(':').map(Number);
      const time = new Date();
      time.setHours(h, m, 0, 0);
      return { ...p, timeObj: time };
    })
    .sort((a, b) => a.timeObj - b.timeObj);

  // Cari sholat yang akan datang (termasuk yang sudah lewat? kita jadwalkan untuk hari ini saja)
  for (const prayer of sorted) {
    const prayerName = prayer.name.toLowerCase();
    // Jika sholat ini tidak termasuk dalam preferensi, lewati
    if (!prayerPreferences.prayerTypes.includes(prayerName)) continue;

    const prayerTime = prayer.timeObj;
    const notifTime = new Date(prayerTime.getTime() - prayerPreferences.advanceMinutes * 60000);

    // Jika waktu notifikasi sudah lewat, lewati
    if (notifTime <= now) continue;

    const delay = notifTime.getTime() - now.getTime();
    setTimeout(() => {
      self.registration.showNotification(`Pengingat Sholat ${prayer.name}`, {
        body: `Waktu ${prayer.name} akan tiba dalam ${prayerPreferences.advanceMinutes} menit (${prayer.time_24h})`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: {
          url: '/schedule',
          type: 'prayer_reminder',
          prayer: prayer.name,
          time: prayer.time_24h
        },
        tag: `reminder-${prayer.name}-${todayStr}`,
        renotify: true
      });
    }, delay);

    // Hanya jadwalkan satu notifikasi terdekat untuk menghindari terlalu banyak timer
    // Jika ingin semua sholat dijadwalkan, hapus break
    break; 
  }
}

async function syncQuranData() {
  try {
    console.log('[Service Worker] Syncing Quran data...');
    
    // Ambil daftar surah untuk diupdate
    const listUrl = 'https://api.devnova.icu/api/islamic/al-quran?language=id';
    const response = await fetch(listUrl);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('[Service Worker] Quran data synced successfully');
      
      // Kirim pesan ke klien bahwa sync berhasil
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          data: { surahCount: data.data?.length || 0 }
        });
      });
    }
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
  }
}

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

// ================= PERIODIC SYNC =================
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-quran-cache') {
    console.log('[Service Worker] Periodic sync for Quran cache');
    event.waitUntil(updateQuranCache());
  }
});

async function updateQuranCache() {
  try {
    // Update cache untuk 10 surah acak setiap sync
    const cache = await caches.open(QURAN_API_CACHE);
    const surahNumbers = Array.from({ length: 10 }, () => Math.floor(Math.random() * 114) + 1);
    
    for (const surahNumber of surahNumbers) {
      try {
        const url = `https://api.devnova.icu/api/islamic/al-quran/${surahNumber}?language=id`;
        const response = await fetch(url);
        
        if (response.status === 200) {
          await cache.put(url, response.clone());
          console.log(`[Service Worker] Updated cache for surah ${surahNumber}`);
        }
      } catch (error) {
        console.error(`[Service Worker] Failed to update surah ${surahNumber}:`, error);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Periodic sync failed:', error);
  }
}