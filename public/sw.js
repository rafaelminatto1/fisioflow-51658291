/**
 * FisioFlow Service Worker
 *
 * Handles:
 * - Web Push Notifications
 * - Background sync
 * - Cache strategies for offline support
 */

const CACHE_NAME = 'fisioflow-v1';
const OFFLINE_CACHE = 'fisioflow-offline';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/icons/badge-72x72.svg',
];

// ============================================================================
// INSTALL EVENT
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Install event');

  event.waitUntil(
    Promise.all([
      // Precache core assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      }),
      // Create offline cache
      caches.open(OFFLINE_CACHE),
    ])
  );

  // Activate immediately
  self.skipWaiting();
});

// ============================================================================
// ACTIVATE EVENT
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Take control of all clients
      self.clients.claim(),
    ])
  );
});

// ============================================================================
// PUSH EVENT
// ============================================================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  let notificationData = {
    title: 'FisioFlow',
    body: '',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/badge-72x72.svg',
    data: {},
    actions: [],
  };

  // Parse push data
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
      };
    } catch (e) {
      // If not JSON, use as text
      notificationData.body = event.data.text();
    }
  }

  // Skip silent notifications
  if (notificationData.silent) {
    return;
  }

  // Show notification
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    image: notificationData.image,
    data: notificationData.data,
    actions: notificationData.actions,
    tag: notificationData.tag || 'fisioflow-notification',
    requireInteraction: notificationData.requireInteraction || false,
    silent: notificationData.silent || false,
    vibrate: notificationData.vibrate || [200, 100, 200],
    timestamp: notificationData.timestamp || Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// ============================================================================
// NOTIFICATION CLICK EVENT
// ============================================================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click event');

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  // Handle action buttons
  if (action) {
    console.log('[SW] Action clicked:', action);
    handleNotificationAction(action, data);
    return;
  }

  // Default: Open app to relevant page
  event.waitUntil(
    getClientAndNavigate(data)
  );
});

/**
 * Handle notification action buttons
 */
async function handleNotificationAction(action: string, data: Record<string, unknown>) {
  const clients = await self.clients.matchAll({ type: 'window' });

  // Determine URL based on action and data
  let url = '/';

  switch (action) {
    case 'view':
      if (data.type === 'appointment') {
        url = `/agenda`;
      } else if (data.type === 'message') {
        url = `/mensagens`;
      } else if (data.type === 'exercise') {
        url = `/exercicios/${data.exerciseId}`;
      } else if (data.type === 'payment') {
        url = `/financeiro`;
      }
      break;

    case 'confirm':
      // Confirm action - open API endpoint
      if (data.confirmUrl) {
        await fetch(data.confirmUrl as string, { method: 'POST' });
      }
      url = data.successUrl as string || '/';
      break;

    case 'dismiss':
      // Just dismiss, don't navigate
      return;

    default:
      url = '/';
  }

  // Open or focus window
  if (clients.length > 0) {
    await clients[0].focus();
    await clients[0].navigate(url);
  } else {
    await self.clients.openWindow(url);
  }
}

/**
 * Get or create client and navigate to URL
 */
async function getClientAndNavigate(data: Record<string, unknown>) {
  const clients = await self.clients.matchAll({ type: 'window' });

  // Determine URL based on notification data
  let url = '/';

  if (data.type === 'appointment') {
    url = `/agenda`;
  } else if (data.type === 'message') {
    url = `/mensagens`;
  } else if (data.type === 'exercise') {
    url = `/exercicios/${data.exerciseId}`;
  } else if (data.type === 'payment') {
    url = `/financeiro`;
  } else if (data.url) {
    url = data.url as string;
  }

  // Focus existing window or open new one
  if (clients.length > 0) {
    const client = clients[0];
    await client.focus();
    await client.navigate(url);
  } else {
    await self.clients.openWindow(url);
  }
}

// ============================================================================
// NOTIFICATION CLOSE EVENT
// ============================================================================

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');

  // Track dismissals for analytics
  const data = event.notification.data || {};

  // Send to analytics endpoint
  if (data.id) {
    fetch('/api/notifications/dismiss', {
      method: 'POST',
      body: JSON.stringify({ id: data.id }),
      headers: { 'Content-Type': 'application/json' },
    }).catch((err) => console.error('[SW] Failed to track dismissal:', err));
  }
});

// ============================================================================
// FETCH EVENT - Network First Strategy
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome extensions/devtools
  if (
    request.method !== 'GET' ||
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'devtools:'
  ) {
    return;
  }

  // API requests: Network Only (no caching)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch((err) => {
        console.error('[SW] API request failed:', err);
        // Return offline error response
        return new Response(
          JSON.stringify({ error: 'Network error', offline: true }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // Supabase requests: Network Only
  if (url.hostname.includes('supabase')) {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets: Cache First
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/images/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages: Network First, fall back to cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Other requests: Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

/**
 * Cache First strategy
 */
async function cacheFirst(request: Request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline page if available
    const offlineCache = await caches.open(OFFLINE_CACHE);
    const offlinePage = await offlineCache.match('/offline');
    return offlinePage || new Response('Offline', { status: 503 });
  }
}

/**
 * Network First strategy
 */
async function networkFirst(request: Request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page
    const offlineCache = await caches.open(OFFLINE_CACHE);
    const offlinePage = await offlineCache.match('/offline');
    return (
      offlinePage ||
      new Response('Offline - Sem conexão com a internet', { status: 503 })
    );
  }
}

/**
 * Stale While Revalidate strategy
 */
async function staleWhileRevalidate(request: Request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Fetch in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  // Return cached version immediately, or wait for fetch
  return cached || fetchPromise;
}

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotificationHistory());
  }
});

/**
 * Sync notification history with server
 */
async function syncNotificationHistory() {
  try {
    // Get offline notification history from IndexedDB
    // and send to server
    const response = await fetch('/api/notifications/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      console.log('[SW] Notification history synced');
    }
  } catch (error) {
    console.error('[SW] Failed to sync notifications:', error);
  }
}

// ============================================================================
// MESSAGE EVENT (Communication from app)
// ============================================================================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        return caches.delete(OFFLINE_CACHE);
      })
    );
  }
});

// ============================================================================
// PERIODIC SYNC
// ============================================================================

self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync event:', event.tag);

  if (event.tag === 'check-updates') {
    event.waitUntil(checkForUpdates());
  }
});

/**
 * Check for app updates
 */
async function checkForUpdates() {
  try {
    const response = await fetch('/api/health', {
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[SW] Health check:', data);
    }
  } catch (error) {
    console.error('[SW] Health check failed:', error);
  }
}

// ============================================================================
// PUSH SUBSCRIPTION CHANGE
// ============================================================================

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');

  event.waitUntil(
    (async () => {
      try {
        const newSubscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: self.getKey(),
        });

        // Send new subscription to server
        await fetch('/api/push/subscribe', {
          method: 'POST',
          body: JSON.stringify(newSubscription.toJSON()),
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('[SW] Failed to resubscribe:', error);
      }
    })()
  );
});

/**
 * Get VAPID public key (configure in environment)
 */
self.getKey = function() {
  // This should be replaced with actual VAPID key from environment
  // For now, return a placeholder
  return urlBase64ToUint8Array(
    process.env.VITE_VAPID_PUBLIC_KEY || ''
  );
};

/**
 * Convert base64 string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = self.atob(base64String);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service Worker loaded');
