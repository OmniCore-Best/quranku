'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export default function ServiceWorkerRegistration() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none'
          });
          registrationRef.current = registration;

          console.log('Service Worker registered with scope:', registration.scope);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  toast.custom((t) => (
                    <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-4">
                      <p className="text-sm">Versi baru tersedia!</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                            toast.dismiss(t);
                          }}
                          className="bg-white text-blue-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-100"
                        >
                          Update sekarang
                        </button>
                        <button
                          onClick={() => toast.dismiss(t)}
                          className="bg-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-800"
                        >
                          Nanti
                        </button>
                      </div>
                    </div>
                  ), { duration: 0 });
                }
              });
            }
          });

          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'SW_ACTIVATED') {
              console.log('Service Worker activated, version:', event.data.version);
              toast.success('Aplikasi diperbarui!');
              window.location.reload();
            }
          });

        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      };

      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        window.addEventListener('load', registerServiceWorker);
      }
    }
  }, []);

  return null;
}