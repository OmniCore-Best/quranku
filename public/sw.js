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
  
  const data = event.data?.json() || {
    title: 'quranku',
    body: 'Ada pembaruan baru!',
    icon: '/icons/icon-192x192.png'
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
      actions: [
        {
          action: 'open',
          title: 'Buka'
        },
        {
          action: 'dismiss',
          title: 'Tutup'
        }
      ]
    })
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
        if (client.url === event.notification.data.url && 'focus' in client) {
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

// ================= WEB PUSH NOTIFICATIONS =================
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received for prayer time');
  
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch (error) {
    data = {
      title: 'Waktu Sholat',
      body: 'Saatnya menunaikan sholat',
      icon: '/icons/icon-192x192.png',
      data: { 
        type: 'prayer_time',
        prayer: 'sholat',
        time: new Date().toISOString()
      }
    };
  }

  // Customize based on prayer type
  const prayerIcons = {
    'imsak': '🌙',
    'subuh': '🌅',
    'dzuhur': '☀️',
    'ashar': '⛅',
    'maghrib': '🌇',
    'isya': '🌃'
  };

  const prayer = data.data?.prayer || 'sholat';
  const icon = prayerIcons[prayer.toLowerCase()] || '🕌';

  const options = {
    body: data.body || `${icon} Waktu ${prayer} telah tiba`,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.data?.url || '/schedule',
      type: 'prayer_time',
      prayer: prayer,
      time: data.data?.time || new Date().toISOString()
    },
    actions: [
      {
        action: 'open',
        title: 'Buka Jadwal'
      },
      {
        action: 'snooze',
        title: 'Tunda 5 Menit'
      }
    ],
    tag: `prayer-${prayer}-${new Date().toDateString()}`,
    renotify: true,
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Waktu Sholat', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'snooze') {
    // Handle snooze action
    console.log('Snooze clicked for prayer notification');
    // You can implement snooze logic here
    return;
  }

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(windowClients => {
          // Check if there's already a window/tab open with the target URL
          for (const client of windowClients) {
            if (client.url.includes('/schedule') && 'focus' in client) {
              return client.focus();
            }
          }
          // If not, open a new window/tab
          if (clients.openWindow) {
            return clients.openWindow('/schedule');
          }
        })
    );
  }
});

// Background sync for prayer times
self.addEventListener('sync', event => {
  if (event.tag === 'sync-prayer-times') {
    event.waitUntil(syncPrayerTimes());
  }
});

async function syncPrayerTimes() {
  try {
    console.log('[Service Worker] Syncing prayer times...');
    
    // Get user's location from IndexedDB
    const db = await openPrayerDB();
    const location = await getStoredLocation(db);
    
    if (location) {
      // Fetch latest prayer times
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
        
        // Calculate next prayer and schedule notification
        scheduleNextPrayerNotification(data.data);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Prayer times sync failed:', error);
  }
}

async function openPrayerDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PrayerDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('locations')) {
        db.createObjectStore('locations', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function getStoredLocation(db) {
  return new Promise((resolve) => {
    const transaction = db.transaction(['locations'], 'readonly');
    const store = transaction.objectStore('locations');
    const request = store.get('current');
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

function scheduleNextPrayerNotification(scheduleData) {
  if (!scheduleData || !scheduleData.today_schedule) return;
  
  const prayers = scheduleData.today_schedule.prayers;
  const now = new Date();
  
  for (const prayer of prayers) {
    const [hours, minutes] = prayer.time_24h.split(':').map(Number);
    const prayerTime = new Date();
    prayerTime.setHours(hours, minutes, 0, 0);
    
    // Schedule notification 10 minutes before prayer time
    const notificationTime = new Date(prayerTime.getTime() - 10 * 60000);
    
    if (notificationTime > now) {
      const delay = notificationTime.getTime() - now.getTime();
      
      setTimeout(() => {
        self.registration.showNotification(`Waktu ${prayer.name}`, {
          body: `Waktu ${prayer.name} dalam 10 menit (${prayer.time_24h})`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          vibrate: [200, 100, 200],
          data: {
            url: '/schedule',
            type: 'prayer_reminder',
            prayer: prayer.name,
            time: prayer.time_24h
          },
          tag: `reminder-${prayer.name}-${prayer.time_24h}`,
          renotify: true
        });
      }, delay);
      
      console.log(`Scheduled ${prayer.name} notification for ${notificationTime}`);
      break; // Only schedule the next prayer
    }
  }
}

// ================= BACKGROUND SYNC =================
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-quran-data') {
    event.waitUntil(syncQuranData());
  }
});

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

// ================= MESSAGE HANDLING =================
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
        event.source.postMessage({
          type: 'CACHE_INFO',
          data: cacheSizes
        });
      })()
    );
  }
});

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