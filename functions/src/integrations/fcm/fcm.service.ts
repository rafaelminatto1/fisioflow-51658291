import * as admin from 'firebase-admin';

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export class FCMService {
  private messaging = admin.messaging();

  async sendToUser(userId: string, notification: NotificationData) {
    try {
      // Fetch user's push tokens from profiles or a dedicated tokens collection
      const userDoc = await admin.firestore().collection('profiles').doc(userId).get();
      const userData = userDoc.data();
      const tokens: string[] = userData?.pushTokens || [];

      if (tokens.length === 0) {
        console.log(`No push tokens found for user ${userId}`);
        return { success: false, reason: 'no_tokens' };
      }

      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: notification.title,
          body: notification.body,
          imageUrl: notification.imageUrl,
        },
        data: notification.data,
        tokens,
      };

      const response = await this.messaging.sendEachForMulticast(message);
      
      // Cleanup invalid tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/registration-token-not-registered') {
              failedTokens.push(tokens[idx]);
            }
          }
        });

        if (failedTokens.length > 0) {
          await admin.firestore().collection('profiles').doc(userId).update({
            pushTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
          });
        }
      }

      return { 
        success: true, 
        successCount: response.successCount, 
        failureCount: response.failureCount 
      };
    } catch (error) {
      console.error('Error sending FCM message:', error);
      return { success: false, error };
    }
  }
}
