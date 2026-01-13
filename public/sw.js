const CACHE_NAME = 'fisioflow-pwa-v3';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Notification queue for offline scenarios
let notificationQueue = [];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ])
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

// Enhanced push notification handler
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'FisioFlow',
    body: 'Nova notificação!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {}
  };

  // Parse notification data
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        image: payload.image,
        tag: payload.tag,
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        vibrate: payload.vibrate || [100, 50, 100],
        data: {
          ...payload.data,
          notificationId: payload.notificationId,
          type: payload.type,
          timestamp: Date.now(),
          url: payload.url
        },
        actions: payload.actions || []
      };
    } catch (error) {
      console.error('Error parsing push notification data:', error);
    }
  }

  // Show notification
  event.waitUntil(
    Promise.all([
      // Display notification
      self.registration.showNotification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        image: notificationData.image,
        tag: notificationData.tag,
        requireInteraction: notificationData.requireInteraction,
        silent: notificationData.silent,
        vibrate: notificationData.vibrate,
        data: notificationData.data,
        actions: notificationData.actions
      }),
      // Log delivery status
      logNotificationDelivery(notificationData.data.notificationId, 'delivered')
    ])
  );
});

// Enhanced notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // Close notification
  notification.close();

  // Log click event
  if (data.notificationId) {
    logNotificationDelivery(data.notificationId, 'clicked');
  }

  // Handle different actions
  event.waitUntil(
    handleNotificationAction(action, data)
  );
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  const data = event.notification.data || {};
  
  // Log close event if needed
  if (data.notificationId) {
    // Could log dismissal analytics here
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
// Enh
anced background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'exercise-sync') {
    event.waitUntil(syncExerciseData());
  } else if (event.tag === 'notification-sync') {
    event.waitUntil(syncPendingNotifications());
  } else if (event.tag === 'notification-status-sync') {
    event.waitUntil(syncNotificationStatus());
  }
});

// Handle notification actions
async function handleNotificationAction(action, data) {
  const clients = await self.clients.matchAll({ type: 'window' });
  
  // Default URL to open
  let urlToOpen = data.url || '/';
  
  // Handle specific actions
  switch (action) {
    case 'confirm':
      urlToOpen = `/schedule?action=confirm&id=${data.appointmentId || ''}`;
      // Also send confirmation directly to API
      await handleAppointmentConfirmation(data.appointmentId, true);
      break;
    case 'reschedule':
      urlToOpen = `/schedule?action=reschedule&id=${data.appointmentId || ''}`;
      break;
    case 'start':
      urlToOpen = `/exercises?action=start&id=${data.exerciseId || ''}`;
      break;
    case 'view':
      urlToOpen = data.url || '/';
      break;
    case 'reply':
      urlToOpen = `/communications?action=reply&id=${data.messageId || ''}`;
      break;
    case 'pay':
      urlToOpen = `/financial?action=pay&id=${data.paymentId || ''}`;
      break;
    case 'later':
      // For exercise reminders - just dismiss and don't open app
      return;
    case 'dismiss':
      // Just dismiss notification without opening app
      return;
    default:
      // Default click action
      if (data.type) {
        switch (data.type) {
          case 'appointment_reminder':
          case 'appointment_change':
            urlToOpen = '/schedule';
            break;
          case 'exercise_reminder':
          case 'exercise_milestone':
            urlToOpen = '/exercises';
            break;
          case 'progress_update':
            urlToOpen = '/patients';
            break;
          case 'therapist_message':
            urlToOpen = '/communications';
            break;
          case 'payment_reminder':
            urlToOpen = '/financial';
            break;
          default:
            urlToOpen = '/';
        }
      }
  }

  // Try to focus existing window or open new one
  if (clients.length > 0) {
    // Focus existing window and navigate
    const client = clients[0];
    await client.focus();
    client.postMessage({
      type: 'NOTIFICATION_CLICKED',
      action,
      data,
      url: urlToOpen
    });
  } else {
    // Open new window
    await self.clients.openWindow(urlToOpen);
  }
}

