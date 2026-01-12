//components/ServiceWorkerRegistration.tsx

'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none'
          });

          console.log('Service Worker registered with scope:', registration.scope);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New content is available; please refresh.');
                  // You can show a toast notification here
                  if (confirm('A new version is available! Reload to update?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });

          // Handle controller change
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Service Worker controller changed');
          });

        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      };

      // Wait for page to load before registering
      window.addEventListener('load', registerServiceWorker);
    }
  }, []);

  return null;
}


//components/ui/BottomNav.tsx

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaHandsPraying } from 'react-icons/fa6';
import {
  FaQuran,
  FaImages,
  FaBookOpen,
  FaMusic,
  FaCalendarAlt,
  FaBookmark,
  FaHistory,
  FaSearch,
  FaUser,
  FaRegClock,
  FaCog,
  FaPlus,
  FaTimes
} from 'react-icons/fa';

interface MenuItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface PopupItem {
  id: number;
  name: string;
  icon: React.ReactNode;
  comingSoon: boolean;
}

const BottomNav = () => {
  const pathname = usePathname();
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const navItems: MenuItem[] = [
    { href: '/', label: 'Quran', icon: <FaQuran /> },
    { href: '/schedule', label: 'Schedule', icon: <FaRegClock /> },
    { href: '/tajwid', label: 'Tajwid', icon: <FaBookOpen /> },
    { href: '/doa', label: 'Doa', icon: <FaHandsPraying /> },
  ];

  const popupMenuItems: PopupItem[] = [
    { id: 1, name: 'Murattal', icon: <FaMusic />, comingSoon: true },
    { id: 2, name: 'Sholat', icon: <FaCalendarAlt />, comingSoon: true },
    { id: 3, name: 'Asmaul Husna', icon: <FaBookmark />, comingSoon: true },
    { id: 4, name: 'Sejarah', icon: <FaHistory />, comingSoon: true },
    { id: 5, name: 'Cari', icon: <FaSearch />, comingSoon: true },
    { id: 6, name: 'Profil', icon: <FaUser />, comingSoon: true },
    { id: 7, name: 'Setelan', icon: <FaCog />, comingSoon: true },
  ];

  return (
    <>
      {/* POPUP MENU */}
      {isPopupOpen && (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center pointer-events-none">
          <div className="w-[280px] h-[210px] animate-slide-up pointer-events-auto">
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 h-full flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      More Menu
                    </h3>
                    <p className="text-xs text-gray-500">
                      Additional features
                    </p>
                  </div>
                  <button
                    onClick={() => setIsPopupOpen(false)}
                    className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 transition"
                  >
                    <FaTimes className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Menu Grid */}
              <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-3 gap-2">
                  {popupMenuItems.map((item) => (
                    <button
                      key={item.id}
                      disabled={item.comingSoon}
                      className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      onClick={() => {
                        if (item.comingSoon) {
                          alert(`"${item.name}" will be available soon`);
                        }
                        setIsPopupOpen(false);
                      }}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                          item.comingSoon
                            ? 'bg-gray-100 text-gray-400'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        <span className="text-sm">{item.icon}</span>
                      </div>

                      <span className="text-[11px] font-medium text-gray-800 text-center leading-tight">
                        {item.name}
                      </span>
                      {item.comingSoon && (
                        <span className="text-[9px] text-gray-400">Soon</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 py-2 px-2">
        <div className="grid grid-cols-5 items-end max-w-md mx-auto">
          {/* LEFT 2 */}
          {navItems.slice(0, 2).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center py-1"
              >
                <div
                  className={`p-2 rounded-lg transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 scale-110'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                </div>
                <span
                  className={`text-[10px] mt-1 ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />
                )}
              </Link>
            );
          })}

          {/* CENTER FAB */}
          <div className="flex justify-center -mt-6">
            <button
              onClick={() => setIsPopupOpen((p) => !p)}
              className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all duration-300 ${
                isPopupOpen
                  ? 'bg-gray-800 text-white rotate-45'
                  : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
              }`}
            >
              {isPopupOpen ? (
                <FaTimes className="w-4 h-4" />
              ) : (
                <FaPlus className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* RIGHT 2 */}
          {navItems.slice(2).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center py-1"
              >
                <div
                  className={`p-2 rounded-lg transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 scale-110'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                </div>
                <span
                  className={`text-[10px] mt-1 ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ANIMATION */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default BottomNav;


//components/ui/InstallPrompt.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { 
  FaTimes, 
  FaDownload, 
  FaPlus, 
  FaShareSquare, 
  FaMobileAlt,
  FaHome,
  FaBolt,
  FaCloud,
  FaApple,
  FaAndroid,
  FaArrowRight,
  FaCheckCircle
} from 'react-icons/fa';
import { GiSmartphone } from 'react-icons/gi';
import { IoMdAddCircle } from 'react-icons/io';
import { MdTouchApp } from 'react-icons/md';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Cek apakah sudah install sebagai PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
      return;
    }

    // Deteksi platform
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isAndroidDevice = /android/i.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Event listener untuk beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Tampilkan prompt setelah 3 detik
      setTimeout(() => {
        const hasShownPrompt = localStorage.getItem('installPromptShown');
        if (!hasShownPrompt) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    // Event listener untuk appinstalled
    const handleAppInstalled = () => {
      setShowPrompt(false);
      localStorage.setItem('installPromptShown', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Untuk iOS, tampilkan instruksi instalasi
    if (isIOSDevice) {
      const hasShownIOSPrompt = localStorage.getItem('iosInstallPromptShown');
      if (!hasShownIOSPrompt) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // Untuk iOS, simpan status bahwa prompt sudah ditampilkan
      localStorage.setItem('iosInstallPromptShown', 'true');
      setShowPrompt(false);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        localStorage.setItem('installPromptShown', 'true');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem('iosInstallPromptShown', 'true');
    } else {
      localStorage.setItem('installPromptShown', 'true');
    }
  };

  // Jangan tampilkan jika sudah standalone atau tidak showPrompt
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-28 left-2 right-2 z-50 animate-slide-up">
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl shadow-xl border border-emerald-400 overflow-hidden max-w-xs mx-auto">
        {/* Header dengan ikon platform */}
        <div className="relative px-3 pt-3 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  {isIOS ? (
                    <FaApple className="w-4 h-4" />
                  ) : isAndroid ? (
                    <FaAndroid className="w-4 h-4" />
                  ) : (
                    <GiSmartphone className="w-4 h-4" />
                  )}
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                  <FaPlus className="w-2 h-2 text-emerald-700" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-xs">Install App</h3>
                <p className="text-[10px] text-emerald-100 opacity-90">
                  quranku • Better experience
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition active:scale-95"
            >
              <FaTimes className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Body dengan benefits */}
        <div className="px-3 pb-3">
          <div className="grid grid-cols-3 gap-1 mb-2">
            <div className="bg-white/10 rounded-lg p-2 flex flex-col items-center">
              <FaBolt className="w-3 h-3 text-amber-300 mb-1" />
              <span className="text-[9px] font-medium text-center">Fast</span>
            </div>
            <div className="bg-white/10 rounded-lg p-2 flex flex-col items-center">
              <FaCloud className="w-3 h-3 text-blue-300 mb-1" />
              <span className="text-[9px] font-medium text-center">Offline</span>
            </div>
            <div className="bg-white/10 rounded-lg p-2 flex flex-col items-center">
              <MdTouchApp className="w-3 h-3 text-emerald-300 mb-1" />
              <span className="text-[9px] font-medium text-center">Easy Access</span>
            </div>
          </div>

          {/* iOS Instructions */}
          {isIOS ? (
            <div className="bg-white/10 rounded-lg p-2 mb-2">
              <div className="flex items-center mb-1">
                <FaShareSquare className="w-3 h-3 mr-1 text-blue-300" />
                <p className="text-[10px] font-medium">For iPhone/iPad:</p>
              </div>
              <div className="space-y-1 pl-4">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-emerald-400/30 flex items-center justify-center mr-1">
                    <span className="text-[8px]">1</span>
                  </div>
                  <span className="text-[10px]">Tap <FaShareSquare className="inline w-2 h-2" /> Share</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-emerald-400/30 flex items-center justify-center mr-1">
                    <span className="text-[8px]">2</span>
                  </div>
                  <span className="text-[10px]">Scroll to "Add to Home"</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-emerald-400/30 flex items-center justify-center mr-1">
                    <span className="text-[8px]">3</span>
                  </div>
                  <span className="text-[10px]">Tap <IoMdAddCircle className="inline w-2 h-2" /> Add</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/10 rounded-lg p-2 mb-2">
              <div className="flex items-center mb-1">
                <FaCheckCircle className="w-3 h-3 mr-1 text-green-300" />
                <p className="text-[10px] font-medium">Benefits:</p>
              </div>
              <ul className="space-y-0.5">
                <li className="flex items-center text-[10px]">
                  <div className="w-1 h-1 rounded-full bg-emerald-300 mr-1"></div>
                  Read Quran offline
                </li>
                <li className="flex items-center text-[10px]">
                  <div className="w-1 h-1 rounded-full bg-emerald-300 mr-1"></div>
                  Quick access from home
                </li>
                <li className="flex items-center text-[10px]">
                  <div className="w-1 h-1 rounded-full bg-emerald-300 mr-1"></div>
                  No browser tabs needed
                </li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-900 font-bold text-xs py-2 rounded-lg hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] transition-all shadow-md flex items-center justify-center space-x-1"
            >
              {isIOS ? (
                <>
                  <FaHome className="w-3 h-3" />
                  <span>Add to Home</span>
                </>
              ) : (
                <>
                  <FaDownload className="w-3 h-3" />
                  <span>Install Now</span>
                </>
              )}
            </button>
            <button
              onClick={handleClose}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center justify-center"
            >
              <span className="text-[10px]">Later</span>
            </button>
          </div>

          {/* Footer hint */}
          <div className="mt-2 text-center">
            <p className="text-[9px] text-emerald-200/70">
              {isIOS ? 'Works like a native app' : 'Works offline • 100% Free'}
            </p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 opacity-30"></div>
        <div className="absolute -bottom-2 -left-2 w-3 h-3 rounded-full bg-blue-300 opacity-20"></div>
      </div>
    </div>
  );
}


//app/doa/page.tsx

export default function DoaPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-emerald-700 mb-4">Kumpulan Doa</h1>
      <p className="text-gray-600">Halaman ini berisi kumpulan doa-doa harian dalam Islam.</p>
    </div>
  );
}


//app/globals.css

@import "tailwindcss";

body {
  padding-bottom: 80px;
}

/* Animasi untuk install prompt */
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes pulse-subtle {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out forwards;
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}


//app/layout.tsx

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/ui/BottomNav";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import InstallPrompt from "@/components/ui/InstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "quranku - Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami",
  description: "Aplikasi lengkap untuk membaca Al-Quran, belajar tajwid, doa harian, dan galeri islami",
  manifest: "/manifest.json",
  applicationName: "quranku",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "quranku",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    title: "quranku",
    description: "Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami",
  },
  twitter: {
    card: "summary",
    title: "quranku",
    description: "Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="quranku" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="quranku" />
        <meta name="description" content="Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#10b981" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#10b981" />
        
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-152x152.png" />
        
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="mask-icon" href="/icons/apple-touch-icon.png" color="#10b981" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://quranku.devnova.icu" />
        <meta name="twitter:title" content="quranku" />
        <meta name="twitter:description" content="Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami" />
        <meta name="twitter:image" content="https://quranku.devnova.icu/icons/icon-192x192.png" />
        <meta name="twitter:creator" content="@quranku" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="quranku" />
        <meta property="og:description" content="Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami" />
        <meta property="og:site_name" content="quranku" />
        <meta property="og:url" content="https://quranku.devnova.icu" />
        <meta property="og:image" content="https://quranku.devnova.icu/icons/icon-512x512.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <main className="min-h-screen pb-20">
          {children}
        </main>
        <BottomNav />
        <ServiceWorkerRegistration />
        <InstallPrompt /> 
      </body>
    </html>
  );
}


//app/page.tsx

export default function QuranPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-emerald-700 mb-4">Al-Quran</h1>
      <p className="text-gray-600">Halaman Al-Quran akan menampilkan daftar surat dan fitur tilawah.</p>
    </div>
  );
}


//app/schedule/page.tsx

export default function SchedulePage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-emerald-700 mb-4">Galeri Islami</h1>
      <p className="text-gray-600">Halaman Schedule akan menampilkan Jadwal Sholat Indonesia</p>
    </div>
  );
}


//app/tajwid/page.tsx

export default function TajwidPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-emerald-700 mb-4">Tajwid</h1>
      <p className="text-gray-600">Halaman ini berisi materi dan pembelajaran tentang ilmu tajwid.</p>
    </div>
  );
}


//public/manifest.json

{
  "name": "quranku - Al-Quran, Doa, Tajwid, dan Galeri Islami",
  "short_name": "quranku",
  "description": "Aplikasi Al-Quran, Doa, Tajwid, dan Galeri Islami",
  "theme_color": "#10b981",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/screenshot1.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide",
      "label": "Halaman Al-Quran"
    },
    {
      "src": "/screenshots/screenshot2.png",
      "sizes": "750x1334",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "Navigasi Mobile"
    }
  ],
  "categories": ["education", "lifestyle", "books"],
  "share_target": {
    "action": "/share",
    "method": "GET",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}


//public/offline.html

<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>quranku - Offline</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 20px;
    }
    .container {
      max-width: 500px;
      padding: 40px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 20px;
      color: white;
    }
    p {
      font-size: 1.1rem;
      margin-bottom: 30px;
      opacity: 0.9;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }
    button {
      background: white;
      color: #10b981;
      border: none;
      padding: 12px 30px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 50px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }
    .hint {
      margin-top: 20px;
      font-size: 0.9rem;
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📶</div>
    <h1>Anda Sedang Offline</h1>
    <p>Tidak dapat terhubung ke internet. Pastikan koneksi internet Anda aktif dan coba lagi.</p>
    <button onclick="window.location.reload()">Coba Lagi</button>
    <p class="hint">Beberapa konten mungkin masih tersedia secara offline</p>
  </div>
  <script>
    // Check connection periodically
    setInterval(() => {
      if (navigator.onLine) {
        window.location.reload();
      }
    }, 5000);

    // Listen for online event
    window.addEventListener('online', () => {
      window.location.reload();
    });
  </script>
</body>
</html>


//public/robots.txt

User-agent: *
Allow: /
Sitemap: https://quranku.devnova.icu/sitemap.xml


//public/sw.js

const CACHE_NAME = 'quranku-v1.0.0';
const STATIC_CACHE = 'quranku-static-v1';
const DYNAMIC_CACHE = 'quranku-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/favicon.ico'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Chrome extensions
  if (event.request.url.startsWith('chrome-extension://')) return;

  // For API requests or non-same-origin requests, use network only
  if (event.request.url.includes('/api/') || !event.request.url.startsWith(self.location.origin)) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }

      // Clone the request for network call and caching
      return fetch(event.request).then(response => {
        // Check if response is valid
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response for caching
        const responseToCache = response.clone();

        // Cache the dynamic response
        caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // If both cache and network fail, show offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  const data = event.data?.json() || {
    title: 'quranku',
    body: 'Ada pembaruan baru!',
    icon: '/icons/icon-192x192.png'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/'
      }
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});

// Handle background sync
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    // Implement your sync logic here
    console.log('Syncing data in background...');
  } catch (error) {
    console.error('Sync failed:', error);
  }
}


//next.config.ts

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;


//package.json

{
  "name": "quranku",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "^16.1.1",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "react-icons": "^5.5.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "babel-plugin-react-compiler": "1.0.0",
    "eslint": "^9",
    "eslint-config-next": "16.0.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}


//tsconfig.json

{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}



//postcss.config.mjs

const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;



//eslint.config.mjs

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;



//next-env.d.ts

/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/dev/types/routes.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.



