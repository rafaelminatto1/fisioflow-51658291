import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { getAdminDb } from '../../init';

const expo = new Expo();

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default' | 'none';
}

export interface PushSendResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
  errors: string[];
}

const normalizeTokens = (value: any): string[] => {
  if (!value) return [];
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry : entry?.token))
      .filter((token): token is string => typeof token === 'string');
  }

  if (value.token && typeof value.token === 'string') {
    return [value.token];
  }

  return [];
};

async function collectPushTokens(userId: string): Promise<string[]> {
  try {
    const db = getAdminDb();
    const [userSnap, profileSnap] = await Promise.all([
      db.collection('users').doc(userId).get(),
      db.collection('profiles').doc(userId).get(),
    ]);

    const tokens = new Set<string>();

    [userSnap, profileSnap].forEach((snap) => {
      if (!snap.exists) return;
      const data = snap.data();
      const pushTokens = normalizeTokens(data?.pushTokens);
      pushTokens.forEach((token) => {
        if (token) tokens.add(token);
      });
    });

    return Array.from(tokens);
  } catch (error) {
    console.error('[PushNotifications] Failed to collect tokens', error);
    return [];
  }
}

export async function sendPushNotificationToUser(
  userId: string,
  payload: PushPayload
): Promise<PushSendResult> {
  const tokens = await collectPushTokens(userId);
  const messages: ExpoPushMessage[] = tokens
    .filter((token) => Expo.isExpoPushToken(token))
    .map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: payload.sound ?? 'default',
    }));

  const invalidTokens = tokens.filter((token) => !Expo.isExpoPushToken(token));
  const result: PushSendResult = {
    successCount: 0,
    failureCount: 0,
    invalidTokens,
    errors: [],
  };

  if (messages.length === 0) {
    return result;
  }

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, index) => {
        if (ticket.status === 'ok') {
          result.successCount += 1;
        } else {
          result.failureCount += 1;
          const errorMessage = ticket.details?.error ? ticket.details.error : 'unknown';
          result.errors.push(errorMessage);
          const token = (chunk[index] as ExpoPushMessage).to;
          if (typeof token === 'string') {
            result.invalidTokens.push(token);
          }
        }
      });
    } catch (error) {
      console.error('[PushNotifications] Chunk failed', error);
      result.failureCount += chunk.length;
      result.errors.push((error as Error).message);
    }
  }

  return result;
}
