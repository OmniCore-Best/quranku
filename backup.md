//components/ui/BottomNav.tsx

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaHandsPraying } from 'react-icons/fa6';
import {
  FaQuran,
  FaImages,
  FaBookOpen,
  FaTimes,
  FaMusic,
  FaCalendarAlt,
  FaHistory,
  FaBookmark,
  FaSearch,
  FaUser,
  FaCog,
  FaRocket
} from 'react-icons/fa';

interface RocketPosition {
  x: number;
  y: number;
}

interface MenuItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  position: 'left' | 'right';
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
  const [rocketFlying, setRocketFlying] = useState(false);
  const rocketRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [rocketPosition, setRocketPosition] = useState<RocketPosition>({ x: 0, y: 0 });
  const [targetPosition, setTargetPosition] = useState<RocketPosition>({ x: 0, y: 0 });

  // Data untuk menu popup
  const popupMenuItems: PopupItem[] = [
    { id: 1, name: 'Audio & Murattal', icon: <FaMusic />, comingSoon: true },
    { id: 2, name: 'Jadwal Sholat', icon: <FaCalendarAlt />, comingSoon: true },
    { id: 3, name: 'Asmaul Husna', icon: <FaBookmark />, comingSoon: true },
    { id: 4, name: 'Sejarah Islam', icon: <FaHistory />, comingSoon: true },
    { id: 5, name: 'Pencarian', icon: <FaSearch />, comingSoon: true },
    { id: 6, name: 'Profil', icon: <FaUser />, comingSoon: true },
    { id: 7, name: 'Pengaturan', icon: <FaCog />, comingSoon: true },
  ];

  // Data untuk menu utama
  const navItems: MenuItem[] = [
    {
      href: '/',
      label: 'Al-Quran',
      icon: <FaQuran className="w-6 h-6" />,
      position: 'left'
    },
    {
      href: '/galeri',
      label: 'Galeri',
      icon: <FaImages className="w-6 h-6" />,
      position: 'left'
    },
    {
      href: '/tajwid',
      label: 'Tajwid',
      icon: <FaBookOpen className="w-6 h-6" />,
      position: 'right'
    },
    {
      href: '/doa',
      label: 'Doa',
      icon: <FaHandsPraying className="w-6 h-6" />,
      position: 'right'
    },
  ];

  // Filter menu kiri dan kanan
  const leftNavItems = navItems.filter(item => item.position === 'left');
  const rightNavItems = navItems.filter(item => item.position === 'right');

  const calculatePositions = useCallback(() => {
    if (rocketRef.current && popupRef.current) {
      const rocketRect = rocketRef.current.getBoundingClientRect();
      const popupRect = popupRef.current.getBoundingClientRect();
      
      const startX = rocketRect.left + rocketRect.width / 2;
      const startY = rocketRect.top + rocketRect.height / 2;
      
      const targetX = popupRect.left + popupRect.width / 2;
      const targetY = popupRect.top + 40;
      
      setRocketPosition({ x: startX, y: startY });
      setTargetPosition({ x: targetX, y: targetY });
    }
  }, []);

  const handleRocketClick = () => {
    if (!isPopupOpen) {
      setIsPopupOpen(true);
      setTimeout(() => {
        calculatePositions();
        setRocketFlying(true);
      }, 10);
    } else {
      setRocketFlying(false);
      setTimeout(() => {
        setIsPopupOpen(false);
      }, 500);
    }
  };

  // Reset animasi ketika popup terbuka
  useEffect(() => {
    if (isPopupOpen) {
      const timer = setTimeout(() => {
        calculatePositions();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isPopupOpen, calculatePositions]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (isPopupOpen) {
        calculatePositions();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isPopupOpen, calculatePositions]);

  return (
    <>
      {/* Rocket Trail Effect */}
      {isPopupOpen && rocketFlying && (
        <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
          <svg className="absolute w-full h-full">
            <line
              x1={rocketPosition.x}
              y1={rocketPosition.y}
              x2={targetPosition.x}
              y2={targetPosition.y}
              stroke="url(#rocketGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-trail"
            />
            <defs>
              <linearGradient id="rocketGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#10b981" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}

      {/* Flying Rocket */}
      {isPopupOpen && (
        <div 
          className="fixed z-50 pointer-events-none transition-all duration-500 ease-out"
          style={{
            left: `${rocketFlying ? targetPosition.x : rocketPosition.x}px`,
            top: `${rocketFlying ? targetPosition.y : rocketPosition.y}px`,
            transform: 'translate(-50%, -50%)',
            transition: rocketFlying 
              ? 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
              : 'none',
            opacity: rocketFlying ? 1 : 0.8
          }}
        >
          <div className="relative">
            <FaRocket className="w-10 h-10 text-emerald-500 animate-rocket-pulse" />
            <div className="absolute left-1/2 top-full -translate-x-1/2 w-2 h-4 bg-gradient-to-t from-orange-500 via-yellow-400 to-yellow-300 rounded-full blur-sm animate-rocket-fire"></div>
          </div>
        </div>
      )}

      {/* Popup Menu */}
      {isPopupOpen && (
        <div 
          ref={popupRef}
          className="fixed z-40 animate-fade-in-up"
          style={{
            left: '50%',
            bottom: 'calc(4rem + 90px)',
            transform: 'translateX(-50%)'
          }}
        >
          <div className="relative w-72 h-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-emerald-100/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-center p-4 border-b border-emerald-100/50 bg-gradient-to-r from-emerald-50/80 to-white/80">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-100/60 to-emerald-50/40 border-2 border-emerald-200/30 shadow-inner">
                <div className="w-3 h-3 rounded-full bg-emerald-300/50"></div>
              </div>
            </div>

            {/* Content */}
            <div className="h-[calc(100%-120px)] overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3">
                {popupMenuItems.map((item) => (
                  <button
                    key={item.id}
                    disabled={item.comingSoon}
                    className="group flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-b from-white/80 to-gray-50/50 border border-gray-100/80 hover:from-emerald-50/90 hover:to-emerald-100/50 hover:border-emerald-200/50 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:hover:from-white/80 disabled:hover:to-gray-50/50"
                    onClick={() => {
                      if (item.comingSoon) {
                        alert(`Fitur "${item.name}" akan segera hadir!`);
                      }
                    }}
                  >
                    <div className="flex items-center justify-center w-10 h-10 mb-2 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 group-hover:from-emerald-200 group-hover:to-emerald-100 transition-all duration-300">
                      <div className="text-lg">
                        {item.icon}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center mb-1">
                      {item.name}
                    </span>
                    {item.comingSoon && (
                      <span className="text-xs px-2 py-1 bg-gradient-to-r from-amber-100/80 to-amber-50/80 text-amber-800 rounded-full border border-amber-200/50">
                        Coming Soon
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-emerald-100/50 bg-white/90 backdrop-blur-sm">
              <div className="text-center text-sm text-emerald-600/70 font-medium">
                Sentuh roket untuk menutup
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-white via-white to-white/95 border-t border-emerald-100/50 py-4 px-6 backdrop-blur-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* Left Side */}
          <div className="flex items-center space-x-8">
            {leftNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex flex-col items-center justify-center space-y-1.5 transition-all duration-300 ${
                    isActive 
                      ? 'text-emerald-600' 
                      : 'text-gray-600 hover:text-emerald-500'
                  }`}
                >
                  <div className={`p-2.5 rounded-full transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-br from-emerald-100/80 to-emerald-50/60 shadow-inner' 
                      : 'group-hover:bg-emerald-50/50'
                  }`}>
                    <div className={`transition-transform duration-300 ${
                      isActive ? 'scale-110' : 'group-hover:scale-105'
                    }`}>
                      {item.icon}
                    </div>
                  </div>
                  <span className="text-xs font-semibold tracking-wide transition-all duration-300">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Center Rocket Button */}
          <div className="relative -top-10">
            <button
              ref={rocketRef}
              onClick={handleRocketClick}
              className={`group flex items-center justify-center w-20 h-20 rounded-full shadow-2xl transition-all duration-700 ${
                isPopupOpen
                  ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 shadow-emerald-400/40'
                  : 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-400 hover:via-emerald-500 hover:to-emerald-600 shadow-emerald-500/30 hover:shadow-emerald-400/50'
              }`}
              aria-label={isPopupOpen ? "Tutup menu" : "Buka menu lainnya"}
            >
              <div className="relative">
                {!isPopupOpen && (
                  <FaRocket className="w-10 h-10 text-white animate-float" />
                )}
                {isPopupOpen && (
                  <FaTimes className="w-10 h-10 text-white transition-transform duration-700 group-hover:rotate-90" />
                )}
                {!isPopupOpen && (
                  <div className="absolute inset-0 bg-white/20 rounded-full blur-sm animate-pulse-slow"></div>
                )}
              </div>
            </button>
            
            {/* Rocket shadow effect */}
            <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-3 rounded-full bg-emerald-900/20 blur-md transition-all duration-500 ${
              isPopupOpen ? 'scale-75 opacity-60' : 'group-hover:scale-90'
            }`}></div>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-8">
            {rightNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex flex-col items-center justify-center space-y-1.5 transition-all duration-300 ${
                    isActive 
                      ? 'text-emerald-600' 
                      : 'text-gray-600 hover:text-emerald-500'
                  }`}
                >
                  <div className={`p-2.5 rounded-full transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-br from-emerald-100/80 to-emerald-50/60 shadow-inner' 
                      : 'group-hover:bg-emerald-50/50'
                  }`}>
                    <div className={`transition-transform duration-300 ${
                      isActive ? 'scale-110' : 'group-hover:scale-105'
                    }`}>
                      {item.icon}
                    </div>
                  </div>
                  <span className="text-xs font-semibold tracking-wide transition-all duration-300">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Animasi CSS */}
      <style jsx global>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        @keyframes fade-in-scale {
          0% {
            opacity: 0;
            transform: translateX(-50%) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-6px) rotate(5deg);
          }
        }
        
        @keyframes rocket-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.4));
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.8));
            transform: scale(1.05);
          }
        }
        
        @keyframes rocket-fire {
          0%, 100% {
            height: 6px;
            width: 2px;
            opacity: 0.7;
          }
          50% {
            height: 10px;
            width: 3px;
            opacity: 1;
          }
        }
        
        @keyframes trail {
          0% {
            stroke-dashoffset: 100;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0;
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.1);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        
        .animate-fade-in-scale {
          animation: fade-in-scale 0.3s ease-out forwards;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-rocket-pulse {
          animation: rocket-pulse 1.2s ease-in-out infinite;
        }
        
        .animate-rocket-fire {
          animation: rocket-fire 0.6s ease-in-out infinite;
        }
        
        .animate-trail {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: trail 0.8s ease-out forwards;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        
        /* Smooth scroll for popup */
        .overflow-y-auto {
          scroll-behavior: smooth;
          scrollbar-width: thin;
          scrollbar-color: rgba(16, 185, 129, 0.3) transparent;
        }
        
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background-color: rgba(16, 185, 129, 0.3);
          border-radius: 20px;
        }
        
        /* Selection color */
        ::selection {
          background-color: rgba(16, 185, 129, 0.2);
          color: #059669;
        }
      `}</style>
    </>
  );
};

export default BottomNav;


//app/doa/page.tsx

export default function DoaPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-emerald-700 mb-4">Kumpulan Doa</h1>
      <p className="text-gray-600">Halaman ini berisi kumpulan doa-doa harian dalam Islam.</p>
    </div>
  );
}


//app/galeri/page.tsx

export default function GaleriPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-emerald-700 mb-4">Galeri Islami</h1>
      <p className="text-gray-600">Halaman galeri akan menampilkan gambar-gambar islami, kaligrafi, dan wallpaper.</p>
    </div>
  );
}


//app/globals.css

@import "tailwindcss";

body {
  padding-bottom: 80px;
}


//app/layout.tsx

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/ui/BottomNav";

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
        <meta name="msapplication-config" content="/browserconfig.xml" />
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
  "shortcuts": [
    {
      "name": "Baca Al-Quran",
      "short_name": "Al-Quran",
      "description": "Baca dan pelajari Al-Quran",
      "url": "/",
      "icons": [{ "src": "/icons/quran-icon.png", "sizes": "96x96" }]
    },
    {
      "name": "Kumpulan Doa",
      "short_name": "Doa",
      "description": "Kumpulan doa harian",
      "url": "/doa",
      "icons": [{ "src": "/icons/pray-icon.png", "sizes": "96x96" }]
    }
  ],
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


//public/robots.txt

User-agent: *
Allow: /
Sitemap: https://quranku.vercel.app/sitemap.xml


//public/sw.js

if(!self.define){let e,s={};const n=(n,i)=>(n=new URL(n+".js",i).href,s[n]||new Promise(s=>{if("document"in self){const e=document.createElement("script");e.src=n,e.onload=s,document.head.appendChild(e)}else e=n,importScripts(n),s()}).then(()=>{let e=s[n];if(!e)throw new Error(`Module ${n} didn’t register its module`);return e}));self.define=(i,c)=>{const t=e||("document"in self?document.currentScript.src:"")||location.href;if(s[t])return;let a={};const o=e=>n(e,t),d={module:{uri:t},exports:a,require:o};s[t]=Promise.all(i.map(e=>d[e]||o(e))).then(e=>(c(...e),a))}}define(["./workbox-4754cb34"],function(e){"use strict";importScripts(),self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"/_next/static/chunks/4bd1b696-ba4c7542f7c5d658.js",revision:"ba4c7542f7c5d658"},{url:"/_next/static/chunks/53c13509-a473b12d1873a8b1.js",revision:"a473b12d1873a8b1"},{url:"/_next/static/chunks/765-d8ed949e7fe06975.js",revision:"d8ed949e7fe06975"},{url:"/_next/static/chunks/826-1480b31e616eaed5.js",revision:"1480b31e616eaed5"},{url:"/_next/static/chunks/8e1d74a4-74a2fda1ec76bcc0.js",revision:"74a2fda1ec76bcc0"},{url:"/_next/static/chunks/app/_global-error/page-90b2659612dbd5d3.js",revision:"90b2659612dbd5d3"},{url:"/_next/static/chunks/app/_not-found/page-43cc396270f713dd.js",revision:"43cc396270f713dd"},{url:"/_next/static/chunks/app/doa/page-90b2659612dbd5d3.js",revision:"90b2659612dbd5d3"},{url:"/_next/static/chunks/app/galeri/page-90b2659612dbd5d3.js",revision:"90b2659612dbd5d3"},{url:"/_next/static/chunks/app/layout-66ee88f2543e2384.js",revision:"66ee88f2543e2384"},{url:"/_next/static/chunks/app/page-90b2659612dbd5d3.js",revision:"90b2659612dbd5d3"},{url:"/_next/static/chunks/app/tajwid/page-90b2659612dbd5d3.js",revision:"90b2659612dbd5d3"},{url:"/_next/static/chunks/framework-292291387d6b2e39.js",revision:"292291387d6b2e39"},{url:"/_next/static/chunks/main-app-d8b2765bef5b5d56.js",revision:"d8b2765bef5b5d56"},{url:"/_next/static/chunks/main-e611b1f6b0591632.js",revision:"e611b1f6b0591632"},{url:"/_next/static/chunks/next/dist/client/components/builtin/app-error-90b2659612dbd5d3.js",revision:"90b2659612dbd5d3"},{url:"/_next/static/chunks/next/dist/client/components/builtin/forbidden-90b2659612dbd5d3.js",revision:"90b2659612dbd5d3"},{url:"/_next/static/chunks/next/dist/client/components/builtin/global-error-94cea2d7206eaabf.js",revision:"94cea2d7206eaabf"},{url:"/_next/static/chunks/next/dist/client/components/builtin/not-found-90b2659612dbd5d3.js",revision:"90b2659612dbd5d3"},{url:"/_next/static/chunks/next/dist/client/components/builtin/unauthorized-90b2659612dbd5d3.js",revision:"90b2659612dbd5d3"},{url:"/_next/static/chunks/polyfills-42372ed130431b0a.js",revision:"846118c33b2c0e922d7b3a7676f81f6f"},{url:"/_next/static/chunks/webpack-85360cc704f26f14.js",revision:"85360cc704f26f14"},{url:"/_next/static/css/3b0fbf80d7664460.css",revision:"3b0fbf80d7664460"},{url:"/_next/static/media/4cf2300e9c8272f7-s.p.woff2",revision:"18bae71b1e1b2bb25321090a3b563103"},{url:"/_next/static/media/747892c23ea88013-s.woff2",revision:"a0761690ccf4441ace5cec893b82d4ab"},{url:"/_next/static/media/8d697b304b401681-s.woff2",revision:"cc728f6c0adb04da0dfcb0fc436a8ae5"},{url:"/_next/static/media/93f479601ee12b01-s.p.woff2",revision:"da83d5f06d825c5ae65b7cca706cb312"},{url:"/_next/static/media/9610d9e46709d722-s.woff2",revision:"7b7c0ef93df188a852344fc272fc096b"},{url:"/_next/static/media/ba015fad6dcf6784-s.woff2",revision:"8ea4f719af3312a055caf09f34c89a77"},{url:"/_next/static/tifjGFIuAojqvem7tRQZV/_buildManifest.js",revision:"4e59d0044fd0d5e24d4e79be768fe9e9"},{url:"/_next/static/tifjGFIuAojqvem7tRQZV/_ssgManifest.js",revision:"b6652df95db52feb4daf4eca35380933"},{url:"/icon.png",revision:"b67edc3f92b8ba71926d186f83fbc914"},{url:"/icons/apple-touch-icon.png",revision:"bfd3517affd7c4bcf10626fe38c9216b"},{url:"/icons/favicon-16x16.png",revision:"e3ea9bcfcaca18c6f0cfb270e20a20be"},{url:"/icons/favicon-32x32.png",revision:"4c4888f1dcdc3023b49754ab295a4002"},{url:"/icons/favicon.ico",revision:"8448fa1bacb58346ccfda7348f33b6ac"},{url:"/icons/icon-128x128.png",revision:"ae4a4651ce26a0001f73b2e11f40a670"},{url:"/icons/icon-144x144.png",revision:"71acb64d983c5754245802bd215f2c11"},{url:"/icons/icon-152x152.png",revision:"7282ace791267754411a8af6d1a2c07c"},{url:"/icons/icon-192x192.png",revision:"6a31efb4dee28039b39cc97042cb9149"},{url:"/icons/icon-384x384.png",revision:"5e5f94f6564aee988eebc4f8a02029ad"},{url:"/icons/icon-512x512.png",revision:"d00028258367382f674fba5038b2ff01"},{url:"/icons/icon-72x72.png",revision:"d4639c22a7f6766e1dba7b540735de80"},{url:"/icons/icon-96x96.png",revision:"0a5ab01fc9a85c07beedfcf132475850"},{url:"/manifest.json",revision:"8380968c466602b15dd14c6ae727a360"},{url:"/robots.txt",revision:"375ed186decea1a0321e5dc6090d3f73"}],{ignoreURLParametersMatching:[]}),e.cleanupOutdatedCaches(),e.registerRoute("/",new e.NetworkFirst({cacheName:"start-url",plugins:[{cacheWillUpdate:async({request:e,response:s,event:n,state:i})=>s&&"opaqueredirect"===s.type?new Response(s.body,{status:200,statusText:"OK",headers:s.headers}):s}]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,new e.CacheFirst({cacheName:"google-fonts-webfonts",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:31536e3})]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,new e.StaleWhileRevalidate({cacheName:"google-fonts-stylesheets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,new e.StaleWhileRevalidate({cacheName:"static-font-assets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,new e.StaleWhileRevalidate({cacheName:"static-image-assets",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/_next\/image\?url=.+$/i,new e.StaleWhileRevalidate({cacheName:"next-image",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:mp3|wav|ogg)$/i,new e.CacheFirst({cacheName:"static-audio-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:mp4)$/i,new e.CacheFirst({cacheName:"static-video-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:js)$/i,new e.StaleWhileRevalidate({cacheName:"static-js-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:css|less)$/i,new e.StaleWhileRevalidate({cacheName:"static-style-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/_next\/data\/.+\/.+\.json$/i,new e.StaleWhileRevalidate({cacheName:"next-data",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:json|xml|csv)$/i,new e.NetworkFirst({cacheName:"static-data-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(({url:e})=>{if(!(self.origin===e.origin))return!1;const s=e.pathname;return!s.startsWith("/api/auth/")&&!!s.startsWith("/api/")},new e.NetworkFirst({cacheName:"apis",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:16,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(({url:e})=>{if(!(self.origin===e.origin))return!1;return!e.pathname.startsWith("/api/")},new e.NetworkFirst({cacheName:"others",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(({url:e})=>!(self.origin===e.origin),new e.NetworkFirst({cacheName:"cross-origin",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:3600})]}),"GET")});



//public/workbox-4754cb34.js

define(["exports"],function(t){"use strict";try{self["workbox:core:6.5.4"]&&_()}catch(t){}const e=(t,...e)=>{let s=t;return e.length>0&&(s+=` :: ${JSON.stringify(e)}`),s};class s extends Error{constructor(t,s){super(e(t,s)),this.name=t,this.details=s}}try{self["workbox:routing:6.5.4"]&&_()}catch(t){}const n=t=>t&&"object"==typeof t?t:{handle:t};class r{constructor(t,e,s="GET"){this.handler=n(e),this.match=t,this.method=s}setCatchHandler(t){this.catchHandler=n(t)}}class i extends r{constructor(t,e,s){super(({url:e})=>{const s=t.exec(e.href);if(s&&(e.origin===location.origin||0===s.index))return s.slice(1)},e,s)}}class a{constructor(){this.t=new Map,this.i=new Map}get routes(){return this.t}addFetchListener(){self.addEventListener("fetch",t=>{const{request:e}=t,s=this.handleRequest({request:e,event:t});s&&t.respondWith(s)})}addCacheListener(){self.addEventListener("message",t=>{if(t.data&&"CACHE_URLS"===t.data.type){const{payload:e}=t.data,s=Promise.all(e.urlsToCache.map(e=>{"string"==typeof e&&(e=[e]);const s=new Request(...e);return this.handleRequest({request:s,event:t})}));t.waitUntil(s),t.ports&&t.ports[0]&&s.then(()=>t.ports[0].postMessage(!0))}})}handleRequest({request:t,event:e}){const s=new URL(t.url,location.href);if(!s.protocol.startsWith("http"))return;const n=s.origin===location.origin,{params:r,route:i}=this.findMatchingRoute({event:e,request:t,sameOrigin:n,url:s});let a=i&&i.handler;const o=t.method;if(!a&&this.i.has(o)&&(a=this.i.get(o)),!a)return;let c;try{c=a.handle({url:s,request:t,event:e,params:r})}catch(t){c=Promise.reject(t)}const h=i&&i.catchHandler;return c instanceof Promise&&(this.o||h)&&(c=c.catch(async n=>{if(h)try{return await h.handle({url:s,request:t,event:e,params:r})}catch(t){t instanceof Error&&(n=t)}if(this.o)return this.o.handle({url:s,request:t,event:e});throw n})),c}findMatchingRoute({url:t,sameOrigin:e,request:s,event:n}){const r=this.t.get(s.method)||[];for(const i of r){let r;const a=i.match({url:t,sameOrigin:e,request:s,event:n});if(a)return r=a,(Array.isArray(r)&&0===r.length||a.constructor===Object&&0===Object.keys(a).length||"boolean"==typeof a)&&(r=void 0),{route:i,params:r}}return{}}setDefaultHandler(t,e="GET"){this.i.set(e,n(t))}setCatchHandler(t){this.o=n(t)}registerRoute(t){this.t.has(t.method)||this.t.set(t.method,[]),this.t.get(t.method).push(t)}unregisterRoute(t){if(!this.t.has(t.method))throw new s("unregister-route-but-not-found-with-method",{method:t.method});const e=this.t.get(t.method).indexOf(t);if(!(e>-1))throw new s("unregister-route-route-not-registered");this.t.get(t.method).splice(e,1)}}let o;const c=()=>(o||(o=new a,o.addFetchListener(),o.addCacheListener()),o);function h(t,e,n){let a;if("string"==typeof t){const s=new URL(t,location.href);a=new r(({url:t})=>t.href===s.href,e,n)}else if(t instanceof RegExp)a=new i(t,e,n);else if("function"==typeof t)a=new r(t,e,n);else{if(!(t instanceof r))throw new s("unsupported-route-type",{moduleName:"workbox-routing",funcName:"registerRoute",paramName:"capture"});a=t}return c().registerRoute(a),a}try{self["workbox:strategies:6.5.4"]&&_()}catch(t){}const u={cacheWillUpdate:async({response:t})=>200===t.status||0===t.status?t:null},l={googleAnalytics:"googleAnalytics",precache:"precache-v2",prefix:"workbox",runtime:"runtime",suffix:"undefined"!=typeof registration?registration.scope:""},f=t=>[l.prefix,t,l.suffix].filter(t=>t&&t.length>0).join("-"),w=t=>t||f(l.precache),d=t=>t||f(l.runtime);function p(t,e){const s=new URL(t);for(const t of e)s.searchParams.delete(t);return s.href}class y{constructor(){this.promise=new Promise((t,e)=>{this.resolve=t,this.reject=e})}}const g=new Set;function m(t){return"string"==typeof t?new Request(t):t}class v{constructor(t,e){this.h={},Object.assign(this,e),this.event=e.event,this.u=t,this.l=new y,this.p=[],this.m=[...t.plugins],this.v=new Map;for(const t of this.m)this.v.set(t,{});this.event.waitUntil(this.l.promise)}async fetch(t){const{event:e}=this;let n=m(t);if("navigate"===n.mode&&e instanceof FetchEvent&&e.preloadResponse){const t=await e.preloadResponse;if(t)return t}const r=this.hasCallback("fetchDidFail")?n.clone():null;try{for(const t of this.iterateCallbacks("requestWillFetch"))n=await t({request:n.clone(),event:e})}catch(t){if(t instanceof Error)throw new s("plugin-error-request-will-fetch",{thrownErrorMessage:t.message})}const i=n.clone();try{let t;t=await fetch(n,"navigate"===n.mode?void 0:this.u.fetchOptions);for(const s of this.iterateCallbacks("fetchDidSucceed"))t=await s({event:e,request:i,response:t});return t}catch(t){throw r&&await this.runCallbacks("fetchDidFail",{error:t,event:e,originalRequest:r.clone(),request:i.clone()}),t}}async fetchAndCachePut(t){const e=await this.fetch(t),s=e.clone();return this.waitUntil(this.cachePut(t,s)),e}async cacheMatch(t){const e=m(t);let s;const{cacheName:n,matchOptions:r}=this.u,i=await this.getCacheKey(e,"read"),a=Object.assign(Object.assign({},r),{cacheName:n});s=await caches.match(i,a);for(const t of this.iterateCallbacks("cachedResponseWillBeUsed"))s=await t({cacheName:n,matchOptions:r,cachedResponse:s,request:i,event:this.event})||void 0;return s}async cachePut(t,e){const n=m(t);var r;await(r=0,new Promise(t=>setTimeout(t,r)));const i=await this.getCacheKey(n,"write");if(!e)throw new s("cache-put-with-no-response",{url:(a=i.url,new URL(String(a),location.href).href.replace(new RegExp(`^${location.origin}`),""))});var a;const o=await this.R(e);if(!o)return!1;const{cacheName:c,matchOptions:h}=this.u,u=await self.caches.open(c),l=this.hasCallback("cacheDidUpdate"),f=l?await async function(t,e,s,n){const r=p(e.url,s);if(e.url===r)return t.match(e,n);const i=Object.assign(Object.assign({},n),{ignoreSearch:!0}),a=await t.keys(e,i);for(const e of a)if(r===p(e.url,s))return t.match(e,n)}(u,i.clone(),["__WB_REVISION__"],h):null;try{await u.put(i,l?o.clone():o)}catch(t){if(t instanceof Error)throw"QuotaExceededError"===t.name&&await async function(){for(const t of g)await t()}(),t}for(const t of this.iterateCallbacks("cacheDidUpdate"))await t({cacheName:c,oldResponse:f,newResponse:o.clone(),request:i,event:this.event});return!0}async getCacheKey(t,e){const s=`${t.url} | ${e}`;if(!this.h[s]){let n=t;for(const t of this.iterateCallbacks("cacheKeyWillBeUsed"))n=m(await t({mode:e,request:n,event:this.event,params:this.params}));this.h[s]=n}return this.h[s]}hasCallback(t){for(const e of this.u.plugins)if(t in e)return!0;return!1}async runCallbacks(t,e){for(const s of this.iterateCallbacks(t))await s(e)}*iterateCallbacks(t){for(const e of this.u.plugins)if("function"==typeof e[t]){const s=this.v.get(e),n=n=>{const r=Object.assign(Object.assign({},n),{state:s});return e[t](r)};yield n}}waitUntil(t){return this.p.push(t),t}async doneWaiting(){let t;for(;t=this.p.shift();)await t}destroy(){this.l.resolve(null)}async R(t){let e=t,s=!1;for(const t of this.iterateCallbacks("cacheWillUpdate"))if(e=await t({request:this.request,response:e,event:this.event})||void 0,s=!0,!e)break;return s||e&&200!==e.status&&(e=void 0),e}}class R{constructor(t={}){this.cacheName=d(t.cacheName),this.plugins=t.plugins||[],this.fetchOptions=t.fetchOptions,this.matchOptions=t.matchOptions}handle(t){const[e]=this.handleAll(t);return e}handleAll(t){t instanceof FetchEvent&&(t={event:t,request:t.request});const e=t.event,s="string"==typeof t.request?new Request(t.request):t.request,n="params"in t?t.params:void 0,r=new v(this,{event:e,request:s,params:n}),i=this.q(r,s,e);return[i,this.D(i,r,s,e)]}async q(t,e,n){let r;await t.runCallbacks("handlerWillStart",{event:n,request:e});try{if(r=await this.U(e,t),!r||"error"===r.type)throw new s("no-response",{url:e.url})}catch(s){if(s instanceof Error)for(const i of t.iterateCallbacks("handlerDidError"))if(r=await i({error:s,event:n,request:e}),r)break;if(!r)throw s}for(const s of t.iterateCallbacks("handlerWillRespond"))r=await s({event:n,request:e,response:r});return r}async D(t,e,s,n){let r,i;try{r=await t}catch(i){}try{await e.runCallbacks("handlerDidRespond",{event:n,request:s,response:r}),await e.doneWaiting()}catch(t){t instanceof Error&&(i=t)}if(await e.runCallbacks("handlerDidComplete",{event:n,request:s,response:r,error:i}),e.destroy(),i)throw i}}function b(t){t.then(()=>{})}function q(){return q=Object.assign?Object.assign.bind():function(t){for(var e=1;e<arguments.length;e++){var s=arguments[e];for(var n in s)({}).hasOwnProperty.call(s,n)&&(t[n]=s[n])}return t},q.apply(null,arguments)}let D,U;const x=new WeakMap,L=new WeakMap,I=new WeakMap,C=new WeakMap,E=new WeakMap;let N={get(t,e,s){if(t instanceof IDBTransaction){if("done"===e)return L.get(t);if("objectStoreNames"===e)return t.objectStoreNames||I.get(t);if("store"===e)return s.objectStoreNames[1]?void 0:s.objectStore(s.objectStoreNames[0])}return k(t[e])},set:(t,e,s)=>(t[e]=s,!0),has:(t,e)=>t instanceof IDBTransaction&&("done"===e||"store"===e)||e in t};function O(t){return t!==IDBDatabase.prototype.transaction||"objectStoreNames"in IDBTransaction.prototype?(U||(U=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])).includes(t)?function(...e){return t.apply(B(this),e),k(x.get(this))}:function(...e){return k(t.apply(B(this),e))}:function(e,...s){const n=t.call(B(this),e,...s);return I.set(n,e.sort?e.sort():[e]),k(n)}}function T(t){return"function"==typeof t?O(t):(t instanceof IDBTransaction&&function(t){if(L.has(t))return;const e=new Promise((e,s)=>{const n=()=>{t.removeEventListener("complete",r),t.removeEventListener("error",i),t.removeEventListener("abort",i)},r=()=>{e(),n()},i=()=>{s(t.error||new DOMException("AbortError","AbortError")),n()};t.addEventListener("complete",r),t.addEventListener("error",i),t.addEventListener("abort",i)});L.set(t,e)}(t),e=t,(D||(D=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])).some(t=>e instanceof t)?new Proxy(t,N):t);var e}function k(t){if(t instanceof IDBRequest)return function(t){const e=new Promise((e,s)=>{const n=()=>{t.removeEventListener("success",r),t.removeEventListener("error",i)},r=()=>{e(k(t.result)),n()},i=()=>{s(t.error),n()};t.addEventListener("success",r),t.addEventListener("error",i)});return e.then(e=>{e instanceof IDBCursor&&x.set(e,t)}).catch(()=>{}),E.set(e,t),e}(t);if(C.has(t))return C.get(t);const e=T(t);return e!==t&&(C.set(t,e),E.set(e,t)),e}const B=t=>E.get(t);const P=["get","getKey","getAll","getAllKeys","count"],M=["put","add","delete","clear"],W=new Map;function j(t,e){if(!(t instanceof IDBDatabase)||e in t||"string"!=typeof e)return;if(W.get(e))return W.get(e);const s=e.replace(/FromIndex$/,""),n=e!==s,r=M.includes(s);if(!(s in(n?IDBIndex:IDBObjectStore).prototype)||!r&&!P.includes(s))return;const i=async function(t,...e){const i=this.transaction(t,r?"readwrite":"readonly");let a=i.store;return n&&(a=a.index(e.shift())),(await Promise.all([a[s](...e),r&&i.done]))[0]};return W.set(e,i),i}N=(t=>q({},t,{get:(e,s,n)=>j(e,s)||t.get(e,s,n),has:(e,s)=>!!j(e,s)||t.has(e,s)}))(N);try{self["workbox:expiration:6.5.4"]&&_()}catch(t){}const S="cache-entries",K=t=>{const e=new URL(t,location.href);return e.hash="",e.href};class A{constructor(t){this._=null,this.L=t}I(t){const e=t.createObjectStore(S,{keyPath:"id"});e.createIndex("cacheName","cacheName",{unique:!1}),e.createIndex("timestamp","timestamp",{unique:!1})}C(t){this.I(t),this.L&&function(t,{blocked:e}={}){const s=indexedDB.deleteDatabase(t);e&&s.addEventListener("blocked",t=>e(t.oldVersion,t)),k(s).then(()=>{})}(this.L)}async setTimestamp(t,e){const s={url:t=K(t),timestamp:e,cacheName:this.L,id:this.N(t)},n=(await this.getDb()).transaction(S,"readwrite",{durability:"relaxed"});await n.store.put(s),await n.done}async getTimestamp(t){const e=await this.getDb(),s=await e.get(S,this.N(t));return null==s?void 0:s.timestamp}async expireEntries(t,e){const s=await this.getDb();let n=await s.transaction(S).store.index("timestamp").openCursor(null,"prev");const r=[];let i=0;for(;n;){const s=n.value;s.cacheName===this.L&&(t&&s.timestamp<t||e&&i>=e?r.push(n.value):i++),n=await n.continue()}const a=[];for(const t of r)await s.delete(S,t.id),a.push(t.url);return a}N(t){return this.L+"|"+K(t)}async getDb(){return this._||(this._=await function(t,e,{blocked:s,upgrade:n,blocking:r,terminated:i}={}){const a=indexedDB.open(t,e),o=k(a);return n&&a.addEventListener("upgradeneeded",t=>{n(k(a.result),t.oldVersion,t.newVersion,k(a.transaction),t)}),s&&a.addEventListener("blocked",t=>s(t.oldVersion,t.newVersion,t)),o.then(t=>{i&&t.addEventListener("close",()=>i()),r&&t.addEventListener("versionchange",t=>r(t.oldVersion,t.newVersion,t))}).catch(()=>{}),o}("workbox-expiration",1,{upgrade:this.C.bind(this)})),this._}}class F{constructor(t,e={}){this.O=!1,this.T=!1,this.k=e.maxEntries,this.B=e.maxAgeSeconds,this.P=e.matchOptions,this.L=t,this.M=new A(t)}async expireEntries(){if(this.O)return void(this.T=!0);this.O=!0;const t=this.B?Date.now()-1e3*this.B:0,e=await this.M.expireEntries(t,this.k),s=await self.caches.open(this.L);for(const t of e)await s.delete(t,this.P);this.O=!1,this.T&&(this.T=!1,b(this.expireEntries()))}async updateTimestamp(t){await this.M.setTimestamp(t,Date.now())}async isURLExpired(t){if(this.B){const e=await this.M.getTimestamp(t),s=Date.now()-1e3*this.B;return void 0===e||e<s}return!1}async delete(){this.T=!1,await this.M.expireEntries(1/0)}}try{self["workbox:range-requests:6.5.4"]&&_()}catch(t){}async function H(t,e){try{if(206===e.status)return e;const n=t.headers.get("range");if(!n)throw new s("no-range-header");const r=function(t){const e=t.trim().toLowerCase();if(!e.startsWith("bytes="))throw new s("unit-must-be-bytes",{normalizedRangeHeader:e});if(e.includes(","))throw new s("single-range-only",{normalizedRangeHeader:e});const n=/(\d*)-(\d*)/.exec(e);if(!n||!n[1]&&!n[2])throw new s("invalid-range-values",{normalizedRangeHeader:e});return{start:""===n[1]?void 0:Number(n[1]),end:""===n[2]?void 0:Number(n[2])}}(n),i=await e.blob(),a=function(t,e,n){const r=t.size;if(n&&n>r||e&&e<0)throw new s("range-not-satisfiable",{size:r,end:n,start:e});let i,a;return void 0!==e&&void 0!==n?(i=e,a=n+1):void 0!==e&&void 0===n?(i=e,a=r):void 0!==n&&void 0===e&&(i=r-n,a=r),{start:i,end:a}}(i,r.start,r.end),o=i.slice(a.start,a.end),c=o.size,h=new Response(o,{status:206,statusText:"Partial Content",headers:e.headers});return h.headers.set("Content-Length",String(c)),h.headers.set("Content-Range",`bytes ${a.start}-${a.end-1}/${i.size}`),h}catch(t){return new Response("",{status:416,statusText:"Range Not Satisfiable"})}}function $(t,e){const s=e();return t.waitUntil(s),s}try{self["workbox:precaching:6.5.4"]&&_()}catch(t){}function z(t){if(!t)throw new s("add-to-cache-list-unexpected-type",{entry:t});if("string"==typeof t){const e=new URL(t,location.href);return{cacheKey:e.href,url:e.href}}const{revision:e,url:n}=t;if(!n)throw new s("add-to-cache-list-unexpected-type",{entry:t});if(!e){const t=new URL(n,location.href);return{cacheKey:t.href,url:t.href}}const r=new URL(n,location.href),i=new URL(n,location.href);return r.searchParams.set("__WB_REVISION__",e),{cacheKey:r.href,url:i.href}}class G{constructor(){this.updatedURLs=[],this.notUpdatedURLs=[],this.handlerWillStart=async({request:t,state:e})=>{e&&(e.originalRequest=t)},this.cachedResponseWillBeUsed=async({event:t,state:e,cachedResponse:s})=>{if("install"===t.type&&e&&e.originalRequest&&e.originalRequest instanceof Request){const t=e.originalRequest.url;s?this.notUpdatedURLs.push(t):this.updatedURLs.push(t)}return s}}}class V{constructor({precacheController:t}){this.cacheKeyWillBeUsed=async({request:t,params:e})=>{const s=(null==e?void 0:e.cacheKey)||this.W.getCacheKeyForURL(t.url);return s?new Request(s,{headers:t.headers}):t},this.W=t}}let J,Q;async function X(t,e){let n=null;if(t.url){n=new URL(t.url).origin}if(n!==self.location.origin)throw new s("cross-origin-copy-response",{origin:n});const r=t.clone(),i={headers:new Headers(r.headers),status:r.status,statusText:r.statusText},a=e?e(i):i,o=function(){if(void 0===J){const t=new Response("");if("body"in t)try{new Response(t.body),J=!0}catch(t){J=!1}J=!1}return J}()?r.body:await r.blob();return new Response(o,a)}class Y extends R{constructor(t={}){t.cacheName=w(t.cacheName),super(t),this.j=!1!==t.fallbackToNetwork,this.plugins.push(Y.copyRedirectedCacheableResponsesPlugin)}async U(t,e){const s=await e.cacheMatch(t);return s||(e.event&&"install"===e.event.type?await this.S(t,e):await this.K(t,e))}async K(t,e){let n;const r=e.params||{};if(!this.j)throw new s("missing-precache-entry",{cacheName:this.cacheName,url:t.url});{const s=r.integrity,i=t.integrity,a=!i||i===s;n=await e.fetch(new Request(t,{integrity:"no-cors"!==t.mode?i||s:void 0})),s&&a&&"no-cors"!==t.mode&&(this.A(),await e.cachePut(t,n.clone()))}return n}async S(t,e){this.A();const n=await e.fetch(t);if(!await e.cachePut(t,n.clone()))throw new s("bad-precaching-response",{url:t.url,status:n.status});return n}A(){let t=null,e=0;for(const[s,n]of this.plugins.entries())n!==Y.copyRedirectedCacheableResponsesPlugin&&(n===Y.defaultPrecacheCacheabilityPlugin&&(t=s),n.cacheWillUpdate&&e++);0===e?this.plugins.push(Y.defaultPrecacheCacheabilityPlugin):e>1&&null!==t&&this.plugins.splice(t,1)}}Y.defaultPrecacheCacheabilityPlugin={cacheWillUpdate:async({response:t})=>!t||t.status>=400?null:t},Y.copyRedirectedCacheableResponsesPlugin={cacheWillUpdate:async({response:t})=>t.redirected?await X(t):t};class Z{constructor({cacheName:t,plugins:e=[],fallbackToNetwork:s=!0}={}){this.F=new Map,this.H=new Map,this.$=new Map,this.u=new Y({cacheName:w(t),plugins:[...e,new V({precacheController:this})],fallbackToNetwork:s}),this.install=this.install.bind(this),this.activate=this.activate.bind(this)}get strategy(){return this.u}precache(t){this.addToCacheList(t),this.G||(self.addEventListener("install",this.install),self.addEventListener("activate",this.activate),this.G=!0)}addToCacheList(t){const e=[];for(const n of t){"string"==typeof n?e.push(n):n&&void 0===n.revision&&e.push(n.url);const{cacheKey:t,url:r}=z(n),i="string"!=typeof n&&n.revision?"reload":"default";if(this.F.has(r)&&this.F.get(r)!==t)throw new s("add-to-cache-list-conflicting-entries",{firstEntry:this.F.get(r),secondEntry:t});if("string"!=typeof n&&n.integrity){if(this.$.has(t)&&this.$.get(t)!==n.integrity)throw new s("add-to-cache-list-conflicting-integrities",{url:r});this.$.set(t,n.integrity)}if(this.F.set(r,t),this.H.set(r,i),e.length>0){const t=`Workbox is precaching URLs without revision info: ${e.join(", ")}\nThis is generally NOT safe. Learn more at https://bit.ly/wb-precache`;console.warn(t)}}}install(t){return $(t,async()=>{const e=new G;this.strategy.plugins.push(e);for(const[e,s]of this.F){const n=this.$.get(s),r=this.H.get(e),i=new Request(e,{integrity:n,cache:r,credentials:"same-origin"});await Promise.all(this.strategy.handleAll({params:{cacheKey:s},request:i,event:t}))}const{updatedURLs:s,notUpdatedURLs:n}=e;return{updatedURLs:s,notUpdatedURLs:n}})}activate(t){return $(t,async()=>{const t=await self.caches.open(this.strategy.cacheName),e=await t.keys(),s=new Set(this.F.values()),n=[];for(const r of e)s.has(r.url)||(await t.delete(r),n.push(r.url));return{deletedURLs:n}})}getURLsToCacheKeys(){return this.F}getCachedURLs(){return[...this.F.keys()]}getCacheKeyForURL(t){const e=new URL(t,location.href);return this.F.get(e.href)}getIntegrityForCacheKey(t){return this.$.get(t)}async matchPrecache(t){const e=t instanceof Request?t.url:t,s=this.getCacheKeyForURL(e);if(s){return(await self.caches.open(this.strategy.cacheName)).match(s)}}createHandlerBoundToURL(t){const e=this.getCacheKeyForURL(t);if(!e)throw new s("non-precached-url",{url:t});return s=>(s.request=new Request(t),s.params=Object.assign({cacheKey:e},s.params),this.strategy.handle(s))}}const tt=()=>(Q||(Q=new Z),Q);class et extends r{constructor(t,e){super(({request:s})=>{const n=t.getURLsToCacheKeys();for(const r of function*(t,{ignoreURLParametersMatching:e=[/^utm_/,/^fbclid$/],directoryIndex:s="index.html",cleanURLs:n=!0,urlManipulation:r}={}){const i=new URL(t,location.href);i.hash="",yield i.href;const a=function(t,e=[]){for(const s of[...t.searchParams.keys()])e.some(t=>t.test(s))&&t.searchParams.delete(s);return t}(i,e);if(yield a.href,s&&a.pathname.endsWith("/")){const t=new URL(a.href);t.pathname+=s,yield t.href}if(n){const t=new URL(a.href);t.pathname+=".html",yield t.href}if(r){const t=r({url:i});for(const e of t)yield e.href}}(s.url,e)){const e=n.get(r);if(e){return{cacheKey:e,integrity:t.getIntegrityForCacheKey(e)}}}},t.strategy)}}t.CacheFirst=class extends R{async U(t,e){let n,r=await e.cacheMatch(t);if(!r)try{r=await e.fetchAndCachePut(t)}catch(t){t instanceof Error&&(n=t)}if(!r)throw new s("no-response",{url:t.url,error:n});return r}},t.ExpirationPlugin=class{constructor(t={}){this.cachedResponseWillBeUsed=async({event:t,request:e,cacheName:s,cachedResponse:n})=>{if(!n)return null;const r=this.V(n),i=this.J(s);b(i.expireEntries());const a=i.updateTimestamp(e.url);if(t)try{t.waitUntil(a)}catch(t){}return r?n:null},this.cacheDidUpdate=async({cacheName:t,request:e})=>{const s=this.J(t);await s.updateTimestamp(e.url),await s.expireEntries()},this.X=t,this.B=t.maxAgeSeconds,this.Y=new Map,t.purgeOnQuotaError&&function(t){g.add(t)}(()=>this.deleteCacheAndMetadata())}J(t){if(t===d())throw new s("expire-custom-caches-only");let e=this.Y.get(t);return e||(e=new F(t,this.X),this.Y.set(t,e)),e}V(t){if(!this.B)return!0;const e=this.Z(t);if(null===e)return!0;return e>=Date.now()-1e3*this.B}Z(t){if(!t.headers.has("date"))return null;const e=t.headers.get("date"),s=new Date(e).getTime();return isNaN(s)?null:s}async deleteCacheAndMetadata(){for(const[t,e]of this.Y)await self.caches.delete(t),await e.delete();this.Y=new Map}},t.NetworkFirst=class extends R{constructor(t={}){super(t),this.plugins.some(t=>"cacheWillUpdate"in t)||this.plugins.unshift(u),this.tt=t.networkTimeoutSeconds||0}async U(t,e){const n=[],r=[];let i;if(this.tt){const{id:s,promise:a}=this.et({request:t,logs:n,handler:e});i=s,r.push(a)}const a=this.st({timeoutId:i,request:t,logs:n,handler:e});r.push(a);const o=await e.waitUntil((async()=>await e.waitUntil(Promise.race(r))||await a)());if(!o)throw new s("no-response",{url:t.url});return o}et({request:t,logs:e,handler:s}){let n;return{promise:new Promise(e=>{n=setTimeout(async()=>{e(await s.cacheMatch(t))},1e3*this.tt)}),id:n}}async st({timeoutId:t,request:e,logs:s,handler:n}){let r,i;try{i=await n.fetchAndCachePut(e)}catch(t){t instanceof Error&&(r=t)}return t&&clearTimeout(t),!r&&i||(i=await n.cacheMatch(e)),i}},t.RangeRequestsPlugin=class{constructor(){this.cachedResponseWillBeUsed=async({request:t,cachedResponse:e})=>e&&t.headers.has("range")?await H(t,e):e}},t.StaleWhileRevalidate=class extends R{constructor(t={}){super(t),this.plugins.some(t=>"cacheWillUpdate"in t)||this.plugins.unshift(u)}async U(t,e){const n=e.fetchAndCachePut(t).catch(()=>{});e.waitUntil(n);let r,i=await e.cacheMatch(t);if(i);else try{i=await n}catch(t){t instanceof Error&&(r=t)}if(!i)throw new s("no-response",{url:t.url,error:r});return i}},t.cleanupOutdatedCaches=function(){self.addEventListener("activate",t=>{const e=w();t.waitUntil((async(t,e="-precache-")=>{const s=(await self.caches.keys()).filter(s=>s.includes(e)&&s.includes(self.registration.scope)&&s!==t);return await Promise.all(s.map(t=>self.caches.delete(t))),s})(e).then(t=>{}))})},t.clientsClaim=function(){self.addEventListener("activate",()=>self.clients.claim())},t.precacheAndRoute=function(t,e){!function(t){tt().precache(t)}(t),function(t){const e=tt();h(new et(e,t))}(e)},t.registerRoute=h});



//next.config.ts

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // PWA Configuration
  pwa: {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'offlineCache',
          expiration: {
            maxEntries: 200,
          },
        },
      },
    ],
  },
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
    "lint": "eslint",
    "build:pwa": "next build && next-pwa"
  },
  "dependencies": {
    "next": "^16.1.1",
    "next-pwa": "^5.6.0",
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
import "./.next/types/routes.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.



