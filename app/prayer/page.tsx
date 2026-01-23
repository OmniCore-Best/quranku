'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FaSearch, 
  FaFilter, 
  FaTags, 
  FaList, 
  FaBook,
  FaShareAlt,
  FaRegCopy,
  FaCheck,
  FaExternalLinkAlt,
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaSync,
  FaCloud,
  FaPray,
  FaTimes
} from 'react-icons/fa';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { PiWifiSlash } from 'react-icons/pi';

interface Doa {
  id: number;
  grup: string;
  nama: string;
  ar: string;
  tr: string;
  idn: string;
  tentang: string;
  tag: string[];
}

interface FilterData {
  availableGroups: string[];
  availableTags: string[];
}

export default function PrayerPage() {
  const [doas, setDoas] = useState<Doa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [totalDoas, setTotalDoas] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDoa, setSelectedDoa] = useState<Doa | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState<FilterData>({
    availableGroups: [],
    availableTags: []
  });

  const limit = 20;

  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    fetchDoas();
    fetchFilters();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [page, search, selectedGroup, selectedTag]);

  const fetchFilters = async () => {
    try {
      const response = await fetch('https://api.devnova.icu/api/islamic/doa?page=1&limit=1');
      const data = await response.json();
      if (data.success && data.filters) {
        setFilters({
          availableGroups: data.filters.availableGroups || [],
          availableTags: data.filters.availableTags || []
        });
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchDoas = async () => {
    try {
      setLoading(true);
      
      let url = `https://api.devnova.icu/api/islamic/doa?page=${page}&limit=${limit}`;
      
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }
      if (selectedGroup) {
        url += `&grup=${encodeURIComponent(selectedGroup)}`;
      }
      if (selectedTag) {
        url += `&tag=${encodeURIComponent(selectedTag)}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setDoas(data.data || []);
        setTotalPages(data.totalPages || 1);
        setHasNext(data.hasNext || false);
        setHasPrev(data.hasPrev || false);
        setTotalDoas(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching doas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(() => {
    setPage(1);
    fetchDoas();
  }, [search, selectedGroup, selectedTag]);

  const handleClearFilters = () => {
    setSearch('');
    setSelectedGroup('');
    setSelectedTag('');
    setPage(1);
  };

  const handleCopyDoa = async (doa: Doa) => {
    const textToCopy = `${doa.ar}\n\n${doa.tr}\n\n${doa.idn}\n\n— ${doa.nama}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      
      // Tampilkan feedback
      const copyButtons = document.querySelectorAll('[data-doa-id]');
      copyButtons.forEach(btn => {
        if (btn.getAttribute('data-doa-id') === doa.id.toString()) {
          const icon = btn.querySelector('.copy-icon');
          if (icon) {
            const originalHTML = icon.innerHTML;
            icon.innerHTML = '<FaCheck className="w-4 h-4" />';
            
            setTimeout(() => {
              icon.innerHTML = originalHTML;
            }, 2000);
          }
        }
      });
      
      // Event untuk toast (jika ada)
      const event = new CustomEvent('showToast', {
        detail: {
          message: 'Doa berhasil disalin!',
          type: 'success'
        }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error copying:', error);
      // Fallback untuk browser lama
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const handleShareDoa = async (doa: Doa) => {
    const shareText = `${doa.nama}\n\n${doa.ar}\n\n${doa.idn}\n\nBaca doa-doa lainnya di quranku!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `quranku - ${doa.nama}`,
          text: shareText,
          url: window.location.origin + '/prayer',
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      await handleCopyDoa(doa);
    }
  };

  const sortedDoas = [...doas].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a.nama.localeCompare(b.nama);
    } else {
      return b.nama.localeCompare(a.nama);
    }
  });

  // Fixed: Tipe Variants yang tepat untuk Framer Motion
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
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  if (loading && doas.length === 0) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 bg-emerald-100 rounded w-48 mb-6 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 animate-pulse">
                <div className="h-4 bg-emerald-100 rounded w-32 mb-2" />
                <div className="h-3 bg-emerald-100 rounded w-24 mb-3" />
                <div className="h-20 bg-emerald-50 rounded mb-3" />
                <div className="h-2 bg-emerald-100 rounded w-full mb-2" />
                <div className="h-2 bg-emerald-100 rounded w-4/5" />
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-emerald-800">Kumpulan Doa</h1>
                {!isOnline && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium flex items-center gap-1">
                    <PiWifiSlash className="w-3 h-3" />
                    Offline
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-sm mt-1">Kumpulan doa-doa harian berdasarkan hadits shahih</p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-1.5">
                <FaBook className="w-3.5 h-3.5" />
                {totalDoas} Doa
              </span>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-1.5 hover:bg-emerald-50 transition"
              >
                <FaFilter className="w-3.5 h-3.5" />
                Filter
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari doa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 transition"
            >
              Cari
            </button>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="bg-white rounded-xl border border-emerald-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-emerald-900">Filter Doa</h3>
                    <button
                      onClick={handleClearFilters}
                      className="text-xs text-emerald-600 hover:text-emerald-800"
                    >
                      Reset Filter
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FaList className="inline w-3.5 h-3.5 mr-1" />
                        Kelompok Doa
                      </label>
                      <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">Semua Kelompok</option>
                        {filters.availableGroups.map(group => (
                          <option key={group} value={group}>{group}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FaTags className="inline w-3.5 h-3.5 mr-1" />
                        Tag Doa
                      </label>
                      <select
                        value={selectedTag}
                        onChange={(e) => setSelectedTag(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option value="">Semua Tag</option>
                        {filters.availableTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Active Filters */}
                  {(selectedGroup || selectedTag || search) && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-2">Filter Aktif:</p>
                      <div className="flex flex-wrap gap-2">
                        {search && (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs flex items-center gap-1">
                            Pencarian: {search}
                            <button onClick={() => setSearch('')}>
                              <FaTimes className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                        {selectedGroup && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1">
                            Kelompok: {selectedGroup}
                            <button onClick={() => setSelectedGroup('')}>
                              <FaTimes className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                        {selectedTag && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center gap-1">
                            Tag: {selectedTag}
                            <button onClick={() => setSelectedTag('')}>
                              <FaTimes className="w-3 h-3" />
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="text-sm text-gray-600">
              Menampilkan {doas.length} dari {totalDoas} doa
              {selectedGroup && ` • Kelompok: ${selectedGroup}`}
              {selectedTag && ` • Tag: ${selectedTag}`}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 flex items-center gap-2 transition"
              >
                {sortOrder === 'asc' ? <FaSortAlphaDown /> : <FaSortAlphaUp />}
                <span>Urutkan {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
              </button>
              
              {!isOnline && (
                <button
                  onClick={fetchDoas}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center gap-2 transition"
                >
                  <FaSync className="w-4 h-4" />
                  <span>Coba Lagi</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Doa List */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {sortedDoas.map((doa) => (
            <motion.div key={doa.id} variants={itemVariants}>
              <div className="group relative">
                {/* Action Buttons */}
                <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    data-doa-id={doa.id}
                    onClick={() => handleCopyDoa(doa)}
                    className="p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm transition"
                    title="Salin doa"
                  >
                    <div className="copy-icon">
                      <FaRegCopy className="w-3.5 h-3.5 text-gray-600" />
                    </div>
                  </button>
                  <button
                    onClick={() => handleShareDoa(doa)}
                    className="p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm transition"
                    title="Bagikan doa"
                  >
                    <FaShareAlt className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </div>
                
                <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-md transition-all duration-200">
                  {/* Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 transition">
                          {doa.nama}
                        </h3>
                        <p className="text-xs text-emerald-600 font-medium">{doa.grup}</p>
                      </div>
                      <div className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                        #{doa.id}
                      </div>
                    </div>
                  </div>

                  {/* Arabic Text */}
                  <div className="mb-4">
                    <div className="text-xl font-arabic text-right leading-relaxed text-gray-900 mb-2">
                      {doa.ar}
                    </div>
                    <div className="text-sm text-emerald-700 font-medium">
                      {doa.tr}
                    </div>
                  </div>

                  {/* Translation */}
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 mb-1">Arti:</div>
                    <p className="text-gray-800 text-sm leading-relaxed line-clamp-3">
                      {doa.idn}
                    </p>
                  </div>

                  {/* Tags */}
                  {doa.tag && doa.tag.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {doa.tag.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="pt-4 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedDoa(doa);
                        setShowModal(true);
                      }}
                      className="w-full text-center text-sm text-emerald-600 hover:text-emerald-800 font-medium flex items-center justify-center gap-1"
                    >
                      <FaExternalLinkAlt className="w-3 h-3" />
                      Baca Selengkapnya
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Empty State */}
        {sortedDoas.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <FaPray className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ditemukan</h3>
            <p className="text-gray-600">
              {search || selectedGroup || selectedTag 
                ? 'Tidak ada doa yang sesuai dengan filter yang dipilih'
                : 'Belum ada data doa'}
            </p>
            {(search || selectedGroup || selectedTag) && (
              <button
                onClick={handleClearFilters}
                className="mt-4 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
              >
                Hapus Filter
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {sortedDoas.length > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={!hasPrev}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              Sebelumnya
            </button>
            
            <div className="text-sm text-gray-600">
              Halaman <span className="font-semibold">{page}</span> dari <span className="font-semibold">{totalPages}</span>
            </div>
            
            <button
              onClick={() => setPage(prev => prev + 1)}
              disabled={!hasNext}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>

      {/* Modal for Doa Details */}
      <AnimatePresence>
        {showModal && selectedDoa && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-emerald-900">{selectedDoa.nama}</h2>
                    <p className="text-sm text-emerald-600">{selectedDoa.grup}</p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition"
                  >
                    <FaTimes className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Arabic Text */}
                <div className="mb-6">
                  <div className="text-2xl font-arabic text-right leading-loose text-gray-900 mb-4">
                    {selectedDoa.ar}
                  </div>
                  <div className="text-sm text-emerald-700 font-medium bg-emerald-50 p-3 rounded-lg">
                    <span className="font-semibold">Transliterasi:</span> {selectedDoa.tr}
                  </div>
                </div>

                {/* Translation */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Arti:</h4>
                  <p className="text-gray-800 leading-relaxed">
                    {selectedDoa.idn}
                  </p>
                </div>

                {/* Description */}
                {selectedDoa.tentang && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Keterangan:</h4>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {selectedDoa.tentang}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedDoa.tag && selectedDoa.tag.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Tag:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedDoa.tag.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => handleCopyDoa(selectedDoa)}
                    className="px-4 py-2 text-sm border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition flex items-center gap-2"
                  >
                    <FaRegCopy className="w-4 h-4" />
                    Salin Doa
                  </button>
                  <button
                    onClick={() => handleShareDoa(selectedDoa)}
                    className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-2"
                  >
                    <FaShareAlt className="w-4 h-4" />
                    Bagikan
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS for Arabic Font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        .font-arabic {
          font-family: 'Amiri', serif;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}