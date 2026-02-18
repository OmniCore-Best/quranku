'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FaMapMarkerAlt, 
  FaSync, 
  FaCalendarAlt,
  FaClock,
  FaChevronDown,
  FaChevronUp,
  FaLocationArrow,
  FaSearch,
  FaCloud,
  FaMoon,
  FaSun,
  FaCloudMoon,
  FaDatabase,
  FaCloudDownloadAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import { CiCloudSun } from "react-icons/ci";
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// ==================== TYPE DEFINITIONS ====================

interface Province {
  name: string;
  slug: string;
  city_count: number;
}

interface City {
  name: string;
  slug: string;
  province: string;
}

interface PrayerTime {
  name: string;
  time_24h: string;
  is_next: boolean;
}

interface DailySchedule {
  prayers: PrayerTime[];
  next_prayer: PrayerTime;
}

interface MonthlyScheduleDay {
  date: string;
  hijri_date: string;
  is_today: boolean;
  prayers: {
    imsak: string;
    subuh: string;
    terbit: string;
    dzuhur: string;
    ashar: string;
    maghrib: string;
    isya: string;
  };
}

interface PrayerSchedule {
  city: {
    name: string;
    date_today: string;
    hijri_date: string;
  };
  today_schedule: DailySchedule;
  monthly_schedule: MonthlyScheduleDay[];
}

// ==================== MAIN COMPONENT ====================

