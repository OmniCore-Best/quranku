'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FaArrowLeft, 
  FaArrowRight, 
  FaPlay, 
  FaPause, 
  FaVolumeUp, 
  FaVolumeMute,
  FaShareAlt,
  FaBookmark,
  FaBook,
  FaPray,
  FaTimes,
  FaExpand,
  FaCompress,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { HiMiniSpeakerWave, HiMiniSpeakerXMark } from 'react-icons/hi2';
import * as quranTajweed from '@kmaslesa/tajweed';

interface Ayat {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
  audio: {
    [key: string]: string;
  };
}

interface SurahDetail {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
  audioFull: {
    [key: string]: string;
  };
  ayat: Ayat[];
  suratSebelumnya?: {
    nomor: number;
    nama: string;
    namaLatin: string;
  };
  suratSelanjutnya?: {
    nomor: number;
    nama: string;
    namaLatin: string;
  } | boolean;
}

interface Tafsir {
  ayat: number;
  teks: string;
}

// Konstanta untuk mapping surah ke indeks
// Ini adalah jumlah kumulatif ayat sebelum setiap surah
// Indeks untuk surah ke-N = jumlah ayat dari surah 1 sampai N-1
const VERSE_OFFSETS = [
  0,     // Surah 1 (Al-Fatihah) mulai dari indeks 0
  7,     // Setelah Al-Fatihah (7 ayat)
  293,   // +286 = 293
  493,   // +200 = 493
  669,   // +176 = 669
  789,   // +120 = 789
  954,   // +165 = 954
  1160,  // +206 = 1160
  1235,  // +75 = 1235
  1364,  // +129 = 1364
  1473,  // +109 = 1473
  1596,  // +123 = 1596
  1707,  // +111 = 1707
  1750,  // +43 = 1750
  1802,  // +52 = 1802
  1901,  // +99 = 1901
  2029,  // +128 = 2029
  2140,  // +111 = 2140
  2250,  // +110 = 2250
  2348,  // +98 = 2348
  2483,  // +135 = 2483
  2595,  // +112 = 2595
  2673,  // +78 = 2673
  2791,  // +118 = 2791
  2855,  // +64 = 2855
  2932,  // +77 = 2932
  3159,  // +227 = 3159
  3252,  // +93 = 3252
  3340,  // +88 = 3340
  3409,  // +69 = 3409
  3469,  // +60 = 3469
  3503,  // +34 = 3503
  3533,  // +30 = 3533
  3606,  // +73 = 3606
  3660,  // +54 = 3660
  3705,  // +45 = 3705
  3788,  // +83 = 3788
  3970,  // +182 = 3970
  4058,  // +88 = 4058
  4133,  // +75 = 4133
  4218,  // +85 = 4218
  4272,  // +54 = 4272
  4325,  // +53 = 4325
  4414,  // +89 = 4414
  4473,  // +59 = 4473
  4510,  // +37 = 4510
  4545,  // +35 = 4545
  4583,  // +38 = 4583
  4612,  // +29 = 4612
  4630,  // +18 = 4630
  4675,  // +45 = 4675
  4735,  // +60 = 4735
  4784,  // +49 = 4784
  4846,  // +62 = 4846
  4901,  // +55 = 4901
  4979,  // +78 = 4979
  5075,  // +96 = 5075
  5104,  // +29 = 5104
  5126,  // +22 = 5126
  5150,  // +24 = 5150
  5163,  // +13 = 5163
  5177,  // +14 = 5177
  5188,  // +11 = 5188
  5199,  // +11 = 5199
  5217,  // +18 = 5217
  5229,  // +12 = 5229
  5241,  // +12 = 5241
  5271,  // +30 = 5271
  5323,  // +52 = 5323
  5375,  // +52 = 5375
  5419,  // +44 = 5419
  5447,  // +28 = 5447
  5475,  // +28 = 5475
  5495,  // +20 = 5495
  5551,  // +56 = 5551
  5591,  // +40 = 5591
  5622,  // +31 = 5622
  5672,  // +50 = 5672
  5712,  // +40 = 5712
  5758,  // +46 = 5758
  5800,  // +42 = 5800
  5829,  // +29 = 5829
  5848,  // +19 = 5848
  5884,  // +36 = 5884
  5909,  // +25 = 5909
  5931,  // +22 = 5931
  5948,  // +17 = 5948
  5967,  // +19 = 5967
  5993,  // +26 = 5993
  6023,  // +30 = 6023
  6043,  // +20 = 6043
  6058,  // +15 = 6058
  6079,  // +21 = 6079
  6090,  // +11 = 6090
  6098,  // +8 = 6098
  6106,  // +8 = 6106
  6125,  // +19 = 6125
  6130,  // +5 = 6130
  6138,  // +8 = 6138
  6146,  // +8 = 6146
  6157,  // +11 = 6157
  6168,  // +11 = 6168
  6176,  // +8 = 6176
  6179,  // +3 = 6179
  6188,  // +9 = 6188
  6193,  // +5 = 6193
  6197,  // +4 = 6197
  6204,  // +7 = 6204
  6207,  // +3 = 6207
  6213,  // +6 = 6213
  6216,  // +3 = 6216
  6221,  // +5 = 6221
  6225,  // +4 = 6225
  6230,  // +5 = 6230
  6236   // +6 = 6236 (total ayat Al-Quran)
];

