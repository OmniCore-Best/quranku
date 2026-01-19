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
  FaCloudMoon,
  FaStar,
  FaSave,
  FaDatabase,
  FaCloudDownloadAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import { CiCloudSun } from "react-icons/ci";
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { db } from '@/lib/db';

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
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // ==================== UTILITY FUNCTIONS ====================

  const getPrayerIcon = (prayerName: string) => {
    switch (prayerName.toLowerCase()) {
      case 'imsak':
      case 'imsyak':
        return <FaMoon className="w-4 h-4" />;
      case 'subuh':
        return <FaSun className="w-4 h-4" />;
      case 'terbit':
        return <FaSun className="w-4 h-4" />;
      case 'dzuhur':
        return <CiCloudSun className="w-4 h-4" />;
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

  // ==================== API FUNCTIONS ====================

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
    try {
      const response = await fetch(
        `https://api.devnova.icu/api/islamic/prayer-time?type=provinces&page=${page}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // PERBAIKAN: Struktur data berdasarkan API response
      if (data.success && data.data && data.data.provinces) {
        setProvinces(prev => page === 1 ? data.data.provinces : [...prev, ...data.data.provinces]);
        setHasMoreProvinces(!!data.data.pagination?.has_next);
        setCurrentPage(page);
        
        // Simpan ke cache
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
    try {
      const response = await fetch(
        `https://api.devnova.icu/api/islamic/prayer-time?type=cities&province=${provinceSlug}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // PERBAIKAN: Struktur data berdasarkan API response
      if (data.success && data.data && data.data.cities) {
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
      // Cek cache offline
      const cacheKey = `prayerSchedule_${selectedProvince.slug}_${selectedCity.slug}`;
      const cachedSchedule = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(`${cacheKey}_time`);
      
      if (cachedSchedule && cacheTime) {
        const cacheDate = new Date(parseInt(cacheTime));
        const now = new Date();
        
        // Cache valid untuk 24 jam
        if (now.getTime() - cacheDate.getTime() < 24 * 60 * 60 * 1000) {
          const scheduleData = JSON.parse(cachedSchedule);
          
          // PERBAIKAN: Cek apakah data valid
          if (scheduleData && scheduleData.city) {
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
    
    try {
      const response = await fetch(
        `https://api.devnova.icu/api/islamic/prayer-time?type=schedule&province=${selectedProvince.slug}&city=${selectedCity.slug}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // PERBAIKAN: Struktur data berdasarkan API response
      if (data.success && data.data) {
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

  // ==================== EFFECTS ====================

  // Check online status
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
    fetchProvinces();
    
    // Load user location setelah provinces dimuat
    const timer = setTimeout(() => {
      loadUserLocation();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Fetch schedule when location changes
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
            
            {/* Status & Actions */}
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

          {/* LOCATION SELECTOR - IMPROVED DESIGN */}
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
                    disabled={loading.provinces || loading.location}
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

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showProvinceDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-300/50 z-50 overflow-hidden"
                      >
                        {/* Search Input */}
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
                        
                        {/* Province List */}
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
                          
                          {/* Load More Button */}
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

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showCityDropdown && selectedProvince && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-300/50 z-50 overflow-hidden"
                      >
                        {/* Search Input */}
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
                        
                        {/* City List */}
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

            {/* GPS Location Button */}
            <div className="mt-4 flex items-center justify-center">
              <button
                onClick={loadUserLocation}
                disabled={loading.location}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow"
              >
                {loading.location ? (
                  <>
                    <FaSync className="w-3.5 h-3.5 animate-spin" />
                    <span>Mendeteksi lokasi...</span>
                  </>
                ) : (
                  <>
                    <FaMobileAlt className="w-3.5 h-3.5" />
                    <span>Gunakan Lokasi Saya</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* TODAY'S INFO - IMPROVED */}
          {schedule && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white rounded-2xl p-5 mb-6 shadow-lg shadow-blue-200"
            >
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="text-center lg:text-left">
                  <div className="text-sm opacity-90 mb-1">📅 Hari ini</div>
                  <div className="text-xl font-bold">{schedule.city.date_today}</div>
                  <div className="text-sm opacity-80 mt-1">{schedule.city.hijri_date}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm opacity-90 mb-1">📍 Lokasi</div>
                  <div className="text-xl font-bold">{schedule.city.name}</div>
                </div>
                
                <div className="text-center lg:text-right">
                  <div className="text-sm opacity-90 mb-1">🕒 Waktu Sekarang</div>
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
            {/* PRAYER TIMES GRID - IMPROVED */}
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
                            <div className="text-xs bg-white/20 rounded-lg px-3 py-1.5 mt-1 backdrop-blur-sm">
                              ⏳ {timeRemaining} lagi
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* MONTHLY VIEW - IMPROVED */
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
                        {schedule.monthly_schedule.slice(0, 7).map((day) => (
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
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-center">
                    <button 
                      onClick={() => toast.info('Fitur tampilkan lebih banyak akan segera tersedia')}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Tampilkan lebih banyak hari →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* NEXT PRAYER HIGHLIGHT - IMPROVED */}
            {schedule.today_schedule.next_prayer && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 text-white rounded-2xl p-6 mb-8 overflow-hidden shadow-xl"
              >
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                    {/* Left Section */}
                    <div className="flex-1 text-center lg:text-left">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-sm mb-4">
                        <FaBell className="w-3 h-3" />
                        <span>Sholat Selanjutnya</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-white/20 rounded-2xl">
                          <div className="p-3 bg-white/30 rounded-full">
                            {getPrayerIcon(schedule.today_schedule.next_prayer.name)}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-2xl sm:text-3xl font-bold mb-2">
                            {schedule.today_schedule.next_prayer.name}
                          </h3>
                          <div className="text-xl opacity-90 flex items-center gap-2">
                            <FaClock className="w-5 h-5" />
                            {formatTime(schedule.today_schedule.next_prayer.time_24h)}
                            <span className="text-lg opacity-75 ml-2">
                              ({schedule.today_schedule.next_prayer.time_24h})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Section */}
                    <div className="flex-1 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full text-sm mb-4">
                        <FaClock className="w-3 h-3" />
                        <span>Sisa Waktu</span>
                      </div>
                      
                      <div className="text-4xl font-bold mb-6 bg-white/10 rounded-2xl px-8 py-6 backdrop-blur-sm">
                        {getTimeRemaining(schedule.today_schedule.next_prayer.time_24h) || 'WAKTU TELAH TIBA'}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          onClick={() => {
                            if (notificationSettings.enabled) {
                              toast.success(`⏰ Pengingat untuk ${schedule.today_schedule.next_prayer.name} telah diatur`);
                            } else {
                              toast.info('🔔 Aktifkan notifikasi untuk mendapatkan pengingat sholat');
                            }
                          }}
                          className="px-6 py-3 bg-white text-emerald-700 rounded-xl font-bold hover:bg-slate-100 transition flex items-center justify-center gap-2 shadow-lg"
                        >
                          <FaBell className="w-4 h-4" />
                          Ingatkan Saya
                        </button>
                        
                        <button
                          onClick={() => {
                            // Share prayer time
                            const shareText = `Waktu sholat ${schedule.today_schedule.next_prayer.name} di ${schedule.city.name} adalah ${schedule.today_schedule.next_prayer.time_24h}. Ayo sholat tepat waktu! 🕌`;
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
                </div>
              </motion.div>
            )}

            {/* NOTIFICATION SETTINGS - IMPROVED */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Pengaturan Notifikasi</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Dapatkan pengingat sebelum waktu sholat
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    notificationSettings.enabled
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {notificationSettings.enabled ? 'Aktif' : 'Nonaktif'}
                  </div>
                  
                  <button
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Toggle Switch */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <div className="font-medium text-slate-900">Notifikasi Sholat</div>
                    <div className="text-sm text-slate-600">
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
                    <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                
                {/* Advanced Settings */}
                {showAdvancedSettings && notificationSettings.enabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-blue-50/50 rounded-xl p-5 border border-blue-100"
                  >
                    <div className="mb-5">
                      <div className="font-medium text-slate-900 mb-3">Sholat yang diingatkan</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {['imsak', 'subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'].map((prayer) => (
                          <button
                            key={prayer}
                            onClick={() => togglePrayerType(prayer)}
                            className={`px-4 py-3 rounded-lg border transition-all ${
                              notificationSettings.prayerTypes.includes(prayer)
                                ? 'bg-blue-100 border-blue-300 text-blue-700'
                                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="text-sm font-medium capitalize">{prayer}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {schedule?.today_schedule.prayers.find(p => p.name.toLowerCase() === prayer)?.time_24h || '--:--'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Advance Minutes Slider */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium text-slate-900">Pengingat lebih awal</div>
                          <div className="text-sm text-slate-600">
                            Atur berapa menit sebelum waktu sholat
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {notificationSettings.advanceMinutes} mnt
                        </div>
                      </div>
                      
                      <input
                        type="range"
                        min="1"
                        max="60"
                        value={notificationSettings.advanceMinutes}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          advanceMinutes: parseInt(e.target.value)
                        }))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600"
                      />
                      
                      <div className="flex justify-between text-xs text-slate-500 mt-2">
                        <span>1 menit</span>
                        <span>60 menit</span>
                      </div>
                    </div>
                    
                    {/* Permission Status */}
                    {notificationPermission === 'granted' ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <FaBell className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <div className="font-medium text-emerald-900">Notifikasi diizinkan</div>
                            <div className="text-sm text-emerald-700">
                              Anda akan menerima pengingat sholat
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : notificationPermission === 'denied' ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FaExclamationTriangle className="w-5 h-5 text-red-600" />
                          <div>
                            <div className="font-medium text-red-900">Izin ditolak</div>
                            <div className="text-sm text-red-700">
                              Aktifkan notifikasi di pengaturan browser
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FaBell className="w-5 h-5 text-amber-600" />
                          <div>
                            <div className="font-medium text-amber-900">Izin diperlukan</div>
                            <div className="text-sm text-amber-700">
                              Klik Simpan untuk meminta izin notifikasi
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
                
                {/* Save Button */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className="px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-xl transition"
                  >
                    {showAdvancedSettings ? 'Sembunyikan' : 'Pengaturan Lanjutan'}
                  </button>
                  
                  <button
                    onClick={saveNotificationSettings}
                    disabled={isSavingSettings}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                  >
                    {isSavingSettings ? (
                      <>
                        <FaSync className="w-4 h-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <FaSave className="w-4 h-4" />
                        Simpan Pengaturan
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* OFFLINE INFO */}
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
          /* EMPTY STATE */
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
        )}
      </div>
    </div>
  );
}