// Log notification delivery status
async function logNotificationDelivery(notificationId, status) {
  if (!notificationId) return;
  
  try {
    // Store status update for later sync if offline
    const statusUpdate = {
      notificationId,
      status,
      timestamp: Date.now()
    };
    
    // Try to send immediately
    const response = await fetch('/api/notifications/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(statusUpdate)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update notification status');
    }
  } catch (error) {
    console.log('Failed to update notification status, queuing for sync:', error);
    // Queue for background sync
    await queueNotificationStatusUpdate(notificationId, status);
  }
}

// Queue notification status update for background sync
async function queueNotificationStatusUpdate(notificationId, status) {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction(['statusUpdates'], 'readwrite');
    const store = transaction.objectStore('statusUpdates');
    
    await store.add({
      notificationId,
      status,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to queue notification status update:', error);
  }
}

// Sync pending notification status updates
async function syncNotificationStatus() {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction(['statusUpdates'], 'readwrite');
    const store = transaction.objectStore('statusUpdates');
    const updates = await store.getAll();
    
    for (const update of updates) {
      try {
        const response = await fetch('/api/notifications/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(update)
        });
        
        if (response.ok) {
          await store.delete(update.id);
        }
      } catch (error) {
        console.error('Failed to sync notification status:', error);
      }
    }
  } catch (error) {
    console.error('Failed to sync notification status updates:', error);
  }
}

// Sync pending notifications when back online
async function syncPendingNotifications() {
  try {
    const db = await openNotificationDB();
    const transaction = db.transaction(['pendingNotifications'], 'readwrite');
    const store = transaction.objectStore('pendingNotifications');
    const notifications = await store.getAll();
    
    for (const notification of notifications) {
      try {
        // Show queued notification
        await self.registration.showNotification(notification.title, notification.options);
        
        // Remove from queue
        await store.delete(notification.id);
      } catch (error) {
        console.error('Failed to show queued notification:', error);
      }
    }
  } catch (error) {
    console.error('Failed to sync pending notifications:', error);
  }
}

// Open IndexedDB for notification storage
async function openNotificationDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FisioFlowNotifications', 2);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores
      if (!db.objectStoreNames.contains('pendingNotifications')) {
        const notificationStore = db.createObjectStore('pendingNotifications', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        notificationStore.createIndex('timestamp', 'timestamp');
      }
      
      if (!db.objectStoreNames.contains('statusUpdates')) {
        const statusStore = db.createObjectStore('statusUpdates', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        statusStore.createIndex('timestamp', 'timestamp');
      }
      
      if (!db.objectStoreNames.contains('pendingExercises')) {
        db.createObjectStore('pendingExercises', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
      }
    };
  });
}// Handle
 appointment confirmation directly from service worker
async function handleAppointmentConfirmation(appointmentId, confirmed) {
  if (!appointmentId) return;
  
  try {
    const response = await fetch('/api/appointments/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        appointmentId,
        confirmed
      })
    });
    
    if (response.ok) {
      // Show success notification
      self.registration.showNotification('Consulta Confirmada! ✅', {
        body: 'Sua consulta foi confirmada com sucesso.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'appointment-confirmed',
        requireInteraction: false,
        silent: true
      });
    }
  } catch (error) {
    console.error('Failed to confirm appointment from service worker:', error);
  }
}

// Enhanced notification display with better appointment handling
async function showAppointmentNotification(data) {
  const { type, title, body, appointmentId, appointment_date, appointment_time } = data;
  
  let actions = [];
  let requireInteraction = false;
  
  if (type === 'appointment_reminder') {
    actions = [
      {
        action: 'confirm',
        title: 'Confirmar',
        icon: '/icons/check.png'
      },
      {
        action: 'reschedule',
        title: 'Reagendar',
        icon: '/icons/calendar.png'
      }
    ];
    requireInteraction = true;
  } else if (type === 'appointment_change') {
    actions = [
      {
        action: 'view',
        title: 'Ver Detalhes',
        icon: '/icons/eye.png'
      }
    ];
  }
  
  return self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: `appointment-${appointmentId}`,
    requireInteraction,
    vibrate: [200, 100, 200],
    data: {
      type,
      appointmentId,
      appointment_date,
      appointment_time,
      timestamp: Date.now()
    },
    actions
  });
}