// Fungsi untuk mendapatkan indeks absolut berdasarkan nomor surah dan ayat
const getAbsoluteIndex = (surahNumber: number, verseNumber: number): number => {
  if (surahNumber < 1 || surahNumber > 114) {
    console.error('Surah number out of range');
    return 0;
  }
  
  const baseIndex = VERSE_OFFSETS[surahNumber - 1];
  if (verseNumber < 1) {
    console.error('Verse number must be at least 1');
    return baseIndex;
  }
  
  const absoluteIndex = baseIndex + (verseNumber - 1);
  
  // Validasi: pastikan indeks tidak melebihi total ayat
  if (absoluteIndex >= 6236) {
    console.warn(`Index ${absoluteIndex} exceeds total Quran verses (6236)`);
    return 6235; // Kembalikan indeks terakhir
  }
  
  return absoluteIndex;
};

export default function SurahDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [surah, setSurah] = useState<SurahDetail | null>(null);
  const [tafsir, setTafsir] = useState<Tafsir[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const [currentAyat, setCurrentAyat] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showTafsir, setShowTafsir] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [tajweedTexts, setTajweedTexts] = useState<{[key: number]: string}>({});
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  useEffect(() => {
    fetchSurahDetail();
  }, [params.nomor]);

  // Fungsi untuk memuat teks tajweed untuk setiap ayat
  useEffect(() => {
    if (!surah || !surah.ayat.length) return;
    
    const loadTajweedTexts = () => {
      const newTajweedTexts: {[key: number]: string} = {};
      
      surah.ayat.forEach((ayat) => {
        try {
          const absoluteIndex = getAbsoluteIndex(surah.nomor, ayat.nomorAyat);
          const tajweedText = quranTajweed.getAyahByIndex(absoluteIndex, true);
          newTajweedTexts[ayat.nomorAyat] = tajweedText || ayat.teksArab;
        } catch (error) {
          console.error(`Error loading tajweed for ayat ${ayat.nomorAyat}:`, error);
          newTajweedTexts[ayat.nomorAyat] = ayat.teksArab;
        }
      });
      
      setTajweedTexts(newTajweedTexts);
    };
    
    loadTajweedTexts();
  }, [surah]);

  const fetchSurahDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch surah detail
      const surahResponse = await fetch(
        `https://api.devnova.icu/api/islamic/al-quran/${params.nomor}?language=id`
      );
      const surahData = await surahResponse.json();
      
      if (surahData.code === 200) {
        setSurah(surahData.data);
        setCurrentAyat(1);
        
        // Fetch tafsir
        try {
          const tafsirResponse = await fetch(
            `https://api.devnova.icu/api/islamic/al-quran/${params.nomor}/tafsir`
          );
          const tafsirData = await tafsirResponse.json();
          if (tafsirData.code === 200) {
            setTafsir(tafsirData.data.tafsir || []);
          }
        } catch (tafsirError) {
          console.warn('Tidak bisa mengambil tafsir:', tafsirError);
        }
      } else {
        setError('Gagal mengambil data surat');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat mengambil data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = async (ayatNumber: number, audioUrl?: string) => {
    if (!audioUrl) return;
    
    if (audioRef.current) {
      if (playingAudio === ayatNumber) {
        audioRef.current.pause();
        setPlayingAudio(null);
      } else {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingAudio(ayatNumber);
        setCurrentAyat(ayatNumber);
        
        audioRef.current.onended = () => {
          setPlayingAudio(null);
          // Auto play next ayat
          if (surah && ayatNumber < surah.jumlahAyat) {
            const nextAyat = surah.ayat.find(a => a.nomorAyat === ayatNumber + 1);
            if (nextAyat) {
              setTimeout(() => {
                handlePlayAudio(nextAyat.nomorAyat, Object.values(nextAyat.audio)[0]);
              }, 500);
            }
          }
        };
      }
    }
  };

  const handlePlayFullSurah = () => {
    if (!surah) return;
    
    const audioUrl = Object.values(surah.audioFull)[0];
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setPlayingAudio(0);
      
      audioRef.current.onended = () => {
        setPlayingAudio(null);
      };
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!fullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    
    setFullscreen(!fullscreen);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || !surah) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && surah.suratSelanjutnya) {
      // Swipe left - next surah
      if (typeof surah.suratSelanjutnya === 'object') {
        router.push(`/surah/${surah.suratSelanjutnya.nomor}`);
      }
    } else if (isRightSwipe && surah.suratSebelumnya) {
      // Swipe right - previous surah
      router.push(`/surah/${surah.suratSebelumnya.nomor}`);
    }
  };

  const scrollToAyat = (ayatNumber: number) => {
    const element = document.getElementById(`ayat-${ayatNumber}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setCurrentAyat(ayatNumber);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-emerald-100 p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-700 font-medium">Memuat surat...</p>
          <p className="text-sm text-emerald-600 mt-2">Swipe kiri/kanan untuk navigasi antar surat</p>
        </div>
      </div>
    );
  }

  if (error || !surah) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-emerald-100 p-4">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">{error || 'Surat tidak ditemukan'}</h3>
          <Link
            href="/"
            className="inline-block mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            Kembali ke Daftar
          </Link>
        </div>
      </div>
    );
  }

  const getTafsirForAyat = (ayatNumber: number) => {
    return tafsir.find(t => t.ayat === ayatNumber);
  };

  return (
    <>
      <audio ref={audioRef} className="hidden" />
      
      <div 
        ref={containerRef}
        className={`min-h-screen bg-gradient-to-b from-emerald-50 to-emerald-100 pb-24 transition-all ${
          fullscreen ? 'fixed inset-0 z-50 bg-white' : ''
        }`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Navigation Controls */}
        <div className={`sticky top-0 z-40 bg-gradient-to-b from-emerald-600 to-emerald-700 text-white ${
          fullscreen ? 'hidden' : ''
        }`}>
          <div className="flex items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full"
            >
              <FaArrowLeft className="w-4 h-4" />
            </Link>
            
            <div className="text-center flex-1 px-4">
              <h1 className="font-bold text-lg">{surah.namaLatin}</h1>
              <p className="text-xs opacity-90">
                Surat ke-{surah.nomor} • {surah.jumlahAyat} ayat • {surah.tempatTurun}
              </p>
            </div>
            
            <button
              onClick={toggleFullscreen}
              className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full"
            >
              {fullscreen ? (
                <FaCompress className="w-4 h-4" />
              ) : (
                <FaExpand className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        
        {/* Surah Info */}
        <div className={`px-4 pt-4 ${fullscreen ? 'pt-8' : ''}`}>
          <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
            <div className="text-center mb-4">
              <div className="inline-block relative mb-3">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-3xl">{surah.nomor}</span>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow">
                  <span className="text-xs font-bold text-white">{surah.jumlahAyat}</span>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{surah.nama}</h2>
              <p className="text-emerald-600 font-medium">{surah.arti}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                  {surah.tempatTurun}
                </span>
                <span className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {surah.namaLatin}
                </span>
              </div>
            </div>
            
            <div className="border-t border-gray-100 pt-4">
              <p 
                className="text-sm text-gray-600 text-center leading-relaxed"
                dangerouslySetInnerHTML={{ __html: surah.deskripsi }}
              />
            </div>
          </div>
          
          {/* Quick Navigation */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-800">Navigasi Cepat</h3>
              <button
                onClick={() => setShowTafsir(!showTafsir)}
                className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full"
              >
                {showTafsir ? 'Sembunyikan Tafsir' : 'Tampilkan Tafsir'}
              </button>
            </div>
            
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePlayFullSurah}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                      playingAudio === 0
                        ? 'bg-red-100 text-red-600'
                        : 'bg-emerald-100 text-emerald-600'
                    }`}
                  >
                    {playingAudio === 0 ? (
                      <FaPause className="w-3 h-3" />
                    ) : (
                      <FaPlay className="w-3 h-3 ml-0.5" />
                    )}
                    <span className="text-xs font-medium">Play All</span>
                  </button>
                  
                  <button
                    onClick={toggleMute}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full"
                  >
                    {isMuted ? (
                      <HiMiniSpeakerXMark className="w-4 h-4 text-gray-600" />
                    ) : (
                      <HiMiniSpeakerWave className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  {surah.suratSebelumnya && (
                    <Link
                      href={`/surah/${surah.suratSebelumnya.nomor}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs"
                    >
                      <FaChevronLeft className="w-3 h-3" />
                      <span>{surah.suratSebelumnya.nomor}</span>
                    </Link>
                  )}
                  
                  {surah.suratSelanjutnya && typeof surah.suratSelanjutnya === 'object' && (
                    <Link
                      href={`/surah/${surah.suratSelanjutnya.nomor}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs"
                    >
                      <span>{surah.suratSelanjutnya.nomor}</span>
                      <FaChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
              
              {/* Ayat Navigation Dots */}
              <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                {Array.from({ length: Math.min(surah.jumlahAyat, 30) }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    onClick={() => scrollToAyat(num)}
                    className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
                      currentAyat === num
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                {surah.jumlahAyat > 30 && (
                  <span className="text-xs text-gray-500 self-center">...</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Ayat List */}
          <div className="space-y-4 mb-8">
            <h3 className="font-bold text-gray-800">Ayat-Ayat</h3>
            
            {surah.ayat.map((ayat) => {
              const ayatTafsir = getTafsirForAyat(ayat.nomorAyat);
              const arabicTextWithTajweed = tajweedTexts[ayat.nomorAyat] || ayat.teksArab;
              
              return (
                <div
                  key={ayat.nomorAyat}
                  id={`ayat-${ayat.nomorAyat}`}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
                >
                  {/* Ayat Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold">{ayat.nomorAyat}</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Ayat {ayat.nomorAyat}</h4>
                        <p className="text-xs text-gray-500">Dengarkan dan baca</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handlePlayAudio(ayat.nomorAyat, Object.values(ayat.audio)[0])}
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        playingAudio === ayat.nomorAyat
                          ? 'bg-red-100 text-red-600'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}
                    >
                      {playingAudio === ayat.nomorAyat ? (
                        <FaPause className="w-4 h-4" />
                      ) : (
                        <FaPlay className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                  </div>
                  
                  {/* Arabic Text with Tajweed */}
                  <div className="mb-4">
                    {/* Menggunakan dangerouslySetInnerHTML untuk menampilkan HTML dari tajweed */}
                    <div 
                      className="text-right leading-loose text-2xl font-arabic mb-3 quran-text"
                      dangerouslySetInnerHTML={{ __html: arabicTextWithTajweed }}
                    />
                    
                    {/* Latin Text */}
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 italic leading-relaxed">
                        {ayat.teksLatin}
                      </p>
                    </div>
                    
                    {/* Translation */}
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {ayat.teksIndonesia}
                      </p>
                    </div>
                  </div>
                  
                  {/* Tafsir (if available and shown) */}
                  {showTafsir && ayatTafsir && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <FaBook className="w-4 h-4 text-purple-600" />
                        <h5 className="font-bold text-purple-700 text-sm">Tafsir Ayat {ayat.nomorAyat}</h5>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {ayatTafsir.teks}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Navigation Footer */}
          <div className="fixed bottom-20 left-0 right-0 z-30 px-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  {surah.suratSebelumnya ? (
                    <Link
                      href={`/surah/${surah.suratSebelumnya.nomor}`}
                      className="flex items-center gap-3 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl flex-1 text-center justify-center"
                    >
                      <FaChevronLeft className="w-4 h-4" />
                      <div className="text-left">
                        <p className="text-xs text-emerald-600">Sebelumnya</p>
                        <p className="font-bold">{surah.suratSebelumnya.namaLatin}</p>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex-1"></div>
                  )}
                  
                  <div className="px-4 text-center">
                    <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <span className="text-white font-bold">{surah.nomor}</span>
                    </div>
                  </div>
                  
                  {surah.suratSelanjutnya && typeof surah.suratSelanjutnya === 'object' ? (
                    <Link
                      href={`/surah/${surah.suratSelanjutnya.nomor}`}
                      className="flex items-center gap-3 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl flex-1 text-center justify-center"
                    >
                      <div className="text-right">
                        <p className="text-xs text-emerald-600">Berikutnya</p>
                        <p className="font-bold">{surah.suratSelanjutnya.namaLatin}</p>
                      </div>
                      <FaChevronRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <div className="flex-1"></div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Swipe Instructions */}
          <div className="text-center text-xs text-gray-500 mt-8 pb-12">
            <p className="mb-1">
              <span className="inline-block px-2 py-1 bg-gray-100 rounded">← Swipe kanan</span>
              {' '}sebelumnya •{' '}
              <span className="inline-block px-2 py-1 bg-gray-100 rounded">Swipe kiri →</span>
              {' '}berikutnya
            </p>
            <p className="mt-2">Seperti membaca mushaf fisik</p>
          </div>
        </div>
      </div>
      
      {/* Styles for Tajweed */}
      <style jsx global>{`
        @font-face {
          font-family: 'Arabic';
          src: url('https://fonts.googleapis.com/css2?family=Amiri&display=swap');
        }
        
        .font-arabic {
          font-family: 'Amiri', serif;
          line-height: 2.5;
        }
        
        /* Tajweed styling */
        .quran-text tajweed {
          /* Warna dasar untuk semua tajweed */
          color: inherit;
        }
        
        /* Warna untuk berbagai jenis tajweed */
        .quran-text .madda-permissible {
          color: #059669; /* Emerald-600 */
          font-weight: bold;
        }
        
        .quran-text .madda-necessary {
          color: #DC2626; /* Red-600 */
          font-weight: bold;
        }
        
        .quran-text .ghunnah {
          color: #7C3AED; /* Violet-600 */
          text-decoration: underline;
        }
        
        .quran-text .qalqalah {
          color: #D97706; /* Amber-600 */
          font-weight: bold;
        }
        
        .quran-text .ikhfa {
          color: #0891B2; /* Cyan-600 */
        }
        
        .quran-text .idgham {
          color: #9333EA; /* Purple-600 */
        }
        
        .quran-text .iqlab {
          color: #0284C7; /* Sky-600 */
        }
        
        /* Swipe animation */
        .swipe-hint {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        /* Fullscreen styles */
        :fullscreen {
          background: white;
        }
      `}</style>
    </>
  );
}