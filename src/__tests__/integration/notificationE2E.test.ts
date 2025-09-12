import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { NotificationManager } from '@/lib/services/NotificationManager';
import { NotificationSecurityService } from '@/lib/services/NotificationSecurityService';
import { notificationPerformanceService } from '@/lib/services/NotificationPerformanceService';

// Mock service worker registration
global.navigator = {
  ...global.navigator,
  serviceWorker: {
    register: vi.fn().mockResolvedValue({
      pushManager: {
        subscribe: vi.fn().mockResolvedValue({
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
          keys: {
            p256dh: 'test-p256dh-key',
            auth: 'test-auth-key'
          }
        }),
        getSubscription: vi.fn().mockResolvedValue(null)
      }
    }),
    ready: Promise.resolve({
      pushManager: {
        subscribe: vi.fn(),
        getSubscription: vi.fn()
      }
    })
  }
} as any;

// Mock Notification API
global.Notification = {
  permission: 'default',
  requestPermission: vi.fn().mockResolvedValue('granted')
} as any;

describe('Notification System E2E Tests', () => {
  let testUserId: string;
  let notificationManager: NotificationManager;

  beforeAll(async () => {
    // Create a test user
    const { data: { user }, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpassword123'
    });

    if (error && error.message !== 'User already registered') {
      throw error;
    }

    testUserId = user?.id || 'test-user-id';
    notificationManager = NotificationManager.getInstance();
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await supabase.from('notification_history').delete().eq('user_id', testUserId);
      await supabase.from('push_subscriptions').delete().eq('user_id', testUserId);
      await supabase.from('notification_preferences').delete().eq('user_id', testUserId);
      await supabase.from('notification_consent').delete().eq('user_id', testUserId);
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  beforeEach(async () => {
    // Reset notification permission
    global.Notification.permission = 'default';
  });

  describe('Permission Flow', () => {
    it('should handle permission request flow', async () => {
      // Mock permission granted
      global.Notification.requestPermission = vi.fn().mockResolvedValue('granted');

      const hasPermission = await notificationManager.requestPermission();
      
      expect(hasPermission).toBe(true);
      expect(global.Notification.requestPermission).toHaveBeenCalled();
    });

    it('should handle permission denied', async () => {
      global.Notification.requestPermission = vi.fn().mockResolvedValue('denied');

      const hasPermission = await notificationManager.requestPermission();
      
      expect(hasPermission).toBe(false);
    });

    it('should handle permission already granted', async () => {
      global.Notification.permission = 'granted';

      const hasPermission = await notificationManager.requestPermission();
      
      expect(hasPermission).toBe(true);
    });
  });

  describe('Subscription Management', () => {
    it('should register push subscription', async () => {
      global.Notification.permission = 'granted';

      const subscription = await notificationManager.subscribeToPush();
      
      expect(subscription).toBeDefined();
      expect(subscription?.endpoint).toContain('fcm.googleapis.com');
    });

    it('should handle subscription failure gracefully', async () => {
      global.navigator.serviceWorker.ready = Promise.reject(new Error('Service worker not available'));

      const subscription = await notificationManager.subscribeToPush();
      
      expect(subscription).toBeNull();
    });

    it('should unsubscribe from push notifications', async () => {
      // First subscribe
      global.Notification.permission = 'granted';
      await notificationManager.subscribeToPush();

      // Then unsubscribe
      const success = await notificationManager.unsubscribeFromPush();
      
      expect(success).toBe(true);
    });
  });

  describe('Preferences Management', () => {
    it('should save and retrieve notification preferences', async () => {
      const preferences = {
        appointmentReminders: true,
        exerciseReminders: false,
        therapistAlerts: true,
        marketingNotifications: false,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00'
      };

      await notificationManager.updatePreferences(preferences);
      const savedPreferences = await notificationManager.getPreferences();

      expect(savedPreferences).toMatchObject(preferences);
    });

    it('should respect quiet hours in preferences', async () => {
      const preferences = {
        appointmentReminders: true,
        exerciseReminders: true,
        therapistAlerts: true,
        marketingNotifications: false,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00'
      };

      await notificationManager.updatePreferences(preferences);

      // Test during quiet hours (23:00)
      const quietTime = new Date();
      quietTime.setHours(23, 0, 0, 0);

      const shouldSend = await notificationManager.shouldSendNotification(
        testUserId,
        'appointment_reminder',
        quietTime
      );

      expect(shouldSend).toBe(false);
    });

    it('should allow notifications outside quiet hours', async () => {
      const preferences = {
        appointmentReminders: true,
        exerciseReminders: true,
        therapistAlerts: true,
        marketingNotifications: false,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00'
      };

      await notificationManager.updatePreferences(preferences);

      // Test outside quiet hours (10:00)
      const activeTime = new Date();
      activeTime.setHours(10, 0, 0, 0);

      const shouldSend = await notificationManager.shouldSendNotification(
        testUserId,
        'appointment_reminder',
        activeTime
      );

      expect(shouldSend).toBe(true);
    });
  });

  describe('Notification Sending', () => {
    it('should send appointment reminder notification', async () => {
      const notificationData = {
        type: 'appointment_reminder' as const,
        title: 'Lembrete de Consulta',
        body: 'Você tem uma consulta em 2 horas',
        data: {
          appointmentId: 'test-appointment-id',
          patientName: 'João Silva',
          appointmentTime: '2024-01-15T14:00:00Z'
        }
      };

      // Mock the edge function call
      const mockInvoke = vi.fn().mockResolvedValue({ data: { success: true }, error: null });
      supabase.functions.invoke = mockInvoke;

      const result = await notificationManager.sendNotification(testUserId, notificationData);

      expect(result.success).toBe(true);
      expect(mockInvoke).toHaveBeenCalledWith('send-notification', {
        body: {
          userId: testUserId,
          notification: notificationData
        }
      });
    });

    it('should handle notification sending failure', async () => {
      const notificationData = {
        type: 'appointment_reminder' as const,
        title: 'Test Notification',
        body: 'Test body',
        data: {}
      };

      // Mock edge function failure
      const mockInvoke = vi.fn().mockResolvedValue({ 
        data: null, 
        error: new Error('Function execution failed') 
      });
      supabase.functions.invoke = mockInvoke;

      const result = await notificationManager.sendNotification(testUserId, notificationData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should batch multiple notifications efficiently', async () => {
      const notifications = Array.from({ length: 10 }, (_, i) => ({
        type: 'exercise_reminder' as const,
        title: `Exercise Reminder ${i + 1}`,
        body: `Time for your exercise session ${i + 1}`,
        data: { exerciseId: `exercise-${i + 1}` }
      }));

      const batchId = await notificationPerformanceService.addToBatch(
        notifications.map(n => ({ userId: testUserId, notification: n })),
        'normal'
      );

      expect(batchId).toBeDefined();
      expect(batchId).toMatch(/^batch_\d+_[a-z0-9]+$/);
    });
  });

  describe('Security and Compliance', () => {
    it('should record user consent properly', async () => {
      const consentData = {
        pushNotifications: true,
        dataProcessing: true,
        analytics: false,
        marketing: false,
        timestamp: new Date().toISOString(),
        ipAddress: '127.0.0.1',
        userAgent: 'Test User Agent'
      };

      await NotificationSecurityService.recordConsent(consentData);

      // Verify consent was recorded
      const { data, error } = await supabase
        .from('notification_consent')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data?.notifications_enabled).toBe(true);
      expect(data?.data_processing_consent).toBe(true);
      expect(data?.analytics_consent).toBe(false);
      expect(data?.marketing_consent).toBe(false);
    });

    it('should validate notification content for compliance', async () => {
      const securityService = new NotificationSecurityService();

      // Test with sensitive information
      const sensitivePayload = {
        type: 'appointment_reminder' as const,
        title: 'Appointment for 123.456.789-00',
        body: 'Your appointment is confirmed',
        data: {}
      };

      const validation = securityService.validateNotificationContent(sensitivePayload);

      expect(validation.isValid).toBe(false);
      expect(validation.violations).toContain('Contains sensitive information in title/body');
    });

    it('should encrypt sensitive notification data', async () => {
      const securityService = new NotificationSecurityService();

      const sensitivePayload = {
        type: 'therapist_message' as const,
        title: 'Message from therapist',
        body: 'You have a new message',
        data: {
          patientName: 'João Silva',
          therapistName: 'Dr. Maria Santos',
          message: 'Please remember to do your exercises'
        }
      };

      const encryptedPayload = await securityService.encryptNotificationData(sensitivePayload);

      expect(encryptedPayload.data._encrypted).toBe(true);
      expect(encryptedPayload.data.patientName).not.toBe('João Silva');
    });
  });

  describe('Performance Monitoring', () => {
    it('should collect performance metrics', async () => {
      const metrics = await notificationPerformanceService.getCurrentMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.deliveryRate).toBe('number');
      expect(typeof metrics.averageDeliveryTime).toBe('number');
      expect(typeof metrics.clickThroughRate).toBe('number');
      expect(typeof metrics.errorRate).toBe('number');
    });

    it('should provide system health status', async () => {
      const health = await notificationPerformanceService.getSystemHealth();

      expect(health).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(Array.isArray(health.issues)).toBe(true);
      expect(health.metrics).toBeDefined();
    });

    it('should calculate optimal send time for user', async () => {
      const optimalTime = await notificationPerformanceService.getOptimalSendTime(testUserId);

      expect(optimalTime).toBeInstanceOf(Date);
      expect(optimalTime.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network failures gracefully', async () => {
      // Mock network failure
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const notificationData = {
        type: 'appointment_reminder' as const,
        title: 'Test Notification',
        body: 'Test body',
        data: {}
      };

      const result = await notificationManager.sendNotification(testUserId, notificationData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should retry failed notifications', async () => {
      let callCount = 0;
      const mockInvoke = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({ data: null, error: new Error('Temporary failure') });
        }
        return Promise.resolve({ data: { success: true }, error: null });
      });

      supabase.functions.invoke = mockInvoke;

      const notificationData = {
        type: 'appointment_reminder' as const,
        title: 'Test Notification',
        body: 'Test body',
        data: {}
      };

      const result = await notificationManager.sendNotificationWithRetry(
        testUserId, 
        notificationData, 
        { maxRetries: 3, retryDelay: 100 }
      );

      expect(result.success).toBe(true);
      expect(callCount).toBe(3);
    });

    it('should handle service worker unavailability', async () => {
      // Mock service worker unavailable
      const originalServiceWorker = global.navigator.serviceWorker;
      delete (global.navigator as any).serviceWorker;

      const subscription = await notificationManager.subscribeToPush();

      expect(subscription).toBeNull();

      // Restore service worker
      global.navigator.serviceWorker = originalServiceWorker;
    });
  });

  describe('Real-time Synchronization', () => {
    it('should handle real-time preference updates', async () => {
      let receivedUpdate = false;
      const unsubscribe = notificationManager.subscribeToPreferenceChanges((preferences) => {
        receivedUpdate = true;
        expect(preferences.appointmentReminders).toBe(false);
      });

      // Simulate preference update from another client
      await supabase
        .from('notification_preferences')
        .upsert({
          user_id: testUserId,
          appointment_reminders: false,
          exercise_reminders: true,
          therapist_alerts: true,
          marketing_notifications: false,
          updated_at: new Date().toISOString()
        });

      // Wait for real-time update
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(receivedUpdate).toBe(true);
      unsubscribe();
    });
  });

  describe('Data Export and Deletion', () => {
    it('should export user notification data', async () => {
      const securityService = new NotificationSecurityService();
      
      const exportedData = await securityService.exportUserNotificationData(testUserId);

      expect(exportedData).toBeDefined();
      expect(Array.isArray(exportedData.subscriptions)).toBe(true);
      expect(Array.isArray(exportedData.preferences)).toBe(true);
      expect(Array.isArray(exportedData.history)).toBe(true);
      expect(Array.isArray(exportedData.consent)).toBe(true);
    });

    it('should delete all user notification data', async () => {
      const securityService = new NotificationSecurityService();
      
      // First create some test data
      await notificationManager.updatePreferences({
        appointmentReminders: true,
        exerciseReminders: true,
        therapistAlerts: true,
        marketingNotifications: false,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00'
      });

      // Then delete all data
      await securityService.deleteUserNotificationData(testUserId);

      // Verify data was deleted
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', testUserId);

      expect(preferences).toHaveLength(0);
    });
  });
});