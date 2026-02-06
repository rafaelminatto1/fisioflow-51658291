// Test script for notifications

import { registerForPushNotificationsAsync, sendTestNotification } from './lib/notifications.js';

async function testNotifications() {
  console.log('🔔 Testing notifications...');

  try {
    // Test 1: Register for notifications
    console.log('\n1. Testing push notification registration...');
    const token = await registerForPushNotificationsAsync();
    if (token) {
      console.log('✅ Push notification token received:', token);
    } else {
      console.log('❌ Failed to get push notification token');
    }

    // Test 2: Send test notification
    console.log('\n2. Testing local notification...');
    await sendTestNotification();
    console.log('✅ Test notification sent successfully!');

    // Test 3: Check notification permissions
    console.log('\n3. Checking notification permissions...');
    const hasPermission = await getNotificationPermissionStatus();
    console.log(hasPermission ? '✅ Notifications are allowed' : '❌ Notifications are blocked');

  } catch (error) {
    console.error('❌ Error testing notifications:', error);
  }
}

// Note: This is a mock test file. In a real Expo app, you would test this in the app itself.
console.log('📱 Notification Test Script');
console.log('==============================');
console.log('This script shows how notifications would be tested in the app.');
console.log('To test in the actual app:');
console.log('1. Run: npx expo start');
console.log('2. Open the app in your phone/emulator');
console.log('3. Look for the notification initialization in the logs');
console.log('4. Call sendTestNotification() from the app code');