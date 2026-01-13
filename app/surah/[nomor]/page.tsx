'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  FaArrowLeft, 
  FaBook, 
  FaHashtag, 
  FaMapMarkerAlt, 
  FaPlay, 
  FaPause,
  FaShareAlt,
  FaBookmark,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaInfoCircle,
  FaCloud,
  FaDownload,
  FaCheck,
  FaRegBookmark,
  FaRegCopy,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { db, SurahDetail, ReadingProgress } from '@/lib/db';

interface Ayat {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
  audio: Record<string, string>;
}

interface Tafsir {
  ayat: number;
  teks: string;
}

export default function SurahDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [surah, setSurah] = useState<SurahDetail | null>(null);
  const [tafsir, setTafsir] = useState<Tafsir[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAyat, setCurrentAyat] = useState(0);
  const [showTafsir, setShowTafsir] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [isSurahCached, setIsSurahCached] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineWarning, setOfflineWarning] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const [cachedAyat, setCachedAyat] = useState<number[]>([]);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineWarning(false);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setOfflineWarning(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (params.nomor) {
      const ayatFromUrl = searchParams.get('ayat');
      if (ayatFromUrl) {
        setCurrentAyat(parseInt(ayatFromUrl) - 1);
      }
      fetchSurah();
      fetchTafsir();
      checkBookmarkStatus();
      checkCachedAyat();
    }
  }, [params.nomor]);

  const fetchSurah = async () => {
    try {
      setLoading(true);
      
      // SELALU ambil dari cache terlebih dahulu
      const cachedSurah = await db.surahDetail
        .where('nomor')
        .equals(Number(params.nomor))
        .first();
      
      if (cachedSurah) {
        setSurah(cachedSurah);
        setIsSurahCached(true);
        if (cachedSurah.audioFull) {
          const firstQari = Object.values(cachedSurah.audioFull)[0];
          if (firstQari) setAudioUrl(firstQari as string);
        }
        
        // Jika sudah ada di cache, tetap loading = false
        if (!isOnline) {
          setLoading(false);
          return;
        }
      }
  
      // Jika online, fetch data terbaru sebagai update
      if (isOnline) {
        try {
          const response = await fetch(
            `https://api.devnova.icu/api/islamic/al-quran/${params.nomor}?language=id`
          );
          
          if (response.status === 200) {
            const apiData = await response.json();
            
            if (apiData.code === 200) {
              setSurah(apiData.data);
              setIsSurahCached(true);
              if (apiData.data.audioFull) {
                const firstQari = Object.values(apiData.data.audioFull)[0];
                if (firstQari) setAudioUrl(firstQari as string);
              }
              
              // Simpan/update ke cache
              try {
                await db.surahDetail.put({
                  ...apiData.data,
                  id: apiData.data.nomor,
                  updatedAt: new Date()
                });
              } catch (cacheError) {
                console.error('Error saving to cache:', cacheError);
              }
            }
          }
        } catch (fetchError) {
          console.error('Error fetching from API:', fetchError);
          // Tetap gunakan cache jika gagal fetch
          if (!cachedSurah) {
            throw new Error('Cannot fetch data');
          }
        }
      } else if (!cachedSurah) {
        throw new Error('Data tidak tersedia offline');
      }
    } catch (error) {
      console.error('Error fetching surah:', error);
      setOfflineWarning(true);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTafsir = async () => {
    try {
      // 1. SELALU ambil dari IndexedDB terlebih dahulu
      const cachedTafsir = await db.getTafsir(Number(params.nomor));
      
      // FIXED: cachedTafsir sekarang selalu array, tidak perlu cek type
      if (cachedTafsir && cachedTafsir.length > 0) {
        const formattedTafsir = cachedTafsir.map(t => ({
          ayat: t.ayat,
          teks: t.teks
        }));
        setTafsir(formattedTafsir);
      }
  
      // 2. Jika online, fetch data terbaru dan update cache
      if (isOnline) {
        const response = await fetch(
          `https://api.devnova.icu/api/islamic/al-quran/${params.nomor}/tafsir`
        );
        const data = await response.json();
        if (data.code === 200) {
          const newTafsir = data.data.tafsir || [];
          setTafsir(newTafsir);
          
          // Simpan tafsir baru ke IndexedDB
          if (newTafsir.length > 0) {
            for (const tafsirAyat of newTafsir) {
              await db.saveTafsir(
                Number(params.nomor),
                tafsirAyat.ayat,
                tafsirAyat.teks
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tafsir:', error);
    }
  };

  const checkBookmarkStatus = async () => {
    try {
      const progress = await db.getReadingProgress(Number(params.nomor));
      setIsBookmarked(!!progress && !progress.completed);
    } catch (error) {
      console.error('Error checking bookmark:', error);
    }
  };

  const checkCachedAyat = async () => {
    try {
      const cachedSurah = await db.surahDetail
        .where('nomor')
        .equals(Number(params.nomor))
        .first();
      
      if (cachedSurah) {
        const ayatNumbers = cachedSurah.ayat.map(a => a.nomorAyat);
        setCachedAyat(ayatNumbers);
      }
    } catch (error) {
      console.error('Error checking cached ayat:', error);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd || !surah) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      if (currentAyat < surah.jumlahAyat - 1) {
        const newAyatIndex = currentAyat + 1;
        setCurrentAyat(newAyatIndex);
        saveReadingProgress(newAyatIndex + 1);
      } else if (surah.suratSelanjutnya && typeof surah.suratSelanjutnya !== 'boolean') {
        router.push(`/surah/${surah.suratSelanjutnya.nomor}`);
      }
    }

    if (isRightSwipe) {
      if (currentAyat > 0) {
        const newAyatIndex = currentAyat - 1;
        setCurrentAyat(newAyatIndex);
        saveReadingProgress(newAyatIndex + 1);
      } else if (surah.suratSebelumnya) {
        router.push(`/surah/${surah.suratSebelumnya.nomor}`);
      }
    }
  }, [touchStart, touchEnd, currentAyat, surah, router]);

  const saveReadingProgress = useCallback(async (ayatNumber: number) => {
    if (!surah) return;
    
    try {
      await db.saveReadingProgress(
        surah.nomor,
        surah.namaLatin,
        ayatNumber
      );
      setIsBookmarked(true);
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [surah]);

  const handlePlayAudio = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        if (!isOnline) {
          alert('Audio tidak tersedia offline. Mohon nyalakan internet untuk mendengarkan.');
        }
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleAyatClick = (index: number) => {
    setCurrentAyat(index);
    saveReadingProgress(index + 1);
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBookmark = async () => {
    if (isBookmarked) {
      await db.readingProgress
        .where('surahId')
        .equals(surah!.nomor)
        .delete();
      setIsBookmarked(false);
    } else {
      await saveReadingProgress(currentAyat + 1);
    }
  };

  const handleCacheFullSurah = async () => {
    if (!surah || !isOnline) return;
    
    setIsCaching(true);
    try {
      // Download tafsir lengkap jika belum ada
      if (tafsir.length === 0) {
        await fetchTafsir();
      }
      
      // Pre-cache audio untuk surah ini
      if (surah.audioFull) {
        const cache = await caches.open('quran-audio-cache');
        for (const [key, audioUrl] of Object.entries(surah.audioFull)) {
          try {
            const response = await fetch(audioUrl);
            if (response.status === 200) {
              await cache.put(audioUrl, response);
            }
          } catch (error) {
            console.error(`Error caching audio ${key}:`, error);
          }
        }
      }
      
      // Tampilkan feedback sukses
      const event = new CustomEvent('showToast', {
        detail: {
          message: `Surah ${surah.namaLatin} telah di-cache sepenuhnya!`,
          type: 'success'
        }
      });
      window.dispatchEvent(event);
      
    } catch (error) {
      console.error('Error caching surah:', error);
    } finally {
      setIsCaching(false);
    }
  };

  const handleShare = async () => {
    if (!surah) return;
    
    setIsSharing(true);
    const ayat = surah.ayat[currentAyat];
    
    const shareData = {
      title: `${surah.namaLatin} Ayat ${ayat.nomorAyat} - quranku`,
      text: `${ayat.teksArab}\n\n${ayat.teksIndonesia}\n\n— ${surah.namaLatin} (${surah.arti}) Ayat ${ayat.nomorAyat}\n\nBaca di quranku`,
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `${shareData.text}\n\n${shareData.url}`
        );
        
        // Tampilkan feedback toast
        const event = new CustomEvent('showToast', {
          detail: {
            message: 'Ayat telah disalin ke clipboard!',
            type: 'success'
          }
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyAyat = async () => {
    if (!surah) return;
    
    const ayat = surah.ayat[currentAyat];
    const textToCopy = `${ayat.teksArab}\n\n${ayat.teksIndonesia}\n\n— ${surah.namaLatin} Ayat ${ayat.nomorAyat}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      
      // Tampilkan feedback visual
      const copyButton = document.querySelector('[title="Salin ayat"]');
      if (copyButton) {
        const originalIcon = copyButton.querySelector('.copy-icon');
        if (originalIcon) {
          const originalHTML = originalIcon.innerHTML;
          originalIcon.innerHTML = '<FaCheck className="w-4 h-4" />';
          
          setTimeout(() => {
            originalIcon.innerHTML = originalHTML;
          }, 2000);
        }
      }
      
      const event = new CustomEvent('showToast', {
        detail: {
          message: 'Ayat berhasil disalin!',
          type: 'success'
        }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error copying text:', error);
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const currentTafsir = tafsir.find(t => t.ayat === currentAyat + 1);

  if (loading) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 bg-emerald-100 rounded w-32 mb-6 animate-pulse" />
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-6 bg-emerald-100 rounded w-48 mb-4" />
            <div className="h-4 bg-emerald-100 rounded w-32 mb-6" />
            <div className="h-64 bg-emerald-100 rounded mb-6" />
            <div className="h-8 bg-emerald-100 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!surah) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <FaCloud className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Data Tidak Tersedia</h3>
            <p className="text-gray-600 mb-4">
              {isOnline 
                ? 'Terjadi kesalahan saat memuat data.' 
                : 'Anda sedang offline dan data ini belum tersimpan.'}
            </p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-4xl mx-auto">
        {/* Offline Warning */}
        <AnimatePresence>
          {offlineWarning && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-4 pt-4"
            >
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
                <FaExclamationTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">Mode offline aktif.</span> Anda melihat data yang tersimpan.
                  </p>
                </div>
                <button
                  onClick={() => setOfflineWarning(false)}
                  className="text-amber-600 hover:text-amber-800"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-emerald-50 to-emerald-50/95 backdrop-blur-sm pt-4 pb-3 px-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-emerald-100 transition flex items-center gap-2 text-emerald-700"
            >
              <FaArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Kembali</span>
            </button>

            <div className="flex items-center gap-1">
              {!isOnline && isSurahCached && (
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700" title="Tersedia offline">
                  <FaCheckCircle className="w-5 h-5" />
                </div>
              )}
              
              {isOnline && (
                <button
                  onClick={handleCacheFullSurah}
                  disabled={isCaching}
                  className="p-2 rounded-lg hover:bg-emerald-100 transition text-emerald-700 disabled:opacity-50"
                  title="Simpan lengkap untuk offline"
                >
                  {isCaching ? (
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FaDownload className="w-5 h-5" />
                  )}
                </button>
              )}
              
              <button
                onClick={handleCopyAyat}
                className="p-2 rounded-lg hover:bg-emerald-100 transition text-emerald-700"
                title="Salin ayat"
              >
                <div className="copy-icon">
                  <FaRegCopy className="w-5 h-5" />
                </div>
              </button>
              
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-2 rounded-lg hover:bg-emerald-100 transition text-emerald-700"
              >
                <FaInfoCircle className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleBookmark}
                className={`p-2 rounded-lg transition ${
                  isBookmarked 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'hover:bg-emerald-100 text-emerald-700'
                }`}
              >
                {isBookmarked ? (
                  <FaBookmark className="w-5 h-5" />
                ) : (
                  <FaRegBookmark className="w-5 h-5" />
                )}
              </button>
              
              <button 
                onClick={handleShare}
                disabled={isSharing}
                className="p-2 rounded-lg hover:bg-emerald-100 transition text-emerald-700 disabled:opacity-50"
              >
                <FaShareAlt className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Surah Info */}
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-emerald-900">{surah.namaLatin}</h1>
            <div className="text-lg font-arabic font-medium text-gray-800 mt-1 mb-2">{surah.nama}</div>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <FaHashtag className="w-3.5 h-3.5" />
                {surah.jumlahAyat} ayat
              </span>
              <span className="flex items-center gap-1.5">
                <FaMapMarkerAlt className="w-3.5 h-3.5" />
                {surah.tempatTurun}
              </span>
              <span className="flex items-center gap-1.5">
                <FaBook className="w-3.5 h-3.5" />
                {surah.arti}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Ayat {currentAyat + 1} dari {surah.jumlahAyat}</span>
              <span>{Math.round(((currentAyat + 1) / surah.jumlahAyat) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                initial={{ width: 0 }}
                animate={{ width: `${((currentAyat + 1) / surah.jumlahAyat) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Surah Info Modal */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed inset-x-4 top-24 z-50"
            >
              <div className="bg-white rounded-xl shadow-xl border border-emerald-100 p-4 max-w-md mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-emerald-900">Informasi Surat</h3>
                  <button
                    onClick={() => setShowInfo(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 transition"
                  >
                    <FaTimes className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {surah.deskripsi.replace(/<[^>]*>/g, '')}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Status:</span>
                    <span className={`font-medium ${isSurahCached ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {isSurahCached ? '✓ Tersimpan offline' : 'Hanya online'}
                    </span>
                  </div>
                  {cachedAyat.length > 0 && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">Ayat tersimpan:</span>
                      <span className="font-medium text-emerald-600 ml-2">
                        {cachedAyat.length} dari {surah.jumlahAyat}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div
          ref={containerRef}
          className="px-4 pb-6"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Ayat Display */}
          <motion.div
            key={currentAyat}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ 
              type: 'spring',
              stiffness: 300,
              damping: 25
            }}
            className="bg-white rounded-2xl shadow-lg border border-emerald-100 p-6 mb-6"
          >
            {/* Ayat Number */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{currentAyat + 1}</span>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Ayat ke</div>
                  <div className="font-medium text-gray-900">{currentAyat + 1}</div>
                </div>
              </div>

              <button
                onClick={handlePlayAudio}
                disabled={!audioUrl}
                className="p-3 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlaying ? (
                  <FaPause className="w-4 h-4" />
                ) : (
                  <FaPlay className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Arabic Text */}
            <div className="mb-8">
              <div className="text-3xl font-arabic text-right leading-relaxed text-gray-900 mb-4">
                {surah.ayat[currentAyat]?.teksArab}
              </div>
              <div className="text-sm text-emerald-700 font-medium text-center">
                {surah.ayat[currentAyat]?.teksLatin}
              </div>
            </div>

            {/* Translation */}
            <div className="border-t border-gray-100 pt-6">
              <div className="text-sm text-gray-500 mb-2">Terjemahan:</div>
              <p className="text-gray-800 leading-relaxed text-sm">
                {surah.ayat[currentAyat]?.teksIndonesia}
              </p>
            </div>

            {/* Tafsir Toggle */}
            {currentTafsir && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <button
                  onClick={() => setShowTafsir(!showTafsir)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div className="text-sm font-medium text-emerald-700">Tafsir Ayat</div>
                  <motion.div
                    animate={{ rotate: showTafsir ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FaChevronRight className="w-4 h-4 text-emerald-500" />
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {showTafsir && currentTafsir && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {currentTafsir.teks}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                if (currentAyat > 0) {
                  const newAyatIndex = currentAyat - 1;
                  setCurrentAyat(newAyatIndex);
                  saveReadingProgress(newAyatIndex + 1);
                } else if (surah.suratSebelumnya) {
                  router.push(`/surah/${surah.suratSebelumnya.nomor}`);
                }
              }}
              disabled={currentAyat === 0 && !surah.suratSebelumnya}
              className="px-4 py-2.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <FaChevronLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Sebelumnya</span>
            </button>

            <button
              onClick={() => {
                if (currentAyat < surah.jumlahAyat - 1) {
                  const newAyatIndex = currentAyat + 1;
                  setCurrentAyat(newAyatIndex);
                  saveReadingProgress(newAyatIndex + 1);
                } else if (surah.suratSelanjutnya && typeof surah.suratSelanjutnya !== 'boolean') {
                  router.push(`/surah/${surah.suratSelanjutnya.nomor}`);
                }
              }}
              disabled={currentAyat === surah.jumlahAyat - 1 && (!surah.suratSelanjutnya || surah.suratSelanjutnya === true)}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <span className="text-sm font-medium">Selanjutnya</span>
              <FaChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Ayat List */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Daftar Ayat</h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {surah.ayat.map((ayat, index) => (
                <button
                  key={ayat.nomorAyat}
                  onClick={() => handleAyatClick(index)}
                  className={`p-2 rounded-lg text-center transition relative ${
                    index === currentAyat
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  } ${cachedAyat.includes(ayat.nomorAyat) ? 'ring-1 ring-emerald-300' : ''}`}
                >
                  <span className="text-xs font-medium">{ayat.nomorAyat}</span>
                  {isBookmarked && index === currentAyat && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-300 rounded-full" />
                  )}
                  {cachedAyat.includes(ayat.nomorAyat) && (
                    <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-emerald-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Swipe Hint */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200">
              <span className="flex items-center gap-1">
                <FaChevronLeft className="w-3 h-3" />
                Swipe kiri
              </span>
              <span className="text-gray-300">•</span>
              <span>Ayat berikutnya</span>
              <span className="text-gray-300">•</span>
              <span className="flex items-center gap-1">
                Swipe kanan
                <FaChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={(e) => {
          console.error('Audio error:', e);
          if (!isOnline) {
            setIsPlaying(false);
          }
        }}
      />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        .font-arabic {
          font-family: 'Amiri', serif;
          line-height: 2.2;
        }
      `}</style>
    </div>
  );
}