// FisioFlow Service Worker
// Responsável por Push Notifications e Background Sync

const CACHE_NAME = 'fisioflow-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// Listener para Push Notifications (Backend -> SW)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Você tem uma nova notificação no FisioFlow.',
      icon: '/icon-192x192.png', // Necessário criar esses ícones no futuro
      badge: '/favicon.svg',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/agenda' // Onde abrir quando clicar
      },
      requireInteraction: data.requireInteraction || false,
      tag: data.tag || 'general'
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'FisioFlow Notificação', options)
    );
  } catch (e) {
    console.error('[SW] Erro ao processar Push Notification:', e);
    // Fallback se não for JSON
    event.waitUntil(
      self.registration.showNotification('FisioFlow', {
        body: event.data.text(),
        icon: '/favicon.svg'
      })
    );
  }
});

// Listener para clique na Notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/agenda';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se já houver uma aba aberta, foca nela e navega
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Se não houver, abre uma nova aba
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Cache Strategy: Network First, falling back to cache for API calls (optional for future offline-first)
// Fetch listener omitted for now to prevent Chrome "no-op" warning.

