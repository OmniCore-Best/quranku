'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FaMapMarkerAlt, 
  FaBell, 
  FaBellSlash, 
  FaSync, 
  FaCalendarAlt,
  FaClock,
  FaChevronDown,
  FaChevronUp,
  FaLocationArrow,
  FaSearch,
  FaCloud,
  FaWifi,
  FaMobileAlt,
  FaMoon,
  FaSun,
  FaCloudSun,
  FaCloudMoon,
  FaStar,
  FaSave,
  FaDatabase
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { db } from '@/lib/db';

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

interface UserLocation {
  province: string;
  province_slug: string;
  city: string;
  city_slug: string;
  latitude?: number;
  longitude?: number;
}

interface NotificationSettings {
  enabled: boolean;
  advanceMinutes: number;
  prayerTypes: string[];
}

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
    schedule: false,
    location: false
  });
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreProvinces, setHasMoreProvinces] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showMonthlyView, setShowMonthlyView] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    enabled: false,
    advanceMinutes: 10,
    prayerTypes: ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya']
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Load initial data
  useEffect(() => {
    checkNotificationPermission();
    loadNotificationSettings();
    loadUserLocation();
    fetchProvinces();
  }, []);

  // Fetch schedule when location changes
  useEffect(() => {
    if (selectedProvince && selectedCity) {
      fetchSchedule();
    }
  }, [selectedProvince, selectedCity]);

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const saved = localStorage.getItem('prayerNotificationSettings');
      if (saved) {
        setNotificationSettings(JSON.parse(saved));
      }
      
      // Cek subscription status
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveNotificationSettings = async () => {
    setIsSavingSettings(true);
    try {
      localStorage.setItem('prayerNotificationSettings', JSON.stringify(notificationSettings));
      
      // Jika notification diaktifkan dan belum ada permission, minta permission
      if (notificationSettings.enabled && notificationPermission !== 'granted') {
        await requestNotificationPermission();
      }
      
      // Jika notification diaktifkan dan permission sudah granted, subscribe
      if (notificationSettings.enabled && notificationPermission === 'granted') {
        await subscribeToPushNotifications();
      }
      
      // Jika notification dimatikan, unsubscribe
      if (!notificationSettings.enabled && isSubscribed) {
        await unsubscribeFromPushNotifications();
      }
      
      toast.success('Pengaturan notifikasi disimpan');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const loadUserLocation = async () => {
    setLoading(prev => ({ ...prev, location: true }));
    
    try {
      // Coba ambil dari localStorage terlebih dahulu
      const savedLocation = localStorage.getItem('prayerLocation');
      if (savedLocation) {
        const location = JSON.parse(savedLocation);
        setUserLocation(location);
        setSelectedProvince({ 
          name: location.province, 
          slug: location.province_slug, 
          city_count: 0 
        });
        
        // Cari kota yang sesuai
        await fetchCities(location.province_slug, location.city_slug);
        setLoading(prev => ({ ...prev, location: false }));
        return;
      }

      // Coba deteksi lokasi GPS
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              // Reverse geocoding menggunakan API gratis
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
              );
              const data = await response.json();
              
              if (data.address) {
                // Cari provinsi berdasarkan nama
                const provinceName = data.address.state || data.address.province;
                if (provinceName) {
                  // Normalize province name
                  const normalizedName = normalizeProvinceName(provinceName);
                  await autoSelectLocation(normalizedName);
                }
              }
            } catch (error) {
              console.error('Geocoding error:', error);
              await autoSelectLocation('dki-jakarta');
            }
          },
          async (error) => {
            console.error('Geolocation error:', error);
            // Fallback ke lokasi default
            await autoSelectLocation('dki-jakarta');
          },
          { 
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 60000 
          }
        );
      } else {
        await autoSelectLocation('dki-jakarta');
      }
    } catch (error) {
      console.error('Location loading error:', error);
      await autoSelectLocation('dki-jakarta');
    } finally {
      setLoading(prev => ({ ...prev, location: false }));
    }
  };

  const normalizeProvinceName = (name: string): string => {
    const provinceMap: Record<string, string> = {
      'jakarta': 'dki-jakarta',
      'bali': 'bali',
      'jawa barat': 'west-java',
      'jawa tengah': 'central-java',
      'jawa timur': 'east-java',
      'yogyakarta': 'yogyakarta',
      'sumatera utara': 'north-sumatra',
      'sumatera barat': 'west-sumatra',
      'riau': 'riau',
      'kepulauan riau': 'riau-islands',
      'jambi': 'jambi',
      'sumatera selatan': 'south-sumatra',
      'bengkulu': 'bengkulu',
      'lampung': 'lampung',
      'bangka belitung': 'bangka-belitung-islands',
      'kalimantan barat': 'west-kalimantan',
      'kalimantan tengah': 'central-kalimantan',
      'kalimantan selatan': 'south-kalimantan',
      'kalimantan timur': 'east-kalimantan',
      'kalimantan utara': 'north-kalimantan',
      'sulawesi utara': 'north-sulawesi',
      'sulawesi tengah': 'central-sulawesi',
      'sulawesi selatan': 'south-sulawesi',
      'sulawesi tenggara': 'southeast-sulawesi',
      'gorontalo': 'gorontalo',
      'sulawesi barat': 'west-sulawesi',
      'maluku': 'maluku',
      'maluku utara': 'north-maluku',
      'papua': 'papua',
      'papua barat': 'west-papua',
      'aceh': 'aceh',
      'banten': 'banten'
    };

    const lowerName = name.toLowerCase();
    return provinceMap[lowerName] || lowerName.replace(/\s+/g, '-');
  };

  const autoSelectLocation = async (provinceSlug: string) => {
    try {
      // Fetch provinces jika belum ada
      if (provinces.length === 0) {
        await fetchProvinces();
      }

      // Cari provinsi
      const province = provinces.find(p => p.slug === provinceSlug);
      if (province) {
        setSelectedProvince(province);
        
        // Fetch cities untuk provinsi ini
        await fetchCities(provinceSlug);
      }
    } catch (error) {
      console.error('Auto select error:', error);
    }
  };

  const fetchProvinces = async (page: number = 1) => {
    if (loading.provinces) return;
    
    setLoading(prev => ({ ...prev, provinces: true }));
    
    try {
      // Coba ambil dari cache offline dulu
      const cachedProvinces = localStorage.getItem('cachedProvinces');
      const cacheTime = localStorage.getItem('cachedProvincesTime');
      
      if (cachedProvinces && cacheTime) {
        const cacheDate = new Date(parseInt(cacheTime));
        const now = new Date();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        
        if (now.getTime() - cacheDate.getTime() < oneWeek) {
          setProvinces(JSON.parse(cachedProvinces));
          setLoading(prev => ({ ...prev, provinces: false }));
          
          // Jika online, tetap fetch data terbaru di background
          if (isOnline) {
            fetchProvincesFromAPI(page);
          }
          return;
        }
      }

      // Jika offline dan tidak ada cache
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
    const response = await fetch(
      `https://api.devnova.icu/api/islamic/prayer-time?type=provinces&page=${page}`
    );
    
    if (response.ok) {
      const data = await response.json();
      setProvinces(prev => page === 1 ? data.data.provinces : [...prev, ...data.data.provinces]);
      setHasMoreProvinces(!!data.data.pagination?.has_next);
      setCurrentPage(page);
      
      // Simpan ke cache
      localStorage.setItem('cachedProvinces', JSON.stringify(data.data.provinces));
      localStorage.setItem('cachedProvincesTime', Date.now().toString());
    }
  };

  const fetchCities = async (provinceSlug: string, targetCitySlug?: string) => {
    if (!provinceSlug || loading.cities) return;
    
    setLoading(prev => ({ ...prev, cities: true }));
    
    try {
      // Cek cache offline
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
          
          // Pilih kota jika ada target
          if (targetCitySlug) {
            const city = citiesData.find((c: City) => c.slug === targetCitySlug);
            if (city) {
              setSelectedCity(city);
            }
          } else if (citiesData.length > 0) {
            setSelectedCity(citiesData[0]);
          }
          
          setLoading(prev => ({ ...prev, cities: false }));
          
          // Jika online, fetch data terbaru di background
          if (isOnline) {
            fetchCitiesFromAPI(provinceSlug, targetCitySlug);
          }
          return;
        }
      }

      // Jika offline dan tidak ada cache
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
    const response = await fetch(
      `https://api.devnova.icu/api/islamic/prayer-time?type=cities&province=${provinceSlug}`
    );
    
    if (response.ok) {
      const data = await response.json();
      setCities(data.data.cities);
      
      // Simpan ke cache
      const cacheKey = `cachedCities_${provinceSlug}`;
      localStorage.setItem(cacheKey, JSON.stringify(data.data.cities));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
      // Pilih kota jika ada target
      if (targetCitySlug) {
        const city = data.data.cities.find((c: City) => c.slug === targetCitySlug);
        if (city) {
          setSelectedCity(city);
        }
      } else if (data.data.cities.length > 0) {
        setSelectedCity(data.data.cities[0]);
      }
    }
  };

  const fetchSchedule = async () => {
    if (!selectedProvince || !selectedCity || loading.schedule) return;
    
    setLoading(prev => ({ ...prev, schedule: true }));
    
    try {
      // Cek cache offline
      const cacheKey = `prayerSchedule_${selectedProvince.slug}_${selectedCity.slug}`;
      const cachedSchedule = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      const today = new Date().toISOString().split('T')[0];
      
      if (cachedSchedule && cacheTime) {
        const cacheDate = new Date(parseInt(cacheTime));
        const now = new Date();
        
        // Cache valid untuk 24 jam
        if (now.getTime() - cacheDate.getTime() < 24 * 60 * 60 * 1000) {
          const scheduleData = JSON.parse(cachedSchedule);
          
          // Cek apakah data untuk hari ini
          if (scheduleData.city?.date_today === today) {
            setSchedule(scheduleData);
            setLoading(prev => ({ ...prev, schedule: false }));
            
            // Jika online, fetch data terbaru di background
            if (isOnline) {
              fetchScheduleFromAPI();
            }
            return;
          }
        }
      }

      // Jika offline dan tidak ada cache valid
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
    
    const response = await fetch(
      `https://api.devnova.icu/api/islamic/prayer-time?type=schedule&province=${selectedProvince.slug}&city=${selectedCity.slug}`
    );
    
    if (response.ok) {
      const data = await response.json();
      setSchedule(data.data);
      
      // Simpan ke cache
      const cacheKey = `prayerSchedule_${selectedProvince.slug}_${selectedCity.slug}`;
      localStorage.setItem(cacheKey, JSON.stringify(data.data));
      localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
      
      // Simpan lokasi terpilih
      const location: UserLocation = {
        province: selectedProvince.name,
        province_slug: selectedProvince.slug,
        city: selectedCity.name,
        city_slug: selectedCity.slug
      };
      setUserLocation(location);
      localStorage.setItem('prayerLocation', JSON.stringify(location));
      
      // Simpan ke Supabase untuk notifikasi
      if (notificationSettings.enabled && isSubscribed) {
        await schedulePrayerNotifications();
      }
    }
  };

  const schedulePrayerNotifications = async () => {
    if (!schedule || !selectedProvince || !selectedCity) return;
    
    try {
      // Simpan jadwal untuk notifikasi di Service Worker
      const prayerNotifications = schedule.today_schedule.prayers
        .filter(prayer => notificationSettings.prayerTypes.includes(prayer.name.toLowerCase()))
        .map(prayer => ({
          name: prayer.name,
          time: prayer.time_24h,
          advanceMinutes: notificationSettings.advanceMinutes
        }));
      
      // Kirim ke Service Worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SCHEDULE_PRAYER_NOTIFICATIONS',
          data: {
            prayers: prayerNotifications,
            location: {
              province: selectedProvince.name,
              city: selectedCity.name
            }
          }
        });
        
        // Simpan ke localStorage untuk Service Worker
        localStorage.setItem('prayerNotifications', JSON.stringify(prayerNotifications));
      }
    } catch (error) {
      console.error('Error scheduling notifications:', error);
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

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser tidak mendukung notifikasi');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        await subscribeToPushNotifications();
        toast.success('Notifikasi diaktifkan');
      } else {
        toast.warning('Izin notifikasi ditolak');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Gagal mengaktifkan notifikasi');
    }
  };

  const subscribeToPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Cek apakah sudah subscribe
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe baru
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        });
      }
      
      // Kirim subscription ke server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });
      
      if (response.ok) {
        setIsSubscribed(true);
        console.log('Push subscription berhasil');
      } else {
        console.error('Gagal mengirim subscription ke server');
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Gagal mendaftarkan notifikasi push');
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Hapus dari server
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        
        setIsSubscribed(false);
        console.log('Push subscription dihentikan');
      }
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
    }
  };

  const getPrayerIcon = (prayerName: string) => {
    switch (prayerName.toLowerCase()) {
      case 'imsak':
        return <FaMoon className="w-4 h-4" />;
      case 'subuh':
        return <FaSun className="w-4 h-4" />;
      case 'terbit':
        return <FaSun className="w-4 h-4" />;
      case 'dzuhur':
        return <FaCloudSun className="w-4 h-4" />;
      case 'ashar':
        return <FaCloud className="w-4 h-4" />;
      case 'maghrib':
        return <FaCloudMoon className="w-4 h-4" />;
      case 'isya':
        return <FaMoon className="w-4 h-4" />;
      default:
        return <FaClock className="w-4 h-4" />;
    }
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

  const togglePrayerType = (prayerType: string) => {
    setNotificationSettings(prev => {
      const prayerTypes = prev.prayerTypes.includes(prayerType)
        ? prev.prayerTypes.filter(type => type !== prayerType)
        : [...prev.prayerTypes, prayerType];
      
      return { ...prev, prayerTypes };
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-blue-800">Jadwal Sholat</h1>
              <p className="text-gray-600 text-sm mt-1">Jadwal sholat lengkap untuk Indonesia</p>
            </div>
            
            <div className="flex items-center gap-2">
              {isOnline ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                  <FaWifi className="w-3 h-3" />
                  Online
                </span>
              ) : (
                <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium flex items-center gap-1">
                  <FaCloud className="w-3 h-3" />
                  Offline
                </span>
              )}
              
              <button
                onClick={() => {
                  setNotificationSettings(prev => ({
                    ...prev,
                    enabled: !prev.enabled
                  }));
                }}
                className={`p-2 rounded-full transition ${
                  notificationSettings.enabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={notificationSettings.enabled ? 'Notifikasi aktif' : 'Aktifkan notifikasi'}
              >
                {notificationSettings.enabled ? (
                  <FaBell className="w-5 h-5" />
                ) : (
                  <FaBellSlash className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Location Selector */}
          <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Province Selector */}
              <div className="flex-1 relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provinsi
                </label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowProvinceDropdown(!showProvinceDropdown);
                      setShowCityDropdown(false);
                    }}
                    className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center justify-between"
                    disabled={loading.provinces || loading.location}
                  >
                    <div className="flex items-center gap-2">
                      <FaMapMarkerAlt className="w-4 h-4 text-blue-600" />
                      <span className="truncate">
                        {selectedProvince ? selectedProvince.name : 'Pilih Provinsi'}
                      </span>
                    </div>
                    {showProvinceDropdown ? (
                      <FaChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <FaChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showProvinceDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
                      >
                        <div className="p-2 border-b">
                          <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              placeholder="Cari provinsi..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        
                        <div className="max-h-64 overflow-y-auto">
                          {filteredProvinces.map((province) => (
                            <button
                              key={province.slug}
                              onClick={() => handleProvinceSelect(province)}
                              className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                            >
                              <div>
                                <div className="font-medium text-gray-900">{province.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {province.city_count} kota/kabupaten
                                </div>
                              </div>
                              {selectedProvince?.slug === province.slug && (
                                <FaStar className="w-4 h-4 text-blue-600" />
                              )}
                            </button>
                          ))}
                          
                          {hasMoreProvinces && (
                            <button
                              onClick={() => fetchProvinces(currentPage + 1)}
                              disabled={loading.provinces}
                              className="w-full px-4 py-3 text-center text-blue-600 hover:bg-blue-50 border-t border-gray-100"
                            >
                              {loading.provinces ? 'Memuat...' : 'Muat lebih banyak'}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* City Selector */}
              <div className="flex-1 relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    disabled={!selectedProvince || loading.cities || loading.location}
                    className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg bg-white hover:bg-gray-50 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-2">
                      <FaLocationArrow className="w-4 h-4 text-blue-600" />
                      <span className="truncate">
                        {selectedCity ? selectedCity.name : 'Pilih Kota'}
                      </span>
                    </div>
                    {showCityDropdown ? (
                      <FaChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <FaChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showCityDropdown && selectedProvince && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
                      >
                        <div className="p-2 border-b">
                          <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              placeholder="Cari kota..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        
                        <div className="max-h-64 overflow-y-auto">
                          {filteredCities.map((city) => (
                            <button
                              key={city.slug}
                              onClick={() => handleCitySelect(city)}
                              className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
                            >
                              <div>
                                <div className="font-medium text-gray-900">{city.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {city.province}
                                </div>
                              </div>
                              {selectedCity?.slug === city.slug && (
                                <FaStar className="w-4 h-4 text-blue-600" />
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Refresh Button */}
              <div className="self-end">
                <button
                  onClick={fetchSchedule}
                  disabled={!selectedProvince || !selectedCity || loading.schedule}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FaSync className={`w-4 h-4 ${loading.schedule ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* GPS Location Button */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={loadUserLocation}
                disabled={loading.location}
                className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FaMobileAlt className="w-4 h-4" />
                {loading.location ? 'Mendeteksi lokasi...' : 'Gunakan Lokasi GPS'}
              </button>
            </div>
          </div>

          {/* Today's Date and Hijri */}
          {schedule && (
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-4 mb-6 shadow-lg">
              <div className="flex flex-col sm:flex-row items-center justify-between">
                <div className="text-center sm:text-left mb-4 sm:mb-0">
                  <div className="text-sm opacity-90">Hari ini</div>
                  <div className="text-2xl font-bold">{schedule.city.date_today}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm opacity-90">Tanggal Hijriyah</div>
                  <div className="text-xl font-bold">{schedule.city.hijri_date}</div>
                </div>
                <div className="text-center sm:text-right mt-4 sm:mt-0">
                  <div className="text-sm opacity-90">Lokasi</div>
                  <div className="text-lg font-medium">{schedule.city.name}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Prayer Times */}
        {loading.schedule ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
            <div className="text-gray-600">Memuat jadwal sholat...</div>
          </div>
        ) : schedule ? (
          <>
            {/* Today's Prayer Times - Horizontal Grid */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Jadwal Hari Ini</h2>
                <button
                  onClick={() => setShowMonthlyView(!showMonthlyView)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                >
                  <FaCalendarAlt className="w-4 h-4" />
                  {showMonthlyView ? 'Tampilkan Harian' : 'Tampilkan Bulanan'}
                </button>
              </div>

              {!showMonthlyView ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {schedule.today_schedule.prayers.map((prayer) => {
                    const timeRemaining = getTimeRemaining(prayer.time_24h);
                    const isNextPrayer = prayer.is_next;
                    
                    return (
                      <div
                        key={prayer.name}
                        className={`rounded-xl p-4 border transition-all min-w-[140px] ${
                          isNextPrayer
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-600 transform scale-105 shadow-lg'
                            : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className={`p-2 rounded-lg mb-2 ${
                            isNextPrayer ? 'bg-white/20' : 'bg-blue-50'
                          }`}>
                            {getPrayerIcon(prayer.name)}
                          </div>
                          
                          <div className="mb-1">
                            <div className={`text-lg font-bold ${
                              isNextPrayer ? 'text-white' : 'text-gray-900'
                            }`}>
                              {formatTime(prayer.time_24h)}
                            </div>
                            <div className={`text-sm ${
                              isNextPrayer ? 'text-blue-100' : 'text-gray-600'
                            }`}>
                              {prayer.time_24h}
                            </div>
                          </div>
                          
                          <div className="text-xs font-medium opacity-90 mb-2">
                            {prayer.name}
                          </div>
                          
                          {timeRemaining && isNextPrayer && (
                            <div className="text-xs bg-white/20 rounded-lg px-2 py-1 mt-1">
                              ⏳ {timeRemaining} lagi
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Monthly View */
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tanggal
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Imsak
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subuh
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dzuhur
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ashar
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Maghrib
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Isya
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {schedule.monthly_schedule.slice(0, 10).map((day) => (
                          <tr
                            key={day.date}
                            className={`hover:bg-gray-50 ${
                              day.is_today ? 'bg-blue-50' : ''
                            }`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                  day.is_today
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {day.date.split('-')[2]}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {day.hijri_date.trim()}
                                </div>
                              </div>
                            </td>
                            {['imsak', 'subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'].map((prayer) => (
                              <td key={prayer} className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {day.prayers[prayer as keyof typeof day.prayers]}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Next Prayer Highlight - Improved Design */}
            {schedule.today_schedule.next_prayer && (
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl p-6 mb-8 shadow-lg">
                <div className="flex flex-col lg:flex-row items-center justify-between">
                  <div className="mb-6 lg:mb-0 lg:mr-6 text-center lg:text-left">
                    <div className="text-sm opacity-90 mb-2 flex items-center justify-center lg:justify-start gap-2">
                      <div className="p-1 bg-white/20 rounded">
                        <FaBell className="w-3 h-3" />
                      </div>
                      Sholat Selanjutnya
                    </div>
                    <div className="flex flex-col lg:flex-row items-center gap-4">
                      <div className="p-3 bg-white/20 rounded-full lg:mr-4">
                        <div className="p-2 bg-white/30 rounded-full">
                          {getPrayerIcon(schedule.today_schedule.next_prayer.name)}
                        </div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold mb-1">
                          {schedule.today_schedule.next_prayer.name}
                        </div>
                        <div className="text-xl opacity-90 flex items-center gap-2">
                          <FaClock className="w-4 h-4" />
                          {formatTime(schedule.today_schedule.next_prayer.time_24h)}
                          <span className="text-sm opacity-75 ml-2">
                            ({schedule.today_schedule.next_prayer.time_24h})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm opacity-90 mb-2 flex items-center justify-center gap-2">
                      <FaClock className="w-3 h-3" />
                      Sisa Waktu
                    </div>
                    <div className="text-3xl font-bold mb-4 bg-white/10 rounded-lg px-4 py-3">
                      {getTimeRemaining(schedule.today_schedule.next_prayer.time_24h) || 'Waktu telah tiba'}
                    </div>
                    <button
                      onClick={() => {
                        if (notificationSettings.enabled) {
                          toast.success(`Pengingat untuk ${schedule.today_schedule.next_prayer.name} telah diatur`);
                        } else {
                          toast.info('Aktifkan notifikasi untuk mendapatkan pengingat');
                        }
                      }}
                      className="px-6 py-3 bg-white text-emerald-700 rounded-lg font-bold hover:bg-gray-100 transition flex items-center gap-2"
                    >
                      <FaBell className="w-4 h-4" />
                      Ingatkan Saya
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Current Time */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FaClock className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Waktu Sekarang</div>
                    <div className="text-xl font-bold text-gray-900">
                      {currentTime.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Tanggal</div>
                  <div className="text-lg font-medium text-gray-900">
                    {currentTime.toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
              <FaClock className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Pilih Provinsi dan Kota
            </h3>
            <p className="text-gray-600 mb-4">
              Pilih provinsi dan kota untuk melihat jadwal sholat
            </p>
            {!isOnline && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg">
                <FaDatabase className="w-4 h-4" />
                <span className="text-sm">Mode Offline - Data mungkin tidak terbaru</span>
              </div>
            )}
          </div>
        )}

        {/* Notification Settings - Improved with Save */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Pengaturan Notifikasi</h3>
            <button
              onClick={saveNotificationSettings}
              disabled={isSavingSettings}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <FaSave className="w-4 h-4" />
              {isSavingSettings ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Notifikasi Sholat</div>
                <div className="text-sm text-gray-600">
                  Dapatkan pengingat sebelum waktu sholat
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.enabled}
                  onChange={(e) => {
                    setNotificationSettings(prev => ({
                      ...prev,
                      enabled: e.target.checked
                    }));
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            {notificationSettings.enabled && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="mb-4">
                  <div className="font-medium text-gray-900 mb-2">Sholat yang diingatkan</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['imsak', 'subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'].map((prayer) => (
                      <label key={prayer} className="flex items-center space-x-2 p-2 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.prayerTypes.includes(prayer)}
                          onChange={() => togglePrayerType(prayer)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 capitalize">{prayer}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Peringatan sebelum waktu (menit)
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="60"
                      value={notificationSettings.advanceMinutes}
                      onChange={(e) => setNotificationSettings(prev => ({
                        ...prev,
                        advanceMinutes: parseInt(e.target.value)
                      }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-lg font-bold text-blue-600 min-w-[3rem]">
                      {notificationSettings.advanceMinutes} mnt
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>1 menit</span>
                    <span>60 menit</span>
                  </div>
                </div>
                
                {notificationPermission === 'granted' ? (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FaBell className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">
                        Izin notifikasi telah diberikan
                      </span>
                    </div>
                  </div>
                ) : notificationPermission === 'denied' ? (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FaBellSlash className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-700">
                        Izin notifikasi ditolak. Harap aktifkan di pengaturan browser
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FaBell className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-amber-700">
                        Klik tombol Simpan untuk meminta izin notifikasi
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}