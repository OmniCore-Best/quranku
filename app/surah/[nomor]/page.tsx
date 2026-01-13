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
  FaRegCopy
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
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
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
    }
  }, [params.nomor]);

  const fetchSurah = async () => {
    try {
      setLoading(true);
      
      // Coba ambil dari cache
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
      }
  
      // Jika online, fetch data terbaru
      if (isOnline) {
        const response = await fetch(
          `https://api.devnova.icu/api/islamic/al-quran/${params.nomor}?language=id`
        );
        const apiData = await response.json(); // Ganti nama variabel dari data ke apiData
        
        if (apiData.code === 200) {
          setSurah(apiData.data);
          setIsSurahCached(true);
          if (apiData.data.audioFull) {
            const firstQari = Object.values(apiData.data.audioFull)[0];
            if (firstQari) setAudioUrl(firstQari as string);
          }
          
          // Simpan ke cache
          try {
            await db.surahDetail.put({
              ...apiData.data, // Gunakan apiData.data
              id: apiData.data.nomor,
              updatedAt: new Date()
            });
          } catch (cacheError) {
            console.error('Error saving to cache:', cacheError);
          }
        }
      } else if (!cachedSurah) {
        // Offline dan tidak ada cache
        throw new Error('Data tidak tersedia offline');
      }
    } catch (error) {
      console.error('Error fetching surah:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTafsir = async () => {
    try {
      if (!isOnline) return;
      
      const response = await fetch(
        `https://api.devnova.icu/api/islamic/al-quran/${params.nomor}/tafsir`
      );
      const data = await response.json();
      if (data.code === 200) {
        setTafsir(data.data.tafsir || []);
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
      // Swipe kiri: ayat berikutnya
      if (currentAyat < surah.jumlahAyat - 1) {
        const newAyatIndex = currentAyat + 1;
        setCurrentAyat(newAyatIndex);
        saveReadingProgress(newAyatIndex + 1); // Perbaikan di sini
      } else if (surah.suratSelanjutnya && typeof surah.suratSelanjutnya !== 'boolean') {
        // Pindah ke surat berikutnya
        router.push(`/surah/${surah.suratSelanjutnya.nomor}`);
      }
    }

    if (isRightSwipe) {
      // Swipe kanan: ayat sebelumnya
      if (currentAyat > 0) {
        const newAyatIndex = currentAyat - 1;
        setCurrentAyat(newAyatIndex);
        saveReadingProgress(newAyatIndex + 1); // Perbaikan di sini
      } else if (surah.suratSebelumnya) {
        // Pindah ke surat sebelumnya
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
      audioRef.current.play();
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
      // Remove bookmark
      await db.readingProgress
        .where('surahId')
        .equals(surah!.nomor)
        .delete();
      setIsBookmarked(false);
    } else {
      // Add bookmark
      await saveReadingProgress(currentAyat + 1);
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
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(
          `${shareData.text}\n\n${shareData.url}`
        );
        alert('Ayat telah disalin ke clipboard!');
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
      
      // Show temporary success feedback
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
    } catch (error) {
      console.error('Error copying text:', error);
      // Fallback untuk browser yang tidak support clipboard
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleCacheSurah = async () => {
    if (!surah || !isOnline) return;
    
    try {
      // Simpan ke cache jika belum tersimpan
      if (!isSurahCached) {
        await db.surahDetail.put({
          ...surah,
          id: surah.nomor,
          updatedAt: new Date()
        });
        setIsSurahCached(true);
      }
      
      // Download tafsir juga
      if (tafsir.length === 0) {
        await fetchTafsir();
      }
    } catch (error) {
      console.error('Error caching surah:', error);
    }
  };

  const currentTafsir = tafsir.find(t => t.ayat === currentAyat + 1);

  if (loading) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-32 mb-6 animate-pulse" />
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
            <div className="h-4 bg-gray-200 rounded w-32 mb-6" />
            <div className="h-64 bg-gray-200 rounded mb-6" />
            <div className="h-8 bg-gray-200 rounded w-full" />
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

            <div className="flex items-center gap-2">
              {/* Cache Button */}
              {isOnline && !isSurahCached && (
                <button
                  onClick={handleCacheSurah}
                  className="p-2 rounded-lg hover:bg-emerald-100 transition text-emerald-700"
                  title="Simpan untuk offline"
                >
                  <FaDownload className="w-5 h-5" />
                </button>
              )}
              
              {isSurahCached && (
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <FaCloud className="w-5 h-5" />
                </div>
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
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content - Swipe Area */}
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
                className="p-3 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 transition shadow-md"
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
                  }`}
                >
                  <span className="text-xs font-medium">{ayat.nomorAyat}</span>
                  {isBookmarked && index === currentAyat && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-300 rounded-full" />
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
      />

      {/* CSS for Arabic Font */}
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