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