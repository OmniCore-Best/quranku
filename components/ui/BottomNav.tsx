'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import { PiHandsPrayingBold, PiHandsPraying } from 'react-icons/pi';

// Heroicons – Solid
import { BookOpenIcon as BookOpenSolid } from '@heroicons/react/24/solid';
import { ClockIcon as ClockSolid } from '@heroicons/react/24/solid';
import { HandRaisedIcon as HandRaisedSolid } from '@heroicons/react/24/solid';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/solid';

// Heroicons – Outline
import { BookOpenIcon as BookOpenOutline } from '@heroicons/react/24/outline';
import { ClockIcon as ClockOutline } from '@heroicons/react/24/outline';
import { HandRaisedIcon as HandRaisedOutline } from '@heroicons/react/24/outline';

// Lazy load PopupMenu
const PopupMenu = dynamic(() => import('./PopupMenu'), {
  loading: () => (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4 flex justify-center">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
  ssr: false,
});

interface MenuItem {
  href: string;
  label: string;
  iconSolid: React.ReactNode;
  iconOutline: React.ReactNode;
}

const BottomNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Tutup popup saat navigasi
  useEffect(() => {
    setIsPopupOpen(false);
  }, [pathname]);

  const navItems: MenuItem[] = [
    {
      href: '/',
      label: 'Quran',
      iconSolid: <BookOpenSolid className="w-5 h-5" />,
      iconOutline: <BookOpenOutline className="w-5 h-5" />
    },
    {
      href: '/schedule',
      label: 'Schedule',
      iconSolid: <ClockSolid className="w-5 h-5" />,
      iconOutline: <ClockOutline className="w-5 h-5" />
    },
    {
      href: '/tajwid',
      label: 'Tajwid',
      iconSolid: <BookOpenSolid className="w-5 h-5" />,
      iconOutline: <BookOpenOutline className="w-5 h-5" />
    },
    {
      href: '/prayer',
      label: 'Doa',
      iconSolid: <PiHandsPrayingBold className="w-5 h-5" />,
      iconOutline: <PiHandsPraying className="w-5 h-5" />
    }
  ];

  const handleNavClick = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <>
      {/* POPUP MENU dengan AnimatePresence */}
      <AnimatePresence>
        {isPopupOpen && (
          <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center pointer-events-none">
            <div className="w-[280px] pointer-events-auto">
              <PopupMenu onClose={() => setIsPopupOpen(false)} />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 py-2 px-2">
        <div className="grid grid-cols-5 items-end max-w-md mx-auto">
          {/* 2 item kiri */}
          {navItems.slice(0, 2).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.href);
                }}
                className="flex flex-col items-center py-1"
              >
                <div
                  className={`p-2 rounded-lg transition relative ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 scale-110'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {isActive ? item.iconSolid : item.iconOutline}
                  {isPending && isActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {item.label}
                </span>
                {isActive && <div className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />}
              </Link>
            );
          })}

          {/* Tombol FAB tengah */}
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
                <XMarkIcon className="w-4 h-4" />
              ) : (
                <PlusIcon className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* 2 item kanan */}
          {navItems.slice(2).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.href);
                }}
                className="flex flex-col items-center py-1"
              >
                <div
                  className={`p-2 rounded-lg transition relative ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 scale-110'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {isActive ? item.iconSolid : item.iconOutline}
                  {isPending && isActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {item.label}
                </span>
                {isActive && <div className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;