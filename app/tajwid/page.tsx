'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { 
  FaSearch, 
  FaFilter, 
  FaBook, 
  FaInfoCircle, 
  FaArrowRight,
  FaChevronDown,
  FaChevronUp,
  FaShareAlt,
  FaBookmark,
  FaRegBookmark,
  FaStar,
  FaLanguage,
  FaListOl,
  FaListUl,
  FaHashtag
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';

interface TajwidRule {
  id: string;
  name: {
    id: string;
    en: string;
  };
  definition: {
    id: string;
    en: string;
  };
  letters?: string[];
  examples?: Array<{
    arabic: string;
    transliteration?: {
      id: string;
      en: string;
    };
  }>;
  conditions?: Array<{
    id: string;
    en: string;
  }>;
  notes?: Array<{
    id: string;
    en: string;
  }>;
  duration?: {
    id: string;
    en: string;
  };
}

interface TajwidCategory {
  id: string;
  name: {
    id: string;
    en: string;
  };
  description?: {
    id: string;
    en: string;
  };
  order: number;
  rules: TajwidRule[];
}

interface TajwidData {
  success: boolean;
  timestamp: string;
  version: string;
  data: {
    categories: TajwidCategory[];
    metadata: {
      source: string;
      compiler: {
        id: string;
        en: string;
      };
      languageSupport: string[];
      license: string;
    };
  };
  requestInfo: {
    language: string;
    category?: string;
    categoryCount: number;
  };
}

