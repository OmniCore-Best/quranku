'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  FaArrowLeft, 
  FaCloudDownloadAlt, 
  FaCheckCircle, 
  FaExclamationCircle,
  FaSpinner,
  FaWifi,
  FaTimes,
  FaDownload,
  FaSync,
  FaInfoCircle
} from 'react-icons/fa';
import { toast } from 'sonner';
import { db } from '@/lib/db';

interface DownloadProgress {
  status: 'idle' | 'checking' | 'downloading' | 'complete' | 'error';
  message: string;
  progress: number;
  current: number;
  total: number;
}

interface DataStatus {
  exists: boolean;
  count: number;
  total: number;
  lastDownload: string | null;
  size: string;
}

export default function DownloadPage() {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [onlyWifi, setOnlyWifi] = useState(true);
  const [progress, setProgress] = useState<DownloadProgress>({
    status: 'idle',
    message: '',
    progress: 0,
    current: 0,
    total: 0
  });
  const [dataStatus, setDataStatus] = useState<DataStatus>({
    exists: false,
    count: 0,
    total: 114,
    lastDownload: null,
    size: '0 MB'
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkDataStatus();
  }, []);

  const checkDataStatus = async () => {
    setIsChecking(true);
    try {
      const count = await db.quranList.count();
      const lastDownload = localStorage.getItem('lastDataDownloadTime');
      const lastDownloadDate = lastDownload ? new Date(parseInt(lastDownload)).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }) : null;

      let size = '0 MB';
      if (count > 0) {
        const details = await db.surahDetail.toArray();
        const totalSize = details.reduce((acc, curr) => {
          return acc + JSON.stringify(curr).length;
        }, 0);
        size = (totalSize / (1024 * 1024)).toFixed(1) + ' MB';
      }

      setDataStatus({
        exists: count >= 114,
        count,
        total: 114,
        lastDownload: lastDownloadDate,
        size
      });
    } catch (error) {
      console.error('Error checking data status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownload = async () => {
    if (isDownloading) return;

    if (onlyWifi) {
      const connection = (navigator as any).connection;
      if (connection && connection.type !== 'wifi' && connection.type !== 'ethernet') {
        toast.error('Download hanya diizinkan melalui Wi-Fi. Silakan sambungkan ke Wi-Fi.');
        return;
      }
    }

    if (!navigator.onLine) {
      toast.error('Tidak ada koneksi internet. Silakan sambungkan ke internet.');
      return;
    }

    setShowConfirmDialog(false);
    await startDownload();
  };

  const startDownload = async () => {
    setIsDownloading(true);
    setProgress({
      status: 'checking',
      message: 'Memeriksa data...',
      progress: 0,
      current: 0,
      total: 0
    });

    try {
      const listUrl = 'https://api.devnova.icu/api/islamic/al-quran?language=id';
      const listResponse = await fetch(listUrl);
      const listData = await listResponse.json();

      if (listData.code !== 200) {
        throw new Error('Gagal mengambil daftar surah');
      }

      await db.quranList.clear();
      const surahsToSave = listData.data.map((surah: any) => ({
        ...surah,
        id: surah.nomor,
        updatedAt: new Date()
      }));
      await db.quranList.bulkAdd(surahsToSave);

      const cache = await caches.open('quran-api-cache-v1');
      await cache.put(listUrl, listResponse.clone());

      const totalSurahs = listData.data.length;
      let downloadedCount = 0;

      for (const surah of listData.data) {
        downloadedCount++;
        const progressPercent = Math.round((downloadedCount / totalSurahs) * 100);
        
        setProgress({
          status: 'downloading',
          message: `Mengunduh ${surah.namaLatin}`,
          progress: progressPercent,
          current: downloadedCount,
          total: totalSurahs
        });

        await new Promise(resolve => setTimeout(resolve, 100));

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

        try {
          const tafsirUrl = `https://api.devnova.icu/api/islamic/al-quran/${surah.nomor}/tafsir`;
          const tafsirResponse = await fetch(tafsirUrl);
          
          if (tafsirResponse.status === 200) {
            const tafsirData = await tafsirResponse.json();
            
            if (tafsirData.code === 200 && tafsirData.data?.tafsir) {
              for (const tafsirAyat of tafsirData.data.tafsir) {
                if (tafsirAyat.ayat && tafsirAyat.teks) {
                  await db.saveTafsir(surah.nomor, tafsirAyat.ayat, tafsirAyat.teks);
                }
              }
              await cache.put(tafsirUrl, tafsirResponse.clone());
            }
          }
        } catch (error) {
          console.error(`Error downloading tafsir surah ${surah.nomor}:`, error);
        }
      }

      localStorage.setItem('quranDataDownloaded', 'true');
      localStorage.setItem('lastDataDownloadTime', Date.now().toString());
      localStorage.setItem('downloadPreference', onlyWifi ? 'wifi' : 'any');
      
      setProgress({
        status: 'complete',
        message: 'Download selesai!',
        progress: 100,
        current: totalSurahs,
        total: totalSurahs
      });

      toast.success('Data Quran berhasil diunduh!');
      await checkDataStatus();

      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (error) {
      console.error('Download error:', error);
      setProgress({
        status: 'error',
        message: 'Gagal mengunduh data Quran. Silakan coba lagi.',
        progress: 0,
        current: 0,
        total: 0
      });
      toast.error('Gagal mengunduh data Quran');
      setIsDownloading(false);
    }
  };

  const handleDeleteData = async () => {
    if (!confirm('Yakin ingin menghapus semua data Quran offline?')) return;

    try {
      await db.quranList.clear();
      await db.surahDetail.clear();
      await db.tafsir.clear();
      localStorage.removeItem('quranDataDownloaded');
      localStorage.removeItem('lastDataDownloadTime');
      
      toast.success('Data Quran offline berhasil dihapus');
      await checkDataStatus();
    } catch (error) {
      console.error('Error deleting data:', error);
      toast.error('Gagal menghapus data');
    }
  };

  const isProgressActive = progress.status === 'checking' || progress.status === 'downloading';
  const isProgressComplete = progress.status === 'complete';
  const isProgressError = progress.status === 'error';

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-emerald-100 transition"
          >
            <FaArrowLeft className="w-5 h-5 text-emerald-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-emerald-800">Download Manager</h1>
            <p className="text-sm text-gray-600 mt-1">Kelola data Quran offline Anda</p>
          </div>
        </div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-emerald-100 p-6 mb-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                dataStatus.exists ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
              }`}>
                {isChecking ? (
                  <FaSpinner className="w-6 h-6 animate-spin" />
                ) : dataStatus.exists ? (
                  <FaCheckCircle className="w-6 h-6" />
                ) : (
                  <FaCloudDownloadAlt className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {isChecking ? 'Memeriksa...' : dataStatus.exists ? 'Data Lengkap' : 'Data Belum Lengkap'}
                </h3>
                <p className="text-sm text-gray-500">
                  {dataStatus.count} dari {dataStatus.total} surah
                </p>
              </div>
            </div>
            <button
              onClick={checkDataStatus}
              disabled={isChecking}
              className="p-2 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
            >
              <FaSync className={`w-4 h-4 text-gray-500 ${isChecking ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Ukuran Data</p>
              <p className="font-semibold text-gray-900">{dataStatus.size}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Terakhir Download</p>
              <p className="font-semibold text-gray-900">
                {dataStatus.lastDownload || 'Belum pernah'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Progress Section */}
        {progress.status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-emerald-100 p-6 mb-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              {isProgressActive && (
                <FaSpinner className="w-5 h-5 text-emerald-600 animate-spin" />
              )}
              {isProgressComplete && (
                <FaCheckCircle className="w-5 h-5 text-green-600" />
              )}
              {isProgressError && (
                <FaExclamationCircle className="w-5 h-5 text-red-600" />
              )}
              <div>
                <p className="font-medium text-gray-900">{progress.message}</p>
                {isProgressActive && (
                  <p className="text-sm text-gray-500">
                    {progress.current} dari {progress.total} surah
                  </p>
                )}
              </div>
            </div>

            {isProgressActive && (
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {isProgressActive && (
              <p className="text-xs text-gray-500 mt-2 text-right">{progress.progress}%</p>
            )}

            {isProgressComplete && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 text-center">
                  Download selesai! Anda akan dialihkan ke halaman utama...
                </p>
              </div>
            )}

            {isProgressError && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    setProgress({ status: 'idle', message: '', progress: 0, current: 0, total: 0 });
                    setIsDownloading(false);
                  }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Tutup
                </button>
                <button
                  onClick={startDownload}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Coba Lagi
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Action Buttons */}
        {!isDownloading && progress.status === 'idle' && (
          <div className="space-y-4">
            {!dataStatus.exists ? (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowConfirmDialog(true)}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-emerald-700 transition shadow-lg flex items-center justify-center gap-3"
              >
                <FaCloudDownloadAlt className="w-5 h-5" />
                Download Data Quran
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-green-50 border border-green-200 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">Data Quran Tersedia</p>
                    <p className="text-sm text-green-600">
                      Anda dapat membaca Quran secara offline kapan saja
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {dataStatus.exists && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onClick={handleDeleteData}
                className="w-full py-3 border border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-50 transition flex items-center justify-center gap-2"
              >
                <FaTimes className="w-4 h-4" />
                Hapus Data Offline
              </motion.button>
            )}

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => router.push('/')}
              className="w-full py-3 border border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition"
            >
              Kembali ke Beranda
            </motion.button>
          </div>
        )}

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <FaInfoCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 text-sm">Informasi Download</h4>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                <li>• Data yang diunduh: 114 surah + tafsir lengkap</li>
                <li>• Perkiraan ukuran: ~30 MB</li>
                <li>• Data disimpan secara lokal untuk akses offline</li>
                <li>• Update otomatis setiap 7 hari jika ada koneksi</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <FaDownload className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-emerald-800">Konfirmasi Download</h3>
            </div>

            <p className="text-sm text-gray-600">
              Anda akan mengunduh seluruh data Quran (114 surah + tafsir) untuk akses offline.
              Pastikan Anda memiliki koneksi internet yang stabil.
            </p>

            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="wifiOnly"
                checked={onlyWifi}
                onChange={(e) => setOnlyWifi(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <label htmlFor="wifiOnly" className="text-sm text-gray-700 flex items-center gap-1">
                <FaWifi className="w-3 h-3" />
                Hanya melalui Wi-Fi
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleDownload}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <FaDownload className="w-4 h-4" />
                Download
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}