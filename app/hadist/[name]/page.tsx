'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaArrowLeft, FaHashtag, FaShareAlt, FaCloud } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
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
  const bookId = params.name as string;

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
  
  const itemsPerPage = 20;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);

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
    if (bookId) {
      fetchInitialData();
    }
  }, [bookId]);

  // Setup intersection observer untuk infinite scroll
  useEffect(() => {
    if (loading) return;

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
  }, [loading, hasMore, loadingMore, isOnline, allHadiths]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      setPage(1);
      setAllHadiths([]);
      
      // Ambil dari cache untuk halaman pertama
      const cachedBook = await db.getHadithBook(bookId);
      const cachedHadiths = await db.getHadiths(bookId, 1, itemsPerPage);
      
      if (cachedHadiths.length > 0 && cachedBook) {
        const initialHadiths = cachedHadiths.map(h => ({
          number: h.number,
          arab: h.arab,
          id: h.translation
        }));
        
        setBookDetail({
          name: cachedBook.name,
          id: bookId,
          available: cachedBook.available,
          hadiths: initialHadiths
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

  const loadMoreHadiths = async (targetPage = page + 1, isInitial = false) => {
    if (!isOnline) {
      toast.error('Tidak dapat memuat lebih banyak dalam mode offline');
      return;
    }

    try {
      setLoadingMore(true);
      
      const start = (targetPage - 1) * itemsPerPage + 1;
      const end = targetPage * itemsPerPage;
      
      const res = await fetch(`https://api.hadith.gading.dev/books/${bookId}?range=${start}-${end}`);
      const data = await res.json();
      
      if (data.code === 200) {
        const newHadiths = data.data.hadiths;
        
        if (!bookDetail) {
          // Inisialisasi book detail jika belum ada
          setBookDetail({
            name: data.data.name,
            id: data.data.id,
            available: data.data.available,
            requested: data.data.requested,
            hadiths: newHadiths
          });
        }
        
        // Update state
        setAllHadiths(prev => isInitial ? newHadiths : [...prev, ...newHadiths]);
        setPage(targetPage);
        
        // Cek apakah masih ada halaman berikutnya
        const nextStart = targetPage * itemsPerPage + 1;
        setHasMore(nextStart <= data.data.available);
        
        // Simpan ke cache
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

  const handleShareHadith = async (hadith: Hadith) => {
    const elementId = `hadith-${bookId}-${hadith.number}`;
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error('Elemen hadis tidak ditemukan');
      return;
    }

    setSharingId(hadith.number);

    try {
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 1.5,
        backgroundColor: '#ffffff',
        skipFonts: false,
        cacheBust: true,
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();

      const file = new File([blob], `hadis_${bookId}_${hadith.number}.png`, { type: 'image/png' });
      const shareText = `Hadis ${bookDetail?.name} no. ${hadith.number}\n\n${hadith.arab}\n\n${hadith.id}\n\n— via quranku`;

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Hadis ${bookDetail?.name} - ${hadith.number}`,
          text: shareText,
        });
        toast.success('Hadis berhasil dibagikan');
      } 
      else if (navigator.share) {
        await navigator.share({
          title: `Hadis ${bookDetail?.name} - ${hadith.number}`,
          text: shareText,
        });
        toast.success('Hadis berhasil dibagikan');
      } 
      else {
        const link = document.createElement('a');
        link.download = `hadis_${bookId}_${hadith.number}.png`;
        link.href = dataUrl;
        link.click();

        try {
          await navigator.clipboard.writeText(shareText);
          toast.success('Gambar diunduh & teks disalin ke clipboard');
        } catch (clipError) {
          console.warn('Gagal menyalin teks:', clipError);
          toast.success('Gambar diunduh (gagal menyalin teks)');
        }
      }
    } catch (error) {
      console.error('Gagal membagikan hadis:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal';
      toast.error(`Gagal membagikan hadis: ${errorMessage}`);
    } finally {
      setSharingId(null);
    }
  };

  const toggleExpand = (number: number) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(number)) {
        newSet.delete(number);
      } else {
        newSet.add(number);
      }
      return newSet;
    });
  };

  if (loading && !bookDetail) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-emerald-100 rounded animate-pulse"></div>
            <div className="h-6 bg-emerald-100 rounded w-48 animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse">
                <div className="h-4 bg-emerald-100 rounded w-16 mb-2"></div>
                <div className="h-20 bg-emerald-50 rounded mb-2"></div>
                <div className="h-10 bg-emerald-50 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !bookDetail) {
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
            <h1 className="text-2xl font-bold text-emerald-800">{bookDetail.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <FaHashtag className="w-3 h-3" />
                {bookDetail.available} hadis
              </p>
              {offlineMode && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <FaCloud className="w-3 h-3" />
                  Offline
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info offline mode */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 flex items-center gap-2">
              <FaCloud className="w-4 h-4" />
              Anda sedang offline. Menampilkan data yang tersimpan.
            </p>
          </div>
        )}

        {/* Daftar Hadis dengan Infinite Scroll */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {allHadiths.map((hadith, index) => (
            <motion.div
              key={hadith.number}
              id={`hadith-${bookId}-${hadith.number}`}
              ref={index === allHadiths.length - 1 ? lastElementRef : null}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring' }}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-emerald-300 transition-all relative"
            >
              <button
                onClick={() => handleShareHadith(hadith)}
                disabled={sharingId === hadith.number}
                className="absolute top-3 right-3 p-2 rounded-lg bg-white/80 backdrop-blur-sm opacity-100 hover:bg-emerald-50 disabled:opacity-50 transition-colors z-10"
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
                <p className="font-arabic text-xl leading-loose text-gray-900">{hadith.arab}</p>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className={`text-gray-700 text-sm leading-relaxed whitespace-pre-wrap ${expandedIds.has(hadith.number) ? '' : 'line-clamp-3'}`}>
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
          ))}
        </motion.div>

        {/* Loading indicator */}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          </div>
        )}

        {/* No more data indicator */}
        {!hasMore && allHadiths.length > 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            ─── Semua hadis telah dimuat ───
          </div>
        )}

        {/* Manual load more button (jika observer gagal) */}
        {hasMore && isOnline && !loadingMore && (
          <div className="flex justify-center py-4">
            <button
              onClick={() => loadMoreHadiths()}
              className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm hover:bg-emerald-200 transition"
            >
              Muat lebih banyak
            </button>
          </div>
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