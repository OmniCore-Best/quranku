'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaBook, FaHashtag, FaCloud } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { db } from '@/lib/db';

interface Book {
  name: string;
  id: string;
  available: number;
}

export default function HadistPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineBooks, setOfflineBooks] = useState<string[]>([]); // bookId yang tersedia offline

  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    fetchBooks();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      
      // Ambil daftar kitab yang tersedia di cache
      const cachedBooks = await db.getAllHadithBooks();
      setOfflineBooks(cachedBooks.map(b => b.bookId));

      // Jika online, fetch dari API
      if (isOnline) {
        const res = await fetch('https://api.hadith.gading.dev/books');
        const data = await res.json();
        if (data.code === 200) {
          setBooks(data.data);
          // Simpan ke database untuk offline
          for (const book of data.data) {
            await db.saveHadithBook(book.id, book.name, book.available);
          }
        } else {
          throw new Error('Gagal memuat data');
        }
      } else {
        // Jika offline, gunakan data dari cache
        if (cachedBooks.length > 0) {
          setBooks(cachedBooks.map(b => ({
            name: b.name,
            id: b.bookId,
            available: b.available
          })));
        } else {
          setError('Tidak ada data offline. Silakan online terlebih dahulu.');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-emerald-800 mb-6">Kumpulan Hadis</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse">
                <div className="h-5 bg-emerald-100 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-emerald-50 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-6xl mx-auto text-center py-12">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchBooks} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-emerald-800 mb-2">Kumpulan Hadis</h1>
        <p className="text-gray-600 mb-6">Pilih kitab hadis untuk membaca</p>
        
        {!isOnline && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
            <FaCloud className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              Mode offline. Menampilkan kitab yang tersimpan.
            </p>
          </div>
        )}

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {books.map((book) => {
            const isCached = offlineBooks.includes(book.id);
            return (
              <motion.div
                key={book.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring' }}
              >
                <Link href={`/hadist/${book.id}`}>
                  <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer relative">
                    {isCached && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs flex items-center gap-1">
                          <FaCloud className="w-3 h-3" />
                          Offline
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white">
                        <FaBook />
                      </div>
                      <div className="flex-1">
                        <h2 className="font-bold text-gray-900">{book.name}</h2>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          <FaHashtag className="w-3 h-3" />
                          <span>{book.available} hadis</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}