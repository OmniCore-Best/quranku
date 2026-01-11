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