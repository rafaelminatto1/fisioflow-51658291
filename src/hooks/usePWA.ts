import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallation {
  isInstallable: boolean;
  isInstalled: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  install: () => Promise<boolean>;
}

interface NotificationPermission {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (title: string, options?: NotificationOptions) => Promise<void>;
}

interface ServiceWorkerRegistration {
  isRegistered: boolean;
  registration: globalThis.ServiceWorkerRegistration | null;
  isOnline: boolean;
  syncData: () => Promise<void>;
}

interface PWACapabilities {
  installation: PWAInstallation;
  notifications: NotificationPermission;
  serviceWorker: ServiceWorkerRegistration;
  isStandalone: boolean;
  canShare: boolean;
  share: (data: ShareData) => Promise<void>;
}

export const usePWA = (): PWACapabilities => {
  // Installation state
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Notification state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'default'
  );

  // Service Worker state
  const [swRegistration, setSwRegistration] = useState<globalThis.ServiceWorkerRegistration | null>(null);
  const [isSwRegistered, setIsSwRegistered] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // PWA detection
  const [isStandalone, setIsStandalone] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(isStandaloneMode);
      setIsInstalled(isStandaloneMode);
    };

    // Check Web Share API support
    const checkShareSupport = () => {
      setCanShare('share' in navigator);
    };

    checkStandalone();
    checkShareSupport();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
      setIsInstalled(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleDisplayModeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      } else {
        mediaQuery.removeListener(handleDisplayModeChange);
      }
    };
  }, []);

  useEffect(() => {
    // Register service worker
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          setSwRegistration(registration);
          setIsSwRegistered(true);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  console.log('New version available! Please refresh.');
                }
              });
            }
          });

          console.log('Service Worker registered successfully');
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    };

    registerServiceWorker();
  }, []);

  useEffect(() => {
    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Handle app installed
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstallable(false);
      setIsInstalled(true);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Installation functions
  const install = async (): Promise<boolean> => {
    if (!installPrompt) {
      return false;
    }

    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
        setIsInstallable(false);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error during installation:', error);
      return false;
    }
  };

  // Notification functions
  const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  };

  const showNotification = async (title: string, options?: NotificationOptions): Promise<void> => {
    if (notificationPermission !== 'granted') {
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    if (swRegistration) {
      // Use service worker for better notification handling
      await swRegistration.showNotification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        ...options
      });
    } else {
      // Fallback to regular notification
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        ...options
      });
    }
  };

  // Service Worker functions
  const syncData = async (): Promise<void> => {
    if (swRegistration && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await swRegistration.sync.register('exercise-sync');
        console.log('Background sync registered');
      } catch (error) {
        console.error('Background sync registration failed:', error);
        // Fallback: sync immediately
        await syncExerciseDataNow();
      }
    } else {
      // Fallback for browsers without background sync
      await syncExerciseDataNow();
    }
  };

  const syncExerciseDataNow = async (): Promise<void> => {
    try {
      // Get pending data from localStorage as fallback
      const pendingData = localStorage.getItem('pendingExerciseData');
      if (pendingData) {
        const data = JSON.parse(pendingData);
        
        // Send to server
        await fetch('/api/exercises/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        
        // Clear pending data
        localStorage.removeItem('pendingExerciseData');
        
        console.log('Exercise data synced successfully');
      }
    } catch (error) {
      console.error('Error syncing exercise data:', error);
    }
  };

  // Share function
  const share = async (data: ShareData): Promise<void> => {
    if (!canShare) {
      throw new Error('Web Share API not supported');
    }

    try {
      await navigator.share({
        title: 'FisioFlow PWA',
        text: 'Confira meu progresso no FisioFlow!',
        url: window.location.href,
        ...data
      });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
        throw error;
      }
    }
  };

  // Schedule periodic notifications
  const schedulePeriodicNotifications = async (): Promise<void> => {
    if (swRegistration && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await (swRegistration as any).periodicSync.register('exercise-reminder', {
          minInterval: 24 * 60 * 60 * 1000 // 24 hours
        });
        console.log('Periodic sync registered for exercise reminders');
      } catch (error) {
        console.error('Periodic sync registration failed:', error);
      }
    }
  };

  // Initialize periodic notifications when permission is granted
  useEffect(() => {
    if (notificationPermission === 'granted' && swRegistration) {
      schedulePeriodicNotifications();
    }
  }, [notificationPermission, swRegistration]);

  return {
    installation: {
      isInstallable,
      isInstalled,
      installPrompt,
      install
    },
    notifications: {
      permission: notificationPermission,
      requestPermission: requestNotificationPermission,
      showNotification
    },
    serviceWorker: {
      isRegistered: isSwRegistered,
      registration: swRegistration,
      isOnline,
      syncData
    },
    isStandalone,
    canShare,
    share
  };
};

// Utility functions for offline storage
export const storeOfflineData = (key: string, data: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error storing offline data:', error);
  }
};

export const getOfflineData = (key: string): any => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const { data, timestamp } = JSON.parse(stored);
      // Return data if it's less than 24 hours old
      if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
        return data;
      }
      // Remove expired data
      localStorage.removeItem(key);
    }
    return null;
  } catch (error) {
    console.error('Error getting offline data:', error);
    return null;
  }
};

export const clearOfflineData = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing offline data:', error);
  }
};