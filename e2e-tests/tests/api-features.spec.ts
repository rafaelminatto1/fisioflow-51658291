/**
 * E2E Tests for FisioFlow API Features
 * Tests: Push Notifications, AI Suggestions, Data Export
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'https://fisioflow-api.rafalegollas.workers.dev';

test.describe('FisioFlow API Health', () => {
  test('health check should return ok', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('fisioflow-api');
  });
});

test.describe('Push Notifications API', () => {
  test('should require authentication for notifications', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/notifications`);
    expect(response.status()).toBe(401);
  });

  test('should require authentication for sending push', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/notifications/send`, {
      data: {
        userId: 'test-user',
        notification: {
          title: 'Test',
          body: 'Test notification'
        }
      }
    });
    expect(response.status()).toBe(401);
  });

  test('should require authentication for batch push', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/notifications/send-batch`, {
      data: {
        userIds: ['user1', 'user2'],
        notification: {
          title: 'Test',
          body: 'Batch notification'
        }
      }
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('AI Suggestions API', () => {
  test('should require authentication for AI suggestions', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/ai/exercise-suggestions`, {
      data: {
        patientId: 'test-patient',
        conditions: [],
        recentEvolutions: [],
        painLevel: 5
      }
    });
    expect(response.status()).toBe(401);
  });

  test('should require authentication for patient insights', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/ai/patient-insights/test-patient`);
    expect(response.status()).toBe(401);
  });
});

test.describe('Data Export API', () => {
  test('should require authentication for export', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/export`, {
      data: {
        userId: 'test-user',
        format: 'json',
        types: ['appointments']
      }
    });
    expect(response.status()).toBe(401);
  });

  test('should require authentication for export status', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/export/test-export-id`);
    expect(response.status()).toBe(401);
  });

  test('should require authentication for patient export', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/export/patients`, {
      data: {
        format: 'json',
        includeEvolutions: true,
        includeAppointments: true
      }
    });
    expect(response.status()).toBe(401);
  });

  test('should require authentication for evolution export', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/export/evolutions`, {
      data: {
        format: 'json'
      }
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('Financial Metrics API', () => {
  test('should require authentication for financial metrics', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/financial-metrics`);
    expect(response.status()).toBe(401);
  });
});

test.describe('User Profile API', () => {
  test('should require authentication for user profile', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/users/test-user-id`);
    expect(response.status()).toBe(401);
  });

  test('should require authentication for user update', async ({ request }) => {
    const response = await request.put(`${API_URL}/api/users/test-user-id`, {
      data: {
        name: 'Test User'
      }
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('Notification Settings API', () => {
  test('should require authentication for settings', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/settings/notifications/test-user-id`);
    expect(response.status()).toBe(401);
  });

  test('should require authentication for settings update', async ({ request }) => {
    const response = await request.put(`${API_URL}/api/settings/notifications/test-user-id`, {
      data: {
        appointments: { enabled: true }
      }
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('Push Tokens API', () => {
  test('should require authentication for token registration', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/push-tokens`, {
      data: {
        expo_push_token: 'ExponentPushToken[test-token]',
        device_name: 'Test Device',
        device_type: 'ios'
      }
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('Auth API', () => {
  test('should require authentication for password change', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/auth/change-password`, {
      data: {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123'
      }
    });
    expect(response.status()).toBe(401);
  });
});