'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  FaInfoCircle
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface Ayat {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
  audio: Record<string, string>;
}

interface SurahDetail {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
  audioFull: Record<string, string>;
  ayat: Ayat[];
  suratSebelumnya?: {
    nomor: number;
    nama: string;
    namaLatin: string;
    jumlahAyat: number;
  };
  suratSelanjutnya?: {
    nomor: number;
    nama: string;
    namaLatin: string;
    jumlahAyat: number;
  } | boolean;
}

interface Tafsir {
  ayat: number;
  teks: string;
}

export default function SurahDetailPage() {
  const params = useParams();
  const router = useRouter();
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
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  useEffect(() => {
    if (params.nomor) {
      fetchSurah();
      fetchTafsir();
    }
  }, [params.nomor]);

  const fetchSurah = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.devnova.icu/api/islamic/al-quran/${params.nomor}?language=id`
      );
      const data = await response.json();
      if (data.code === 200) {
        setSurah(data.data);
        setCurrentAyat(0);
        if (data.data.audioFull) {
          const firstQari = Object.values(data.data.audioFull)[0];
          if (firstQari) setAudioUrl(firstQari as string);
        }
      }
    } catch (error) {
      console.error('Error fetching surah:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTafsir = async () => {
    try {
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
        setCurrentAyat(prev => prev + 1);
      } else if (surah.suratSelanjutnya && typeof surah.suratSelanjutnya !== 'boolean') {
        // Pindah ke surat berikutnya
        router.push(`/surah/${surah.suratSelanjutnya.nomor}`);
      }
    }

    if (isRightSwipe) {
      // Swipe kanan: ayat sebelumnya
      if (currentAyat > 0) {
        setCurrentAyat(prev => prev - 1);
      } else if (surah.suratSebelumnya) {
        // Pindah ke surat sebelumnya
        router.push(`/surah/${surah.suratSebelumnya.nomor}`);
      }
    }
  }, [touchStart, touchEnd, currentAyat, surah, router]);

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
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentTafsir = tafsir.find(t => t.ayat === currentAyat + 1);

  if (loading || !surah) {
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
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-2 rounded-lg hover:bg-emerald-100 transition text-emerald-700"
              >
                <FaInfoCircle className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg hover:bg-emerald-100 transition text-emerald-700">
                <FaBookmark className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg hover:bg-emerald-100 transition text-emerald-700">
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
                  setCurrentAyat(prev => prev - 1);
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
                  setCurrentAyat(prev => prev + 1);
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
                  className={`p-2 rounded-lg text-center transition ${
                    index === currentAyat
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="text-xs font-medium">{ayat.nomorAyat}</span>
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