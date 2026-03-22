importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Fetch Firebase config from the Next.js API route so env vars are injected
// at runtime without being embedded in the static SW file.
async function initFirebase() {
  const res = await fetch('/firebase-config.js');
  const js = await res.text();
  // eslint-disable-next-line no-new-func
  new Function(js)();

  const config = self.__FIREBASE_CONFIG__;
  firebase.initializeApp(config);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title ?? 'Hi Spot';
    const body = payload.notification?.body ?? '새 이벤트가 근처에 생성되었습니다.';
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      data: { url: payload.data?.url ?? '/' },
    });
  });
}

// NOTE: App shell caching (/) is intentionally disabled.
// Next.js App Router manages its own client-side routing and hydration.
// A service worker serving cached HTML for '/' causes
// "Router action dispatched before initialization" errors because the
// stale HTML doesn't match the current JS bundle.
// Only manifest.json is cached for PWA install support.
const CACHE_NAME = 'hi-spot-shell-v2';
const SHELL_URLS = ['/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      initFirebase(),
      caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)),
      // Purge old caches that included '/'
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const pathname = new URL(event.request.url).pathname;
  // Only serve manifest from cache; let Next.js handle all page navigation.
  if (pathname === '/manifest.json') {
    event.respondWith(
      caches.match(event.request).then((cached) => cached ?? fetch(event.request))
    );
  }
});

// Notification click → open app and navigate to the target URL.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