export default function SchedulePage() {
  // State management
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [schedule, setSchedule] = useState<PrayerSchedule | null>(null);
  const [loading, setLoading] = useState({
    provinces: false,
    cities: false,
    schedule: false
  });
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreProvinces, setHasMoreProvinces] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showMonthlyView, setShowMonthlyView] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [daysToShow, setDaysToShow] = useState(7);

  // ==================== UTILITY FUNCTIONS ====================

  const getPrayerIcon = (prayerName: string) => {
    const lowerName = prayerName.toLowerCase();
    if (lowerName.includes('imsak') || lowerName.includes('imsyak')) {
      return <FaMoon className="w-4 h-4" />;
    }
    if (lowerName.includes('subuh')) return <FaSun className="w-4 h-4" />;
    if (lowerName.includes('terbit')) return <FaSun className="w-4 h-4" />;
    if (lowerName.includes('dzuhur') || lowerName.includes('dhuhur')) return <CiCloudSun className="w-4 h-4" />;
    if (lowerName.includes('ashar') || lowerName.includes('asr')) return <FaCloud className="w-4 h-4" />;
    if (lowerName.includes('maghrib')) return <FaCloudMoon className="w-4 h-4" />;
    if (lowerName.includes('isya')) return <FaMoon className="w-4 h-4" />;
    return <FaClock className="w-4 h-4" />;
  };

  const formatTime = (time24h: string) => {
    const [hours, minutes] = time24h.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getTimeRemaining = (time24h: string) => {
    const [hours, minutes] = time24h.split(':').map(Number);
    const prayerTime = new Date();
    prayerTime.setHours(hours, minutes, 0, 0);
    
    const now = new Date();
    const diffMs = prayerTime.getTime() - now.getTime();
    
    if (diffMs < 0) return null;
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours} jam ${diffMinutes} menit`;
    }
    return `${diffMinutes} menit`;
  };

  const filteredProvinces = provinces.filter(province =>
    province.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    province.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadMoreDays = () => {
    if (schedule) {
      const maxDays = schedule.monthly_schedule.length;
      const newDaysToShow = Math.min(daysToShow + 7, maxDays);
      setDaysToShow(newDaysToShow);
      
      if (newDaysToShow >= maxDays) {
        toast.success('Semua jadwal bulanan telah ditampilkan');
      } else {
        toast.info(`Menampilkan ${newDaysToShow} hari`);
      }
    }
  };

  // ==================== API FUNCTIONS ====================

  const fetchProvinces = async (page: number = 1) => {
    if (loading.provinces) return;
    
    setLoading(prev => ({ ...prev, provinces: true }));
    
    try {
      const cachedProvinces = localStorage.getItem('cachedProvinces');
      const cacheTime = localStorage.getItem('cachedProvincesTime');
      
      if (cachedProvinces && cacheTime) {
        const cacheDate = new Date(parseInt(cacheTime));
        const now = new Date();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        
        if (now.getTime() - cacheDate.getTime() < oneWeek) {
          setProvinces(JSON.parse(cachedProvinces));
          setLoading(prev => ({ ...prev, provinces: false }));
          
          if (isOnline) {
            fetchProvincesFromAPI(page);
          }
          return;
        }
      }

      if (!isOnline) {
        toast.warning('Sedang offline, menggunakan data cache terakhir');
        setLoading(prev => ({ ...prev, provinces: false }));
        return;
      }

      await fetchProvincesFromAPI(page);
    } catch (error) {
      console.error('Error fetching provinces:', error);
      toast.error('Gagal memuat daftar provinsi');
      setLoading(prev => ({ ...prev, provinces: false }));
    }
  };

  const fetchProvincesFromAPI = async (page: number = 1) => {
    try {
      const response = await fetch(
        `https://api.devnova.icu/api/islamic/prayer-time?type=provinces&page=${page}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.provinces) {
        setProvinces(prev => page === 1 ? data.data.provinces : [...prev, ...data.data.provinces]);
        setHasMoreProvinces(!!data.data.pagination?.has_next);
        setCurrentPage(page);
        
        localStorage.setItem('cachedProvinces', JSON.stringify(data.data.provinces));
        localStorage.setItem('cachedProvincesTime', Date.now().toString());
      } else {
        throw new Error('Invalid API response structure');
      }
    } catch (error) {
      console.error('Error in fetchProvincesFromAPI:', error);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, provinces: false }));
    }
  };

  const fetchCities = async (provinceSlug: string, targetCitySlug?: string) => {
    if (!provinceSlug || loading.cities) return;
    
    setLoading(prev => ({ ...prev, cities: true }));
    
    try {
      const cacheKey = `cachedCities_${provinceSlug}`;
      const cachedCities = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      if (cachedCities && cacheTime) {
        const cacheDate = new Date(parseInt(cacheTime));
        const now = new Date();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        
        if (now.getTime() - cacheDate.getTime() < oneWeek) {
          const citiesData = JSON.parse(cachedCities);
          setCities(citiesData);
          
          if (targetCitySlug) {
            const city = citiesData.find((c: City) => c.slug === targetCitySlug);
            if (city) {
              setSelectedCity(city);
            }
          } else if (citiesData.length > 0) {
            setSelectedCity(citiesData[0]);
          }
          
          setLoading(prev => ({ ...prev, cities: false }));
          
          if (isOnline) {
            fetchCitiesFromAPI(provinceSlug, targetCitySlug);
          }
          return;
        }
      }

      if (!isOnline) {
        toast.warning('Sedang offline, menggunakan data cache terakhir');
        setLoading(prev => ({ ...prev, cities: false }));
        return;
      }

      await fetchCitiesFromAPI(provinceSlug, targetCitySlug);
    } catch (error) {
      console.error('Error fetching cities:', error);
      toast.error('Gagal memuat daftar kota');
      setLoading(prev => ({ ...prev, cities: false }));
    }
  };

  const fetchCitiesFromAPI = async (provinceSlug: string, targetCitySlug?: string) => {
    try {
      const response = await fetch(
        `https://api.devnova.icu/api/islamic/prayer-time?type=cities&province=${provinceSlug}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.cities) {
        setCities(data.data.cities);
        
        const cacheKey = `cachedCities_${provinceSlug}`;
        localStorage.setItem(cacheKey, JSON.stringify(data.data.cities));
        localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
        
        if (targetCitySlug) {
          const city = data.data.cities.find((c: City) => c.slug === targetCitySlug);
          if (city) {
            setSelectedCity(city);
          }
        } else if (data.data.cities.length > 0) {
          setSelectedCity(data.data.cities[0]);
        }
      } else {
        throw new Error('Invalid API response structure');
      }
    } catch (error) {
      console.error('Error in fetchCitiesFromAPI:', error);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, cities: false }));
    }
  };

  const fetchSchedule = async () => {
    if (!selectedProvince || !selectedCity || loading.schedule) return;
    
    setLoading(prev => ({ ...prev, schedule: true }));
    
    try {
      const cacheKey = `prayerSchedule_${selectedProvince.slug}_${selectedCity.slug}`;
      const cachedSchedule = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      if (cachedSchedule && cacheTime) {
        const cacheDate = new Date(parseInt(cacheTime));
        const now = new Date();
        
        if (now.getTime() - cacheDate.getTime() < 24 * 60 * 60 * 1000) {
          const scheduleData = JSON.parse(cachedSchedule);
          
          if (scheduleData && scheduleData.city) {
            setSchedule(scheduleData);
            setLoading(prev => ({ ...prev, schedule: false }));
            
            if (isOnline) {
              fetchScheduleFromAPI();
            }
            return;
          }
        }
      }

      if (!isOnline) {
        toast.warning('Sedang offline, menggunakan data cache terakhir');
        setLoading(prev => ({ ...prev, schedule: false }));
        return;
      }

      await fetchScheduleFromAPI();
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Gagal memuat jadwal sholat');
      setLoading(prev => ({ ...prev, schedule: false }));
    }
  };

  const fetchScheduleFromAPI = async () => {
    if (!selectedProvince || !selectedCity) return;
    
    try {
      const response = await fetch(
        `https://api.devnova.icu/api/islamic/prayer-time?type=schedule&province=${selectedProvince.slug}&city=${selectedCity.slug}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setSchedule(data.data);
        
        const cacheKey = `prayerSchedule_${selectedProvince.slug}_${selectedCity.slug}`;
        localStorage.setItem(cacheKey, JSON.stringify(data.data));
        localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
        
        // Simpan pilihan lokasi ke localStorage
        const location = {
          province: selectedProvince.name,
          province_slug: selectedProvince.slug,
          city: selectedCity.name,
          city_slug: selectedCity.slug
        };
        localStorage.setItem('prayerLocation', JSON.stringify(location));
      } else {
        throw new Error('Invalid API response structure');
      }
    } catch (error) {
      console.error('Error in fetchScheduleFromAPI:', error);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, schedule: false }));
    }
  };

  const handleProvinceSelect = (province: Province) => {
    setSelectedProvince(province);
    setSelectedCity(null);
    setShowProvinceDropdown(false);
    setSearchQuery('');
    fetchCities(province.slug);
  };

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setShowCityDropdown(false);
    setSearchQuery('');
  };

  // ==================== EFFECTS ====================

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Koneksi internet kembali');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Anda sedang offline', {
        description: 'Data akan diambil dari cache lokal'
      });
    };
    
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Load saved location from localStorage after provinces are loaded
  useEffect(() => {
    const savedLocation = localStorage.getItem('prayerLocation');
    if (savedLocation && provinces.length > 0) {
      try {
        const location = JSON.parse(savedLocation);
        const province = provinces.find(p => p.slug === location.province_slug);
        if (province) {
          setSelectedProvince(province);
          fetchCities(province.slug, location.city_slug);
        }
      } catch (error) {
        console.error('Error parsing saved location:', error);
      }
    }
  }, [provinces]);

  useEffect(() => {
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (selectedProvince && selectedCity) {
      fetchSchedule();
    }
  }, [selectedProvince, selectedCity]);

  // ==================== RENDER ====================
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 pb-32">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Jadwal Sholat
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                Jadwal sholat lengkap untuk seluruh Indonesia
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {isOnline ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-medium text-emerald-700">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full">
                  <FaCloud className="w-3 h-3 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">Offline</span>
                </div>
              )}
              
              <button
                onClick={() => {
                  if (selectedProvince && selectedCity) {
                    fetchSchedule();
                  }
                }}
                disabled={!selectedProvince || !selectedCity || loading.schedule}
                className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 transition"
                title="Refresh jadwal"
              >
                <FaSync className={`w-4 h-4 ${loading.schedule ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* LOCATION SELECTOR - MANUAL ONLY */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-4 mb-6 shadow-sm shadow-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <FaMapMarkerAlt className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-700">Pilih Lokasi</span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Province Selector */}
              <div className="relative">
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Provinsi
                </label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowProvinceDropdown(!showProvinceDropdown);
                      setShowCityDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left bg-white border border-slate-300 rounded-xl hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 flex items-center justify-between group"
                    disabled={loading.provinces}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition">
                        <FaMapMarkerAlt className="w-3 h-3 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-slate-900 truncate max-w-[180px]">
                          {selectedProvince ? selectedProvince.name : 'Pilih Provinsi'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {selectedProvince ? `${selectedProvince.city_count} kota` : 'Pilih provinsi'}
                        </div>
                      </div>
                    </div>
                    {showProvinceDropdown ? (
                      <FaChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <FaChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showProvinceDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-300/50 overflow-hidden z-[9999]"
                      >
                        <div className="p-3 border-b border-slate-100">
                          <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                              type="text"
                              placeholder="Cari provinsi..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                        </div>
                        
                        <div className="max-h-64 overflow-y-auto">
                          {loading.provinces ? (
                            <div className="p-4 text-center text-slate-500 text-sm">
                              <FaSync className="w-4 h-4 animate-spin mx-auto mb-2" />
                              Memuat provinsi...
                            </div>
                          ) : filteredProvinces.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 text-sm">
                              Tidak ditemukan
                            </div>
                          ) : (
                            filteredProvinces.map((province) => (
                              <button
                                key={province.slug}
                                onClick={() => handleProvinceSelect(province)}
                                className={`w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between transition-colors ${
                                  selectedProvince?.slug === province.slug ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-slate-900">{province.name}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    {province.city_count} kota/kabupaten
                                  </div>
                                </div>
                                {selectedProvince?.slug === province.slug && (
                                  <div className="ml-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                  </div>
                                )}
                              </button>
                            ))
                          )}
                          
                          {hasMoreProvinces && filteredProvinces.length > 0 && !loading.provinces && (
                            <button
                              onClick={() => fetchProvinces(currentPage + 1)}
                              disabled={loading.provinces}
                              className="w-full px-4 py-3 text-center text-blue-600 hover:bg-blue-50 border-t border-slate-100 text-sm font-medium"
                            >
                              {loading.provinces ? (
                                <span className="flex items-center justify-center gap-2">
                                  <FaSync className="w-3 h-3 animate-spin" />
                                  Memuat...
                                </span>
                              ) : (
                                'Muat lebih banyak'
                              )}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* City Selector */}
              <div className="relative">
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Kota/Kabupaten
                </label>
                <div className="relative">
                  <button
                    onClick={() => {
                      if (selectedProvince) {
                        setShowCityDropdown(!showCityDropdown);
                        setShowProvinceDropdown(false);
                      }
                    }}
                    disabled={!selectedProvince || loading.cities}
                    className={`w-full px-4 py-3 text-left bg-white border rounded-xl transition-all duration-200 flex items-center justify-between group ${
                      !selectedProvince
                        ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                        : 'border-slate-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                        !selectedProvince ? 'bg-slate-100' : 'bg-blue-50 group-hover:bg-blue-100'
                      }`}>
                        <FaLocationArrow className={`w-3 h-3 ${
                          !selectedProvince ? 'text-slate-400' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="text-left">
                        <div className="font-medium truncate max-w-[180px]">
                          {selectedCity ? selectedCity.name : 'Pilih Kota'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {selectedProvince ? selectedProvince.name : 'Pilih provinsi dulu'}
                        </div>
                      </div>
                    </div>
                    {showCityDropdown ? (
                      <FaChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <FaChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showCityDropdown && selectedProvince && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-300/50 overflow-hidden z-[9999]"
                      >
                        <div className="p-3 border-b border-slate-100">
                          <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                              type="text"
                              placeholder="Cari kota..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                        </div>
                        
                        <div className="max-h-64 overflow-y-auto">
                          {loading.cities ? (
                            <div className="p-4 text-center text-slate-500 text-sm">
                              <FaSync className="w-4 h-4 animate-spin mx-auto mb-2" />
                              Memuat kota...
                            </div>
                          ) : filteredCities.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 text-sm">
                              {searchQuery ? 'Kota tidak ditemukan' : 'Memuat kota...'}
                            </div>
                          ) : (
                            filteredCities.map((city) => (
                              <button
                                key={city.slug}
                                onClick={() => handleCitySelect(city)}
                                className={`w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between transition-colors ${
                                  selectedCity?.slug === city.slug ? 'bg-blue-50' : ''
                                }`}
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-slate-900">{city.name}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    {city.province}
                                  </div>
                                </div>
                                {selectedCity?.slug === city.slug && (
                                  <div className="ml-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                  </div>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          {/* TODAY'S INFO */}
          {schedule && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white rounded-2xl p-5 mb-6 shadow-lg shadow-blue-200"
            >
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="text-center lg:text-left">
                  <div className="text-sm opacity-90 mb-1">Hari ini</div>
                  <div className="text-xl font-bold">{schedule.city.date_today}</div>
                  <div className="text-sm opacity-80 mt-1">{schedule.city.hijri_date}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm opacity-90 mb-1">Lokasi</div>
                  <div className="text-xl font-bold">{schedule.city.name}</div>
                </div>
                
                <div className="text-center lg:text-right">
                  <div className="text-sm opacity-90 mb-1">Waktu Sekarang</div>
                  <div className="text-xl font-bold">
                    {currentTime.toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* MAIN CONTENT AREA */}
        {loading.schedule ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-3 border-blue-500 border-t-transparent mb-4"></div>
            <div className="text-slate-600">Memuat jadwal sholat...</div>
            <div className="text-sm text-slate-500 mt-2">
              {selectedCity?.name}, {selectedProvince?.name}
            </div>
          </div>
        ) : schedule ? (
          <>
            {/* PRAYER TIMES GRID */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Waktu Sholat Hari Ini</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {schedule.city.date_today} • {schedule.city.hijri_date}
                  </p>
                </div>
                <button
                  onClick={() => setShowMonthlyView(!showMonthlyView)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-700 transition"
                >
                  <FaCalendarAlt className="w-4 h-4" />
                  {showMonthlyView ? 'Tampilkan Harian' : 'Tampilkan Bulanan'}
                </button>
              </div>

              {!showMonthlyView ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
                  {schedule.today_schedule.prayers.map((prayer) => {
                    const timeRemaining = getTimeRemaining(prayer.time_24h);
                    const isNextPrayer = prayer.is_next;
                    
                    return (
                      <motion.div
                        key={prayer.name}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -4 }}
                        className={`relative rounded-xl p-4 border-2 transition-all duration-300 ${
                          isNextPrayer
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        {isNextPrayer && (
                          <div className="absolute -top-2 -right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg">
                            SELANJUTNYA
                          </div>
                        )}
                        
                        <div className="flex flex-col items-center text-center">
                          <div className={`p-3 rounded-full mb-3 transition ${
                            isNextPrayer ? 'bg-white/20' : 'bg-blue-50'
                          }`}>
                            {getPrayerIcon(prayer.name)}
                          </div>
                          
                          <div className="mb-2">
                            <div className={`text-lg font-bold ${
                              isNextPrayer ? 'text-white' : 'text-slate-900'
                            }`}>
                              {formatTime(prayer.time_24h)}
                            </div>
                            <div className={`text-sm ${
                              isNextPrayer ? 'text-blue-100' : 'text-slate-600'
                            }`}>
                              {prayer.time_24h}
                            </div>
                          </div>
                          
                          <div className={`text-sm font-semibold mb-2 ${
                            isNextPrayer ? 'text-white' : 'text-slate-800'
                          }`}>
                            {prayer.name}
                          </div>
                          
                          {timeRemaining && isNextPrayer && (
                            <div className="text-xs bg-white/20 rounded-lg px-3 py-1.5 mt-1 backdrop-blur-sm flex items-center gap-1">
                              <FaClock className="w-3 h-3" />
                              {timeRemaining} lagi
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                        <tr>
                          <th className="px-4 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider border-r border-slate-200">
                            Tanggal
                          </th>
                          {['Imsak', 'Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].map((prayer) => (
                            <th key={prayer} className="px-4 py-4 text-center text-sm font-semibold text-slate-700 uppercase tracking-wider border-r border-slate-200 last:border-r-0">
                              {prayer}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {schedule.monthly_schedule.slice(0, daysToShow).map((day) => (
                          <tr
                            key={day.date}
                            className={`hover:bg-blue-50/50 transition ${
                              day.is_today ? 'bg-blue-50' : ''
                            }`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center ${
                                  day.is_today
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  <span className="text-sm font-bold">{day.date.split('-')[2]}</span>
                                  <span className="text-[10px] opacity-80">Hijri</span>
                                </div>
                                <div className="text-left">
                                  <div className="text-sm font-medium text-slate-900">
                                    {day.date}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {day.hijri_date.trim()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {['imsak', 'subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'].map((prayer) => (
                              <td key={prayer} className="px-4 py-3 whitespace-nowrap text-center">
                                <div className="text-sm font-medium text-slate-900">
                                  {day.prayers[prayer as keyof typeof day.prayers]}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  {formatTime(day.prayers[prayer as keyof typeof day.prayers])}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {daysToShow < schedule.monthly_schedule.length && (
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-center">
                      <button 
                        onClick={loadMoreDays}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                      >
                        <span>Tampilkan lebih banyak hari</span>
                        <FaChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* NEXT PRAYER HIGHLIGHT */}
            {schedule.today_schedule.next_prayer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 text-white rounded-2xl p-6 mb-8 overflow-hidden shadow-xl"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-sm mb-4">
                      <span>Sholat Selanjutnya</span>
                    </div>
                    
                    <div className="p-4 bg-white/20 rounded-2xl mb-4">
                      <div className="p-4 bg-white/30 rounded-full">
                        {getPrayerIcon(schedule.today_schedule.next_prayer.name)}
                      </div>
                    </div>
                    
                    <h3 className="text-2xl sm:text-3xl font-bold mb-2">
                      {schedule.today_schedule.next_prayer.name}
                    </h3>
                    
                    <div className="text-xl opacity-90 flex items-center justify-center gap-2 mb-6">
                      <FaClock className="w-5 h-5" />
                      {formatTime(schedule.today_schedule.next_prayer.time_24h)}
                      <span className="text-lg opacity-75">
                        ({schedule.today_schedule.next_prayer.time_24h})
                      </span>
                    </div>
                    
                    <div className="mb-6 w-full max-w-md">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-sm mb-3">
                        <FaClock className="w-3 h-3" />
                        <span>Sisa Waktu</span>
                      </div>
                      <div className="text-3xl sm:text-4xl font-bold bg-white/10 rounded-2xl px-8 py-4 backdrop-blur-sm">
                        {getTimeRemaining(schedule.today_schedule.next_prayer.time_24h) || 'WAKTU TELAH TIBA'}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-md">
                      <button
                        onClick={() => {
                          const shareText = `Waktu sholat ${schedule.today_schedule.next_prayer.name} di ${schedule.city.name} adalah ${schedule.today_schedule.next_prayer.time_24h}. Ayo sholat tepat waktu!`;
                          if (navigator.share) {
                            navigator.share({
                              title: `Waktu Sholat ${schedule.today_schedule.next_prayer.name}`,
                              text: shareText,
                            });
                          } else {
                            navigator.clipboard.writeText(shareText);
                            toast.success('Jadwal sholat disalin ke clipboard');
                          }
                        }}
                        className="px-6 py-3 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30 transition flex items-center justify-center gap-2 border border-white/30"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        Bagikan
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {!isOnline && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="flex items-start gap-3">
                  <FaCloudDownloadAlt className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-amber-900">Mode Offline</div>
                    <div className="text-sm text-amber-800 mt-1">
                      Anda sedang offline. Data yang ditampilkan adalah data terakhir yang di-cache.
                      Beberapa fitur mungkin tidak tersedia.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* EMPTY STATE - hanya tampil jika tidak ada dropdown yang terbuka */
          !showProvinceDropdown && !showCityDropdown && (
            <div className="text-center py-12 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center border border-blue-200">
                <FaClock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {selectedProvince && selectedCity ? 'Memuat Jadwal...' : 'Pilih Provinsi dan Kota'}
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                {selectedProvince && selectedCity 
                  ? `Memuat jadwal sholat untuk ${selectedCity.name}, ${selectedProvince.name}`
                  : 'Pilih provinsi dan kota/kabupaten untuk melihat jadwal sholat di lokasi Anda'
                }
              </p>
              
              {!isOnline && (
                <div className="inline-flex items-center gap-2 px-4 py-3 bg-slate-100 rounded-xl">
                  <FaDatabase className="w-4 h-4 text-slate-600" />
                  <span className="text-sm text-slate-700">
                    Mode Offline • Data dari cache lokal
                  </span>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}