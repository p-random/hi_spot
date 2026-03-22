'use client';

import { useEffect } from 'react';
import { onForegroundMessage } from '@/lib/firebase';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Register the combined FCM + app-shell service worker.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .catch((err) => console.error('[SW] Registration failed', err));
    }

    // Log foreground FCM messages (toast wiring deferred to toast task).
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('[FCM] Foreground message', payload);
    });

    return unsubscribe;
  }, []);

  return null;
}