// Komponen utama yang menggunakan useSearchParams
function TajwidContent() {
  const [data, setData] = useState<TajwidData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedRules, setExpandedRules] = useState<string[]>([]);
  const [language, setLanguage] = useState<'id' | 'en'>('id');
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
    
    // Load bookmarks from localStorage
    const savedBookmarks = localStorage.getItem('tajwid_bookmarks');
    if (savedBookmarks) {
      try {
        setBookmarks(JSON.parse(savedBookmarks));
      } catch (e) {
        console.error('Error parsing bookmarks:', e);
      }
    }
    
    fetchTajwidData();
  }, [searchParams]);

  const fetchTajwidData = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://api.devnova.icu/api/islamic/tajwid');
      if (!response.ok) throw new Error('Failed to fetch tajwid data');
      
      const result: TajwidData = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching tajwid data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBookmark = (ruleId: string) => {
    let newBookmarks;
    if (bookmarks.includes(ruleId)) {
      newBookmarks = bookmarks.filter(id => id !== ruleId);
    } else {
      newBookmarks = [...bookmarks, ruleId];
    }
    setBookmarks(newBookmarks);
    localStorage.setItem('tajwid_bookmarks', JSON.stringify(newBookmarks));
  };

  const toggleRuleExpansion = (ruleId: string) => {
    setExpandedRules(prev => 
      prev.includes(ruleId) 
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  const getFilteredCategories = useCallback(() => {
    if (!data) return [];
    
    let filtered = data.data.categories;
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.map(category => {
        const filteredRules = category.rules.filter(rule => 
          rule.name[language].toLowerCase().includes(query) ||
          rule.definition[language].toLowerCase().includes(query) ||
          rule.letters?.some(letter => letter.includes(query)) ||
          rule.examples?.some(example => 
            example.arabic.includes(query) ||
            example.transliteration?.[language]?.toLowerCase().includes(query)
          )
        );
        
        return { ...category, rules: filteredRules };
      }).filter(category => category.rules.length > 0);
    }
    
    // Filter by bookmarks only
    if (showBookmarksOnly) {
      filtered = filtered.map(category => {
        const bookmarkedRules = category.rules.filter(rule => 
          bookmarks.includes(`${category.id}-${rule.id}`)
        );
        return { ...category, rules: bookmarkedRules };
      }).filter(category => category.rules.length > 0);
    }
    
    return filtered;
  }, [data, searchQuery, language, showBookmarksOnly, bookmarks]);

  const getRuleBookmarkId = (categoryId: string, ruleId: string) => {
    return `${categoryId}-${ruleId}`;
  };

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
      router.push('/tajwid');
    } else {
      setSelectedCategory(categoryId);
      router.push(`/tajwid?category=${categoryId}`);
    }
  };

  const handleShareRule = async (categoryName: string, ruleName: string, definition: string) => {
    const shareText = `Tajwid: ${categoryName} - ${ruleName}\n\n${definition}\n\nPelajari lebih lanjut di aplikasi quranku!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `quranku - ${ruleName}`,
          text: shareText,
          url: window.location.origin + '/tajwid',
        });
      } catch (error) {
        console.log('Error sharing:', error);
        // Fallback to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
          alert('Materi tajwid telah disalin ke clipboard!');
        });
      }
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Materi tajwid telah disalin ke clipboard!');
      });
    }
  };

  const renderRuleCard = (category: TajwidCategory, rule: TajwidRule) => {
    const isExpanded = expandedRules.includes(rule.id);
    const bookmarkId = getRuleBookmarkId(category.id, rule.id);
    const isBookmarked = bookmarks.includes(bookmarkId);

    return (
      <motion.div
        key={rule.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="p-4">
          {/* Rule Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-emerald-800">
                  {rule.name[language]}
                </h3>
                {rule.duration && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                    {rule.duration[language]}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {rule.definition[language]}
              </p>
            </div>
            
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => toggleBookmark(bookmarkId)}
                className="p-1.5 rounded-full hover:bg-gray-100 transition"
                title={isBookmarked ? "Hapus bookmark" : "Simpan bookmark"}
              >
                {isBookmarked ? (
                  <FaBookmark className="w-4 h-4 text-amber-500" />
                ) : (
                  <FaRegBookmark className="w-4 h-4 text-gray-400" />
                )}
              </button>
              <button
                onClick={() => handleShareRule(category.name[language], rule.name[language], rule.definition[language])}
                className="p-1.5 rounded-full hover:bg-gray-100 transition"
                title="Bagikan"
              >
                <FaShareAlt className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => toggleRuleExpansion(rule.id)}
                className="p-1.5 rounded-full hover:bg-gray-100 transition"
              >
                {isExpanded ? (
                  <FaChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <FaChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* Letters */}
          {rule.letters && rule.letters.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <FaHashtag className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">Huruf-huruf:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {rule.letters.map((letter, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-800 font-arabic text-lg rounded-lg border border-emerald-200"
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Expandable Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                {/* Examples */}
                {rule.examples && rule.examples.length > 0 && (
                  <div className="mb-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <FaListUl className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">Contoh:</span>
                    </div>
                    <div className="space-y-3">
                      {rule.examples.map((example, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3">
                          <div className="text-2xl font-arabic text-right mb-2 leading-relaxed">
                            {example.arabic}
                          </div>
                          {example.transliteration && (
                            <div className="text-sm text-gray-600">
                              {example.transliteration[language]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conditions */}
                {rule.conditions && rule.conditions.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaInfoCircle className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">Syarat:</span>
                    </div>
                    <ul className="space-y-1">
                      {rule.conditions.map((condition, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span className="text-sm text-gray-700">{condition[language]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notes */}
                {rule.notes && rule.notes.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FaBook className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700">Catatan:</span>
                    </div>
                    <ul className="space-y-1">
                      {rule.notes.map((note, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">•</span>
                          <span className="text-sm text-gray-700">{note[language]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 bg-emerald-100 rounded w-48 mb-6 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-2 bg-gray-200 rounded w-full mb-2" />
                <div className="h-2 bg-gray-200 rounded w-4/5" />
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
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <FaInfoCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Gagal Memuat Data</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchTajwidData}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredCategories = getFilteredCategories();
  const selectedCategoryData = selectedCategory 
    ? data?.data.categories.find(cat => cat.id === selectedCategory)
    : null;

  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-emerald-800">Tajwid</h1>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                  {data?.data.categories.length || 0} Kategori
                </span>
              </div>
              <p className="text-gray-600 text-sm mt-1">
                Panduan lengkap ilmu tajwid untuk membaca Al-Quran dengan benar
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-full text-sm font-medium flex items-center gap-1.5 hover:bg-gray-50 transition"
              >
                <FaLanguage className="w-3.5 h-3.5" />
                {language === 'id' ? 'English' : 'Indonesia'}
              </button>
              
              {bookmarks.length > 0 && (
                <button
                  onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition ${
                    showBookmarksOnly
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FaStar className="w-3.5 h-3.5" />
                  {bookmarks.length} Bookmark
                </button>
              )}
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari hukum tajwid, contoh, atau huruf..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className="px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 flex items-center justify-center gap-2 transition"
              >
                <FaFilter className="w-4 h-4" />
                <span>Semua Kategori</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Categories Sidebar */}
          <div className="lg:w-1/3">
            <div className="sticky top-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                  <FaListOl className="w-4 h-4" />
                  Daftar Kategori
                </h3>
                <div className="space-y-2">
                  {data?.data.categories.map((category) => {
                    const isSelected = selectedCategory === category.id;
                    const ruleCount = category.rules.length;
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryClick(category.id)}
                        className={`w-full text-left p-3 rounded-lg transition flex items-center justify-between group ${
                          isSelected
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600 group-hover:bg-emerald-50 group-hover:text-emerald-600'
                          }`}>
                            <span className="font-bold text-sm">{category.order}</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 group-hover:text-emerald-700">
                              {category.name[language]}
                            </div>
                            <div className="text-xs text-gray-500">
                              {ruleCount} aturan
                            </div>
                          </div>
                        </div>
                        <FaArrowRight className={`w-4 h-4 transition ${
                          isSelected ? 'text-emerald-600' : 'text-gray-400 group-hover:text-emerald-500'
                        }`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-4">
                <h4 className="font-bold mb-3">Statistik Tajwid</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-90">Total Kategori</span>
                    <span className="font-bold">{data?.data.categories.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-90">Total Aturan</span>
                    <span className="font-bold">
                      {data?.data.categories.reduce((sum, cat) => sum + cat.rules.length, 0) || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-90">Bookmark</span>
                    <span className="font-bold">{bookmarks.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-2/3">
            {searchQuery && filteredCategories.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <FaSearch className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ditemukan</h3>
                <p className="text-gray-600">
                  Tidak ada aturan tajwid yang sesuai dengan pencarian "{searchQuery}"
                </p>
              </div>
            ) : (
              <>
                {/* Category Header */}
                {selectedCategoryData && (
                  <div className="mb-6">
                    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-100 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">
                              Kategori {selectedCategoryData.order}
                            </span>
                            <h2 className="text-xl font-bold text-emerald-900">
                              {selectedCategoryData.name[language]}
                            </h2>
                          </div>
                          {selectedCategoryData.description && (
                            <p className="text-gray-700">
                              {selectedCategoryData.description[language]}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className="p-2 rounded-lg hover:bg-white/50 transition"
                        >
                          <span className="text-sm font-medium text-emerald-700">Lihat Semua</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <FaListUl className="w-3.5 h-3.5" />
                          {selectedCategoryData.rules.length} aturan
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FaBook className="w-3.5 h-3.5" />
                          Sumber: {data?.data.metadata.source}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rules List */}
                <div>
                  {selectedCategoryData ? (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        Aturan dalam Kategori
                      </h3>
                      {selectedCategoryData.rules.map((rule) => 
                        renderRuleCard(selectedCategoryData, rule)
                      )}
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        {showBookmarksOnly ? 'Bookmark Tajwid' : 'Semua Aturan Tajwid'}
                      </h3>
                      {filteredCategories.map((category) => (
                        <div key={category.id} className="mb-8">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                              <span className="font-bold text-emerald-700">{category.order}</span>
                            </div>
                            <div>
                              <h4 className="font-bold text-lg text-emerald-800">
                                {category.name[language]}
                              </h4>
                              {category.description && (
                                <p className="text-sm text-gray-600">
                                  {category.description[language]}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="space-y-4">
                            {category.rules.map((rule) => 
                              renderRuleCard(category, rule)
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Empty State */}
                {filteredCategories.length === 0 && !selectedCategoryData && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                      <FaStar className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Belum ada bookmark
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Bookmark aturan tajwid untuk mengaksesnya dengan cepat
                    </p>
                    <button
                      onClick={() => setShowBookmarksOnly(false)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                    >
                      Lihat Semua Tajwid
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Footer Info */}
            {data && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500 text-center">
                  <p>
                    Sumber: {data.data.metadata.source} • 
                    Penyusun: {data.data.metadata.compiler[language]} • 
                    Versi API: {data.version}
                  </p>
                  <p className="mt-1">
                    Untuk penggunaan edukasi • Terakhir diperbarui: {new Date(data.timestamp).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Arabic Font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
        .font-arabic {
          font-family: 'Amiri', serif;
          line-height: 2;
        }
      `}</style>
    </div>
  );
}

// Komponen halaman utama dengan Suspense
export default function TajwidPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen p-4 bg-gradient-to-b from-emerald-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="h-8 bg-emerald-100 rounded w-48 mb-6 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-64 mb-4" />
            <div className="h-10 bg-gray-200 rounded-lg mb-6" />
          </div>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/3">
              <div className="h-64 bg-gray-200 rounded-xl mb-4 animate-pulse" />
              <div className="h-32 bg-emerald-200 rounded-xl animate-pulse" />
            </div>
            <div className="lg:w-2/3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-white rounded-xl border border-gray-200 mb-4 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    }>
      <TajwidContent />
    </Suspense>
  );
}