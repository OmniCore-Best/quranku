'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FaArrowLeft, FaChevronLeft, FaChevronRight, FaHashtag, FaShareAlt, FaCloud } from 'react-icons/fa';
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
  const searchParams = useSearchParams();
  const bookId = params.name as string;

  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sharingId, setSharingId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const itemsPerPage = 20;

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
    const pageParam = searchParams.get('page');
    setPage(pageParam ? parseInt(pageParam) : 1);
  }, [searchParams]);

  useEffect(() => {
    if (bookId) {
      fetchHadiths();
    }
  }, [bookId, page, isOnline]);

  const fetchHadiths = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Coba ambil dari cache terlebih dahulu
      const cachedBook = await db.getHadithBook(bookId);
      const cachedHadiths = await db.getHadiths(bookId, page, itemsPerPage);
      
      if (cachedHadiths.length > 0 && cachedBook) {
        setBookDetail({
          name: cachedBook.name,
          id: bookId,
          available: cachedBook.available,
          hadiths: cachedHadiths.map(h => ({
            number: h.number,
            arab: h.arab,
            id: h.translation
          }))
        });
        setOfflineMode(!isOnline);
      }
      
      if (isOnline) {
        const start = (page - 1) * itemsPerPage + 1;
        const end = page * itemsPerPage;
        const res = await fetch(`https://api.hadith.gading.dev/books/${bookId}?range=${start}-${end}`);
        const data = await res.json();
        
        if (data.code === 200) {
          const newDetail: BookDetail = {
            name: data.data.name,
            id: data.data.id,
            available: data.data.available,
            requested: data.data.requested,
            hadiths: data.data.hadiths
          };
          setBookDetail(newDetail);
          setOfflineMode(false);
          
          await db.saveHadithBook(bookId, data.data.name, data.data.available);
          await db.saveHadiths(bookId, data.data.hadiths);
        } else {
          throw new Error('Gagal memuat data');
        }
      } else if (cachedHadiths.length === 0) {
        setError('Tidak ada data offline untuk halaman ini');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = bookDetail ? Math.ceil(bookDetail.available / itemsPerPage) : 0;

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      router.push(`/hadist/${bookId}?page=${newPage}`);
    }
  };

  // ================= MENGGUNAKAN HTML-TO-IMAGE =================
  const handleShareHadith = async (hadith: Hadith) => {
    const elementId = `hadith-${bookId}-${hadith.number}`;
    const element = document.getElementById(elementId);
    if (!element) {
      toast.error('Elemen hadis tidak ditemukan');
      return;
    }

    setSharingId(hadith.number);

    try {
      // Konversi elemen ke PNG (data URL)
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 1.5, // setara dengan scale
        backgroundColor: '#ffffff',
        skipFonts: false, // pastikan font ikut terbaca
        cacheBust: true,
      });

      // Ubah data URL menjadi Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      const file = new File([blob], `hadis_${bookId}_${hadith.number}.png`, { type: 'image/png' });
      const shareText = `Hadis ${bookDetail?.name} no. ${hadith.number}\n\n${hadith.arab}\n\n${hadith.id}\n\n— via quranku`;

      // Cek dukungan share file
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
        // Fallback: download gambar + salin teks
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
  // ================= AKHIR PERBAIKAN =================

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

        {/* Daftar Hadis */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {bookDetail.hadiths.map((hadith) => (
            <motion.div
              key={hadith.number}
              id={`hadith-${bookId}-${hadith.number}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring' }}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-emerald-300 transition-all relative group"
            >
              <button
                onClick={() => handleShareHadith(hadith)}
                disabled={sharingId === hadith.number}
                className="absolute top-3 right-3 p-2 rounded-lg bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-50 disabled:opacity-50"
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
                <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">{hadith.id}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              Halaman {page} dari {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaChevronRight className="w-4 h-4" />
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