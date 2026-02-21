'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { db } from '@/lib/db';

export default function ServiceWorkerRegistration() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none'
          });
          registrationRef.current = registration;

          console.log('Service Worker registered with scope:', registration.scope);

          // Dengarkan event updatefound
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Tampilkan notifikasi update
                  toast.custom((t) => (
                    <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-4">
                      <p className="text-sm">Versi baru tersedia!</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                            toast.dismiss(t);
                          }}
                          className="bg-white text-blue-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-100"
                        >
                          Update sekarang
                        </button>
                        <button
                          onClick={() => toast.dismiss(t)}
                          className="bg-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-800"
                        >
                          Nanti
                        </button>
                      </div>
                    </div>
                  ), { duration: 0 }); // tidak auto dismiss
                }
              });
            }
          });

          // Update periodik setiap 1 jam
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // 1 jam

          // Dengarkan pesan dari service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'SW_ACTIVATED') {
              console.log('Service Worker activated, version:', event.data.version);
              toast.success('Aplikasi diperbarui!');
              window.location.reload();
            }
          });

          const downloadAllData = async () => {
                      // Cek apakah sudah pernah download
                      const dataDownloaded = localStorage.getItem('quranDataDownloaded');
                      const lastDownloadTime = localStorage.getItem('lastDataDownloadTime');
                      
                      // Jika sudah download dalam 24 jam terakhir, skip
                      if (dataDownloaded === 'true' && lastDownloadTime) {
                        const lastTime = parseInt(lastDownloadTime);
                        const now = Date.now();
                        const oneDay = 24 * 60 * 60 * 1000;
                        
                        if (now - lastTime < oneDay) {
                          console.log('Data already downloaded within 24 hours');
                          return;
                        }
                      }
          
                      // Hanya download jika online
                      if (!navigator.onLine) {
                        console.log('Offline, skipping data download');
                        return;
                      }
          
                      console.log('Starting Quran data download...');
                      
                      // Update UI untuk menunjukkan proses download
                      const event = new CustomEvent('downloadProgress', { 
                        detail: { status: 'starting', message: 'Menyiapkan download data Quran...' }
                      });
                      window.dispatchEvent(event);
          
                      try {
                        // 1. Download daftar semua surah
                        const listUrl = 'https://api.devnova.icu/api/islamic/al-quran?language=id';
                        const listResponse = await fetch(listUrl);
                        const listData = await listResponse.json();
          
                        if (listData.code === 200 && listData.data) {
                          // Simpan ke IndexedDB
                          await db.quranList.clear();
                          const surahsToSave = listData.data.map((surah: any) => ({
                            ...surah,
                            id: surah.nomor,
                            updatedAt: new Date()
                          }));
                          await db.quranList.bulkAdd(surahsToSave);
          
                          // Cache response
                          const cache = await caches.open('quran-api-cache-v1');
                          await cache.put(listUrl, listResponse.clone());
          
                          // 2. Download detail dan tafsir setiap surah
                          const totalSurahs = listData.data.length;
                          let downloadedCount = 0;
          
                          for (const surah of listData.data) {
                            // Update progress
                            downloadedCount++;
                            const progressEvent = new CustomEvent('downloadProgress', {
                              detail: {
                                status: 'downloading',
                                message: `Mengunduh surat ${surah.nomor}: ${surah.namaLatin}`,
                                progress: Math.round((downloadedCount / totalSurahs) * 100),
                                current: downloadedCount,
                                total: totalSurahs
                              }
                            });
                            window.dispatchEvent(progressEvent);
          
                            // Tambah delay untuk menghindari rate limiting
                            await new Promise(resolve => setTimeout(resolve, 50));
          
                            // Download detail surah
                            try {
                              const detailUrl = `https://api.devnova.icu/api/islamic/al-quran/${surah.nomor}?language=id`;
                              const detailResponse = await fetch(detailUrl);
                              
                              if (detailResponse.status === 200) {
                                const detailData = await detailResponse.json();
                                
                                if (detailData.code === 200 && detailData.data) {
                                  await db.surahDetail.put({
                                    ...detailData.data,
                                    id: detailData.data.nomor,
                                    updatedAt: new Date()
                                  });
                                  await cache.put(detailUrl, detailResponse.clone());
                                }
                              }
                            } catch (error) {
                              console.error(`Error downloading surah ${surah.nomor}:`, error);
                            }
          
                            // Download tafsir surah
                            try {
                              const tafsirUrl = `https://api.devnova.icu/api/islamic/al-quran/${surah.nomor}/tafsir`;
                              const tafsirResponse = await fetch(tafsirUrl);
                              
                              if (tafsirResponse.status === 200) {
                                const tafsirData = await tafsirResponse.json();
                                
                                if (tafsirData.code === 200 && tafsirData.data?.tafsir && Array.isArray(tafsirData.data.tafsir)) {
                                  for (const tafsirAyat of tafsirData.data.tafsir) {
                                    // Validasi bahwa tafsirAyat memiliki ayat dan teks
                                    if (tafsirAyat.ayat && tafsirAyat.teks) {
                                      await db.saveTafsir(
                                        surah.nomor,
                                        tafsirAyat.ayat,
                                        tafsirAyat.teks
                                      );
                                    }
                                  }
                                  await cache.put(tafsirUrl, tafsirResponse.clone());
                                }
                              }
                            } catch (error) {
                              console.error(`Error downloading tafsir surah ${surah.nomor}:`, error);
                            }
          
                            console.log(`Downloaded surah ${surah.nomor}: ${surah.namaLatin}`);
                          }
          
                          // Tandai selesai
                          localStorage.setItem('quranDataDownloaded', 'true');
                          localStorage.setItem('lastDataDownloadTime', Date.now().toString());
                          
                          const completeEvent = new CustomEvent('downloadProgress', {
                            detail: {
                              status: 'complete',
                              message: 'Download data Quran selesai!',
                              progress: 100
                            }
                          });
                          window.dispatchEvent(completeEvent);
                          
                          console.log('All Quran data downloaded successfully');
                        }
                      } catch (error) {
                        console.error('Error downloading Quran data:', error);
                        
                        const errorEvent = new CustomEvent('downloadProgress', {
                          detail: {
                            status: 'error',
                            message: 'Gagal mendownload data Quran'
                          }
                        });
                        window.dispatchEvent(errorEvent);
                      }
                    };

          // Jalankan download data setelah registrasi
          if (registration.active) {
            setTimeout(() => downloadAllData(), 5000);
          } else if (registration.installing) {
            registration.installing.addEventListener('statechange', () => {
              if (registration.active) {
                setTimeout(() => downloadAllData(), 5000);
              }
            });
          }
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      };

      window.addEventListener('load', registerServiceWorker);
      if (document.readyState === 'complete') {
        registerServiceWorker();
      }
    }
  }, []);

  return null;
}