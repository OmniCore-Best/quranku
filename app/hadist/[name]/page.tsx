'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  FaArrowLeft,
  FaHashtag,
  FaShareAlt,
  FaCloud,
  FaSearch,
  FaTimes,
  FaSpinner,
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toBlob } from 'html-to-image';
import { toast } from 'sonner';
import { db } from '@/lib/db';

interface Hadith {
  number: number;
  arab: string;
  id: string;
}

interface BookDetail {
  name: string;
  id: string;
  available: number;
  requested?: number;
  hadiths: Hadith[];
}

export default function HadistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookId = params.name as string;
  const hadithNumber = searchParams.get('number');

  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sharingId, setSharingId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [allHadiths, setAllHadiths] = useState<Hadith[]>([]);

  // State untuk mode hadis tunggal
  const [singleHadith, setSingleHadith] = useState<Hadith | null>(null);
  const [isSingleMode, setIsSingleMode] = useState(false);

  // State untuk pencarian
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Hadith | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const itemsPerPage = 20;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);

  // Deteksi status online/offline
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

  // Fetch data berdasarkan mode
  useEffect(() => {
    if (!bookId) return;

    if (hadithNumber) {
      // Mode spesifik: ambil satu hadis
      fetchSingleHadith(parseInt(hadithNumber));
    } else {
      // Mode daftar: ambil data awal
      fetchInitialData();
    }
  }, [bookId, hadithNumber]);

  // Setup intersection observer untuk infinite scroll (hanya jika tidak mencari)
  useEffect(() => {
    if (isSingleMode || loading || searchQuery) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && isOnline) {
          loadMoreHadiths();
        }
      },
      { threshold: 0.5, rootMargin: '100px' }
    );

    if (lastElementRef.current) {
      observerRef.current.observe(lastElementRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isSingleMode, loading, hasMore, loadingMore, isOnline, allHadiths, searchQuery]);

  // Fetch data awal
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      setPage(1);
      setAllHadiths([]);
      setIsSingleMode(false);
      setSingleHadith(null);
      setSearchQuery('');
      setSearchResult(null);
      setSearchError(null);

      const cachedBook = await db.getHadithBook(bookId);
      const cachedHadiths = await db.getHadiths(bookId, 1, itemsPerPage);

      if (cachedHadiths.length > 0 && cachedBook) {
        const initialHadiths = cachedHadiths.map((h) => ({
          number: h.number,
          arab: h.arab,
          id: h.translation,
        }));

        setBookDetail({
          name: cachedBook.name,
          id: bookId,
          available: cachedBook.available,
          hadiths: initialHadiths,
        });
        setAllHadiths(initialHadiths);
        setOfflineMode(!isOnline);
        setHasMore(cachedBook.available > itemsPerPage);
      }

      if (isOnline) {
        await loadMoreHadiths(1, true);
      } else if (cachedHadiths.length === 0) {
        setError('Tidak ada data offline. Silakan online terlebih dahulu.');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  // Load more hadis (infinite scroll)
  const loadMoreHadiths = async (targetPage = page + 1, isInitial = false) => {
    if (!isOnline) {
      toast.error('Tidak dapat memuat lebih banyak dalam mode offline');
      return;
    }

    try {
      setLoadingMore(true);

      const start = (targetPage - 1) * itemsPerPage + 1;
      const end = targetPage * itemsPerPage;

      const res = await fetch(
        `https://api.hadith.gading.dev/books/${bookId}?range=${start}-${end}`
      );
      const data = await res.json();

      if (data.code === 200) {
        const newHadiths = data.data.hadiths;

        if (!bookDetail) {
          setBookDetail({
            name: data.data.name,
            id: data.data.id,
            available: data.data.available,
            requested: data.data.requested,
            hadiths: newHadiths,
          });
        }

        setAllHadiths((prev) => (isInitial ? newHadiths : [...prev, ...newHadiths]));
        setPage(targetPage);

        const nextStart = targetPage * itemsPerPage + 1;
        setHasMore(nextStart <= data.data.available);

        await db.saveHadithBook(bookId, data.data.name, data.data.available);
        await db.saveHadiths(bookId, newHadiths, start, end);
        setOfflineMode(false);
      } else {
        throw new Error('Gagal memuat data');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat data tambahan');
    } finally {
      setLoadingMore(false);
    }
  };

  // Fetch satu hadis spesifik (digunakan untuk mode single dan pencarian nomor)
  const fetchSingleHadith = async (number: number, isSearch = false) => {
    if (!isOnline) {
      toast.error('Anda sedang offline. Tidak dapat memuat hadis.');
      return null;
    }

    try {
      if (!isSearch) setLoading(true);
      else setSearchLoading(true);

      const res = await fetch(`https://api.hadith.gading.dev/books/${bookId}/${number}`);
      const data = await res.json();

      if (data.code === 200 && data.data.contents) {
        const hadithData: Hadith = {
          number: data.data.contents.number,
          arab: data.data.contents.arab,
          id: data.data.contents.id,
        };

        if (!isSearch) {
          // Mode single dari URL parameter
          setSingleHadith(hadithData);
          setIsSingleMode(true);
          setBookDetail({
            name: data.data.name,
            id: data.data.id,
            available: data.data.available,
            hadiths: [hadithData],
          });
        } else {
          // Hasil pencarian
          setSearchResult(hadithData);
          setSearchError(null);
        }

        return hadithData;
      } else {
        throw new Error('Hadis tidak ditemukan');
      }
    } catch (err) {
      console.error(err);
      if (isSearch) {
        setSearchError(`Hadis nomor ${number} tidak ditemukan`);
        setSearchResult(null);
      } else {
        setError('Gagal memuat hadis yang diminta');
      }
      return null;
    } finally {
      if (!isSearch) setLoading(false);
      else setSearchLoading(false);
    }
  };

  // Handler pencarian
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      clearSearch();
      return;
    }

    const query = searchQuery.trim();
    // Deteksi apakah input berupa angka (nomor hadis)
    const isNumber = /^\d+$/.test(query);

    if (isNumber) {
      // Cari berdasarkan nomor via API
      const number = parseInt(query, 10);
      await fetchSingleHadith(number, true);
    } else {
      // Pencarian teks: reset hasil spesifik, biarkan filter lokal bekerja
      setSearchResult(null);
      setSearchError(null);
      // Efek filter lokal akan berjalan berdasarkan searchQuery
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResult(null);
    setSearchError(null);
  };

  // Filter lokal untuk pencarian teks
  const filteredHadiths = useCallback(() => {
    if (!searchQuery.trim() || /^\d+$/.test(searchQuery.trim())) {
      return allHadiths; // pencarian nomor ditangani terpisah
    }
    const query = searchQuery.toLowerCase().trim();
    return allHadiths.filter(
      (hadith) =>
        hadith.id.toLowerCase().includes(query) ||
        hadith.arab.includes(query) ||
        hadith.number.toString().includes(query)
    );
  }, [searchQuery, allHadiths]);

  // Share hadis
  const handleShareHadith = async (hadith: Hadith) => {
    const elementId = `hadith-${bookId}-${hadith.number}`;
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error('Elemen hadis tidak ditemukan');
      return;
    }

    setSharingId(hadith.number);

    try {
      const blob = await toBlob(element, {
        quality: 1,
        pixelRatio: 1.5,
        backgroundColor: '#ffffff',
        skipFonts: false,
        cacheBust: true,
      });

      if (!blob) throw new Error('Gagal membuat gambar');

      const file = new File([blob], `hadis_${bookId}_${hadith.number}.png`, {
        type: 'image/png',
      });
      const shareText = `Hadis ${bookDetail?.name} no. ${hadith.number}\n\n${hadith.arab}\n\n${hadith.id}\n\n— via quranku`;
      const shareTitle = `Hadis ${bookDetail?.name} - ${hadith.number}`;

      const fallback = async () => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `hadis_${bookId}_${hadith.number}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        try {
          await navigator.clipboard.writeText(shareText);
          toast.success('Gambar diunduh & teks disalin ke clipboard');
        } catch {
          toast.success('Gambar diunduh');
        }
      };

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: shareTitle, text: shareText });
          toast.success('Hadis berhasil dibagikan');
        } catch (shareError) {
          if (shareError instanceof DOMException) {
            if (shareError.message.includes('user gesture')) {
              await fallback();
            } else if (shareError.message.includes('cancel')) {
              toast.info('Bagikan dibatalkan');
            } else {
              throw shareError;
            }
          } else {
            throw shareError;
          }
        }
      } else if (navigator.share) {
        try {
          await navigator.share({ title: shareTitle, text: shareText });
          toast.success('Hadis berhasil dibagikan');
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.message.includes('cancel')) {
            toast.info('Bagikan dibatalkan');
          } else {
            throw shareError;
          }
        }
      } else {
        await fallback();
      }
    } catch (error) {
      console.error('Gagal membagikan hadis:', error);
      toast.error('Gagal membagikan hadis');
    } finally {
      setSharingId(null);
    }
  };

  const toggleExpand = (number: number) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(number)) newSet.delete(number);
      else newSet.add(number);
      return newSet;
    });
  };

  // Loading state
  if (loading && !bookDetail && !singleHadith) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-emerald-100 rounded animate-pulse" />
            <div className="h-6 bg-emerald-100 rounded w-48 animate-pulse" />
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse"
              >
                <div className="h-4 bg-emerald-100 rounded w-16 mb-2" />
                <div className="h-20 bg-emerald-50 rounded mb-2" />
                <div className="h-10 bg-emerald-50 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || (!bookDetail && !singleHadith)) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-red-600">{error || 'Data tidak ditemukan'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-emerald-100 transition"
          >
            <FaArrowLeft className="w-5 h-5 text-emerald-700" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-emerald-800">{bookDetail?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <FaHashtag className="w-3 h-3" />
                {bookDetail?.available} hadis
              </p>
              {offlineMode && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <FaCloud className="w-3 h-3" />
                  Offline
                </span>
              )}
              {isSingleMode && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  Hadis Spesifik
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Form Pencarian (hanya mode daftar) */}
        {!isSingleMode && (
          <form onSubmit={handleSearch} className="mb-6 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor hadis (contoh: 10) atau teks..."
              className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              disabled={searchLoading}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute inset-y-0 right-12 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            )}
            <button
              type="submit"
              disabled={searchLoading || !searchQuery.trim()}
              className="absolute inset-y-0 right-0 px-4 bg-emerald-600 text-white rounded-r-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {searchLoading ? <FaSpinner className="animate-spin" /> : 'Cari'}
            </button>
          </form>
        )}

        {/* Info offline mode */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 flex items-center gap-2">
              <FaCloud className="w-4 h-4" />
              Anda sedang offline. Menampilkan data yang tersimpan.
            </p>
          </div>
        )}

        {/* Mode Hadis Tunggal (dari parameter) */}
        {isSingleMode && singleHadith && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-xl border border-emerald-200 p-6 shadow-lg"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
                  {singleHadith.number}
                </div>
                <span className="text-gray-600">Hadis Khusus</span>
              </div>
              <button
                onClick={() => handleShareHadith(singleHadith)}
                disabled={sharingId === singleHadith.number}
                className="p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition disabled:opacity-50"
                title="Bagikan hadis"
              >
                {sharingId === singleHadith.number ? (
                  <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FaShareAlt className="w-5 h-5 text-emerald-700" />
                )}
              </button>
            </div>

            <div className="mb-4 text-right">
              <p className="font-arabic text-2xl leading-loose text-gray-900">
                {singleHadith.arab}
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-gray-700 leading-relaxed">{singleHadith.id}</p>
            </div>
          </motion.div>
        )}

        {/* Hasil Pencarian Spesifik (berdasarkan nomor) */}
        {!isSingleMode && searchResult && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-emerald-800 mb-3">Hasil Pencarian</h2>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-xl border border-emerald-200 p-5 shadow-lg"
            >
              <div
                id={`hadith-${bookId}-${searchResult.number}`}
                className="relative"
              >
                <button
                  onClick={() => handleShareHadith(searchResult)}
                  disabled={sharingId === searchResult.number}
                  className="absolute top-0 right-0 p-2 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-emerald-50 disabled:opacity-50 transition-colors z-10"
                  title="Bagikan hadis"
                >
                  {sharingId === searchResult.number ? (
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <FaShareAlt className="w-4 h-4 text-emerald-700" />
                  )}
                </button>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                    {searchResult.number}
                  </div>
                  <span className="text-xs text-gray-500">Hadis ke-{searchResult.number}</span>
                </div>
                <div className="mb-3 text-right">
                  <p className="font-arabic text-xl leading-loose text-gray-900">
                    {searchResult.arab}
                  </p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {searchResult.id}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Pesan error pencarian */}
        {searchError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {searchError}
          </div>
        )}

        {/* Mode Daftar Hadis (ditampilkan jika tidak ada hasil pencarian spesifik atau pencarian teks) */}
        {!isSingleMode && !searchResult && (
          <>
            {/* Info jumlah hasil filter teks */}
            {searchQuery && !/^\d+$/.test(searchQuery) && (
              <div className="mb-4 text-sm text-gray-600">
                Menampilkan {filteredHadiths().length} dari {allHadiths.length} hadis
                (pencarian teks)
              </div>
            )}

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {(searchQuery && !/^\d+$/.test(searchQuery) ? filteredHadiths() : allHadiths).map(
                (hadith, index) => {
                  const isLastItem =
                    index ===
                    (searchQuery && !/^\d+$/.test(searchQuery)
                      ? filteredHadiths().length
                      : allHadiths.length) -
                      1;
                  return (
                    <motion.div
                      key={hadith.number}
                      id={`hadith-${bookId}-${hadith.number}`}
                      ref={isLastItem ? lastElementRef : null}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ type: 'spring' }}
                      className="bg-white rounded-xl border border-gray-200 p-5 hover:border-emerald-300 transition-all relative"
                    >
                      <button
                        onClick={() => handleShareHadith(hadith)}
                        disabled={sharingId === hadith.number}
                        className="absolute top-3 right-3 p-2 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-emerald-50 disabled:opacity-50 transition-colors z-10"
                        title="Bagikan hadis"
                      >
                        {sharingId === hadith.number ? (
                          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FaShareAlt className="w-4 h-4 text-emerald-700" />
                        )}
                      </button>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                          {hadith.number}
                        </div>
                        <span className="text-xs text-gray-500">Hadis ke-{hadith.number}</span>
                      </div>
                      <div className="mb-3 text-right">
                        <p className="font-arabic text-xl leading-loose text-gray-900">
                          {hadith.arab}
                        </p>
                      </div>
                      <div className="border-t border-gray-100 pt-3">
                        <p
                          className={`text-gray-700 text-sm leading-relaxed whitespace-pre-wrap ${
                            expandedIds.has(hadith.number) ? '' : 'line-clamp-3'
                          }`}
                        >
                          {hadith.id}
                        </p>
                        <button
                          onClick={() => toggleExpand(hadith.number)}
                          className="text-emerald-600 text-xs mt-1 hover:underline focus:outline-none"
                        >
                          {expandedIds.has(hadith.number) ? 'Sembunyikan' : 'Baca selengkapnya'}
                        </button>
                      </div>
                    </motion.div>
                  );
                }
              )}
            </motion.div>

            {/* Pesan tidak ditemukan untuk filter teks */}
            {searchQuery && !/^\d+$/.test(searchQuery) && filteredHadiths().length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Tidak ada hadis yang cocok dengan pencarian "{searchQuery}"
              </div>
            )}

            {/* Loading indicator (hanya jika tidak sedang mencari) */}
            {!searchQuery && loadingMore && (
              <div className="flex justify-center py-4">
                <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            )}

            {/* No more data indicator (hanya jika tidak sedang mencari) */}
            {!searchQuery && !hasMore && allHadiths.length > 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                ─── Semua hadis telah dimuat ───
              </div>
            )}

            {/* Manual load more button (hanya jika tidak sedang mencari) */}
            {!searchQuery && hasMore && isOnline && !loadingMore && (
              <div className="flex justify-center py-4">
                <button
                  onClick={() => loadMoreHadiths()}
                  className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm hover:bg-emerald-200 transition"
                >
                  Muat lebih banyak
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        .font-arabic {
          font-family: 'Amiri', serif;
        }
      `}</style>
    </div>
  );
}