'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  FaSearch, 
  FaSortAmountDown, 
  FaSortAmountUp, 
  FaBook, 
  FaMapMarkerAlt, 
  FaHashtag, 
  FaArrowRight,
  FaBookmark,
  FaCloud,
  FaSync
} from 'react-icons/fa';
import { PiWifiSlash } from 'react-icons/pi'
import { motion, Variants } from 'framer-motion';
import { db, QuranList, LastRead } from '@/lib/db';

interface Surah {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
  audioFull: Record<string, string>;
}

export default function QuranPage() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isOnline, setIsOnline] = useState(true);
  const [lastRead, setLastRead] = useState<LastRead | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    loadLastRead();
    fetchSurahs();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const loadLastRead = async () => {
    try {
      const last = await db.getLastRead();
      setLastRead(last || null);
    } catch (error) {
      console.error('Error loading last read:', error);
    }
  };
  
  const fetchSurahs = async () => {
    try {
      setLoading(true);
      
      // Coba ambil dari cache/IndexedDB dulu
      const cachedSurahs = await db.quranList.toArray();
      if (cachedSurahs.length > 0) {
        const formattedCached = cachedSurahs.map(item => ({
          nomor: item.nomor,
          nama: item.nama,
          namaLatin: item.namaLatin,
          jumlahAyat: item.jumlahAyat,
          tempatTurun: item.tempatTurun,
          arti: item.arti,
          deskripsi: item.deskripsi,
          audioFull: item.audioFull
        }));
        setSurahs(formattedCached);
      }
  
      // Jika online, fetch data terbaru
      if (isOnline && !offlineMode) {
        const response = await fetch('https://api.devnova.icu/api/islamic/al-quran?language=id');
        const data = await response.json();
        
        if (data.code === 200) {
          setSurahs(data.data);
          
          // Simpan ke IndexedDB
          try {
            await db.quranList.clear();
            const toSave = data.data.map((surah: Surah) => ({
              ...surah,
              id: surah.nomor,
              updatedAt: new Date()
            }));
            await db.quranList.bulkAdd(toSave);
          } catch (error) {
            console.error('Error saving to cache:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching surahs:', error);
      
      if (!isOnline && surahs.length === 0) {
        setOfflineMode(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (isOnline) {
      setOfflineMode(false);
      fetchSurahs();
    }
  };

  const filteredSurahs = surahs.filter(surah =>
    surah.namaLatin.toLowerCase().includes(search.toLowerCase()) ||
    surah.arti.toLowerCase().includes(search.toLowerCase()) ||
    surah.nomor.toString().includes(search)
  );

  const sortedSurahs = [...filteredSurahs].sort((a, b) => {
    return sortOrder === 'asc' ? a.nomor - b.nomor : b.nomor - a.nomor;
  });

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12
      }
    }
  };

  const handleShareSurah = async (surah: Surah) => {
    const shareText = `Baca ${surah.namaLatin} (${surah.arti}) - ${surah.jumlahAyat} ayat\n\nDownload aplikasi quranku untuk pengalaman baca Al-Quran yang lebih baik!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `quranku - ${surah.namaLatin}`,
          text: shareText,
          url: window.location.origin,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Teks surat telah disalin ke clipboard!');
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-2 bg-gray-200 rounded w-full mb-2" />
                <div className="h-2 bg-gray-200 rounded w-4/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header dengan status online/offline */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-emerald-800">Al-Qur'an</h1>
                {!isOnline && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium flex items-center gap-1">
                    <PiWifiSlash className="w-3 h-3" />
                    Offline
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm mt-1">Khatamkan dengan penuh keikhlasan</p>
            </div>
            
            <div className="flex items-center gap-2">
              {lastRead && (
                <Link 
                  href={`/surah/${lastRead.surahId}?ayat=${lastRead.ayatNumber}`}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-1.5 hover:bg-emerald-100 transition"
                >
                  <FaBookmark className="w-3.5 h-3.5" />
                  Lanjut Baca
                </Link>
              )}
              
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-1.5">
                <FaBook className="w-3.5 h-3.5" />
                {surahs.length} Surat
              </span>
            </div>
          </div>

          {/* Status & Search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari surat atau arti..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 flex items-center justify-center gap-2 transition"
              >
                {sortOrder === 'asc' ? <FaSortAmountDown /> : <FaSortAmountUp />}
                <span>Urutkan</span>
              </button>
              
              {!isOnline && (
                <button
                  onClick={handleRetry}
                  className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center justify-center gap-2 transition"
                >
                  <FaSync className="w-4 h-4" />
                  <span>Coba Lagi</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Offline Warning */}
          {!isOnline && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
              <FaCloud className="w-5 h-5 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm text-amber-800">
                  <span className="font-medium">Mode offline aktif.</span> Anda melihat data yang tersimpan. 
                  Beberapa fitur mungkin terbatas.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Surah List */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {sortedSurahs.map((surah) => {
            const isCached = surahs.some(s => s.nomor === surah.nomor);
            
            return (
              <motion.div key={surah.nomor} variants={itemVariants}>
                <div className="group relative">
                  {/* Share Button */}
                  <button
                    onClick={() => handleShareSurah(surah)}
                    className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  
                  {/* Cache Indicator */}
                  {isCached && (
                    <div className="absolute top-3 left-3 z-10">
                      <div className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium flex items-center gap-1">
                        <FaCloud className="w-3 h-3" />
                        <span>Tersimpan</span>
                      </div>
                    </div>
                  )}
                  
                  <Link href={`/surah/${surah.nomor}`}>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-md transition-all duration-200 cursor-pointer">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{surah.nomor}</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 transition">
                              {surah.namaLatin}
                            </h3>
                            <p className="text-xs text-gray-500">{surah.arti}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-arabic font-medium text-gray-800 mb-1">{surah.nama}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5">
                            <FaHashtag className="w-3.5 h-3.5" />
                            {surah.jumlahAyat} ayat
                          </span>
                          <span className="flex items-center gap-1.5">
                            <FaMapMarkerAlt className="w-3.5 h-3.5" />
                            {surah.tempatTurun}
                          </span>
                        </div>
                        <FaArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition transform group-hover:translate-x-1" />
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {surah.deskripsi.replace(/<[^>]*>/g, '')}
                        </p>
                      </div>
                    </div>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {sortedSurahs.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <FaSearch className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ditemukan</h3>
            <p className="text-gray-600">Tidak ada surat yang sesuai dengan pencarian "{search}"</p>
            {!isOnline && (
              <p className="text-sm text-amber-600 mt-2">
                Coba nyalakan koneksi internet untuk data lengkap
              </p>
            )}
          </div>
        )}
      </div>

      {/* CSS for Arabic Font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        .font-arabic {
          font-family: 'Amiri', serif;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}