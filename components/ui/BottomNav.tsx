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