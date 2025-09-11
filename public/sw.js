const CACHE_NAME = 'fisioflow-pwa-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'exercise-sync') {
    event.waitUntil(syncExerciseData());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do FisioFlow!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalhes',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icons/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('FisioFlow PWA', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Sync exercise data when back online
async function syncExerciseData() {
  try {
    // Get pending exercise data from IndexedDB
    const pendingData = await getPendingExerciseData();
    
    if (pendingData.length > 0) {
      // Send data to server
      for (const data of pendingData) {
        await fetch('/api/exercises/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
      }
      
      // Clear pending data after successful sync
      await clearPendingExerciseData();
      
      // Show success notification
      self.registration.showNotification('Dados sincronizados!', {
        body: 'Seus exercícios foram sincronizados com sucesso.',
        icon: '/icons/icon-192x192.png'
      });
    }
  } catch (error) {
    console.error('Error syncing exercise data:', error);
  }
}

// IndexedDB helpers for offline storage
async function getPendingExerciseData() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FisioFlowDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingExercises'], 'readonly');
      const store = transaction.objectStore('pendingExercises');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingExercises')) {
        db.createObjectStore('pendingExercises', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function clearPendingExerciseData() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FisioFlowDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingExercises'], 'readwrite');
      const store = transaction.objectStore('pendingExercises');
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    };
  });
}

// Periodic background sync for reminders
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'exercise-reminder') {
    event.waitUntil(sendExerciseReminder());
  }
});

async function sendExerciseReminder() {
  const now = new Date();
  const hour = now.getHours();
  
  // Send reminder between 9 AM and 6 PM
  if (hour >= 9 && hour <= 18) {
    self.registration.showNotification('Hora do exercício! 💪', {
      body: 'Que tal fazer alguns exercícios agora? Mantenha sua sequência!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'exercise-reminder',
      requireInteraction: true,
      actions: [
        {
          action: 'start-exercise',
          title: 'Iniciar agora',
          icon: '/icons/play.png'
        },
        {
          action: 'remind-later',
          title: 'Lembrar mais tarde',
          icon: '/icons/clock.png'
        }
      ]
    });
  }
}