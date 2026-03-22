'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Delay SW registration so the App Router finishes initializing first.
    // Without this, the SW's install handler fetches '/' for caching, which
    // races with Next.js router hydration and triggers
    // "Router action dispatched before initialization".
    const timer = setTimeout(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/firebase-messaging-sw.js')
          .catch((err) => console.error('[SW] Registration failed', err));
      }

      // Lazily import Firebase messaging to avoid initializing with
      // placeholder env vars and to keep the critical path lean.
      import('@/lib/firebase').then(({ onForegroundMessage }) => {
        onForegroundMessage((payload) => {
          console.log('[FCM] Foreground message', payload);
        });
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
