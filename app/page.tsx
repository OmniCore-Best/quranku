'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FaSearch, FaSortAmountDown, FaSortAmountUp, FaFilter, FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaDownload, FaBookOpen } from 'react-icons/fa';
import { HiMiniSpeakerWave, HiMiniSpeakerXMark } from 'react-icons/hi2';

interface Surah {
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
  englishNameTranslation?: string;
}

export default function QuranPage() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [filteredSurahs, setFilteredSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<'all' | 'mekah' | 'madinah'>('all');
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchSurahs();
  }, []);

  useEffect(() => {
    let filtered = [...surahs];
    
    // Filter berdasarkan pencarian
    if (search) {
      filtered = filtered.filter(surah =>
        surah.namaLatin.toLowerCase().includes(search.toLowerCase()) ||
        surah.arti.toLowerCase().includes(search.toLowerCase()) ||
        surah.nama.includes(search)
      );
    }
    
    // Filter berdasarkan tempat turun
    if (filterType !== 'all') {
      filtered = filtered.filter(surah =>
        surah.tempatTurun.toLowerCase().includes(filterType)
      );
    }
    
    // Sort berdasarkan nomor
    filtered.sort((a, b) => 
      sortOrder === 'asc' ? a.nomor - b.nomor : b.nomor - a.nomor
    );
    
    setFilteredSurahs(filtered);
  }, [surahs, search, sortOrder, filterType]);

  const fetchSurahs = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://api.devnova.icu/api/islamic/al-quran?language=id');
      const data = await response.json();
      
      if (data.code === 200) {
        setSurahs(data.data);
        setFilteredSurahs(data.data);
      } else {
        setError('Gagal mengambil data');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat mengambil data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = async (surahNumber: number, audioUrl: string) => {
    if (audioRef.current) {
      if (playingAudio === surahNumber) {
        audioRef.current.pause();
        setPlayingAudio(null);
      } else {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingAudio(surahNumber);
        
        audioRef.current.onended = () => {
          setPlayingAudio(null);
        };
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-emerald-700 font-medium">Memuat daftar surat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white p-4">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">{error}</h3>
          <button
            onClick={fetchSurahs}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <audio ref={audioRef} className="hidden" />
      
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-24">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-6 rounded-b-2xl shadow-lg">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold">Al-Quran Digital</h1>
                <p className="text-emerald-100 text-xs opacity-90">
                  {surahs.length} Surat • Lengkap dengan terjemahan
                </p>
              </div>
              <button
                onClick={toggleMute}
                className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full"
              >
                {isMuted ? (
                  <HiMiniSpeakerXMark className="w-5 h-5" />
                ) : (
                  <HiMiniSpeakerWave className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {/* Search and Controls */}
            <div className="space-y-3">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama surat atau arti..."
                  className="w-full pl-10 pr-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white placeholder-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-200 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-sm"
                >
                  {sortOrder === 'asc' ? <FaSortAmountDown /> : <FaSortAmountUp />}
                  <span>No. {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
                </button>
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="flex-1 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-sm focus:outline-none"
                >
                  <option value="all">Semua</option>
                  <option value="mekah">Mekah</option>
                  <option value="madinah">Madinah</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="px-4 -mt-4 max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-md p-4 mb-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-emerald-700">{surahs.length}</div>
                <div className="text-xs text-gray-600">Total Surat</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-700">
                  {surahs.filter(s => s.tempatTurun.toLowerCase().includes('mekah')).length}
                </div>
                <div className="text-xs text-gray-600">Makkiyah</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-700">
                  {surahs.filter(s => s.tempatTurun.toLowerCase().includes('madinah')).length}
                </div>
                <div className="text-xs text-gray-600">Madaniyah</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Surah List */}
        <div className="px-4 max-w-6xl mx-auto">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              Daftar Surat <span className="text-emerald-600">({filteredSurahs.length})</span>
            </h2>
            {filteredSurahs.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaSearch className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500">Surat tidak ditemukan</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSurahs.map((surah) => (
                  <div
                    key={surah.nomor}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">{surah.nomor}</span>
                          </div>
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                            <span className="text-[10px] font-bold text-emerald-700">{surah.jumlahAyat}</span>
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900">{surah.namaLatin}</h3>
                            <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                              {surah.tempatTurun}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{surah.arti}</p>
                          <p className="text-xs text-gray-500">{surah.nama}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const audioUrl = Object.values(surah.audioFull)[0];
                            handlePlayAudio(surah.nomor, audioUrl);
                          }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            playingAudio === surah.nomor
                              ? 'bg-red-100 text-red-600'
                              : 'bg-emerald-100 text-emerald-600'
                          }`}
                        >
                          {playingAudio === surah.nomor ? (
                            <FaPause className="w-4 h-4" />
                          ) : (
                            <FaPlay className="w-4 h-4 ml-0.5" />
                          )}
                        </button>
                        
                        <Link
                          href={`/surah/${surah.nomor}`}
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 hover:bg-blue-200 transition"
                        >
                          <FaBookOpen className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer Info */}
          <div className="mt-6 text-center text-xs text-gray-500 pb-8">
            <p>Data dari API DevNova • Audio dari equran.id</p>
            <p className="mt-1">Swipe kiri/kanan untuk navigasi saat membaca surat</p>
          </div>
        </div>
      </div>
    </>
  );
}