import { PushNotifications, PushNotificationSchema, Token, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { getFirebaseDb, getFirebaseAuth } from '@/integrations/firebase/app';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Serviço para gerenciar Push Notifications no iOS
 */

export interface PushNotificationData {
  title: string;
  body: string;
  userId?: string;
  type: 'appointment' | 'message' | 'alert' | 'update';
  data?: Record<string, any>;
}

/**
 * Inicializa o sistema de push notifications
 * Deve ser chamado ao iniciar o app (apenas em nativo)
 */
export async function initPushNotifications(): Promise<void> {
  // Verificar se está em plataforma nativa
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications não disponíveis na web');
    return;
  }

  try {
    // Solicitar permissão
    const result = await PushNotifications.requestPermissions();

    if (result.receive === 'granted') {
      await PushNotifications.register();
      console.log('Push notifications registradas com sucesso');
    } else {
      console.warn('Permissão de notificação negada pelo usuário');
      return;
    }

    // Listener: Registro bem-sucedido
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push token registrado:', token.value);
      await savePushTokenToDatabase(token.value);
    });

    // Listener: Erro no registro
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Erro no registro de push notification:', error);
    });

    // Listener: Notificação recebida (app em foreground)
    await PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotificationSchema) => {
      console.log('Notificação recebida (app aberto):', notification);

      // Mostrar notificação local também
      await showLocalNotification({
        title: notification.data?.title || 'FisioFlow',
        body: notification.data?.body || '',
        id: Date.now(),
      });
    });

    // Listener: Notificação clicada (app aberto pela notificação)
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Notificação clicada:', notification);
      handleNotificationAction(notification);
    });
  } catch (error) {
    console.error('Erro ao inicializar push notifications:', error);
  }
}

/**
 * Salva o token de push no Supabase
 */
/**
 * Salva o token de push no Firebase Firestore
 */
async function savePushTokenToDatabase(token: string): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;

    if (currentUser) {
      const db = getFirebaseDb();
      // Use device ID or platform as key if possible, but for now we settle for user_id + token
      // Better schema: user_push_tokens/{userId}/devices/{deviceId}
      // Or simply a collection of tokens with user_id field.
      // Let's us a subcollection for the user to make it easier to manage per user.
      // users/{userId}/push_tokens/{token}

      const tokenRef = doc(db, 'users', currentUser.uid, 'push_tokens', token);

      await setDoc(tokenRef, {
        token: token,
        platform: Capacitor.getPlatform(),
        updated_at: new Date().toISOString(),
        last_used: new Date().toISOString()
      }, { merge: true });

      console.log('Token salvo no Firestore');
    } else {
      console.log('Usuário não autenticado, token não salvo');
    }
  } catch (error) {
    console.error('Erro ao salvar token:', error);
  }
}

/**
 * Mostra notificação local (quando app está aberto)
 */
async function showLocalNotification(notification: {
  title: string;
  body: string;
  id: number;
}): Promise<void> {
  await LocalNotifications.schedule({
    notifications: [
      {
        title: notification.title,
        body: notification.body,
        id: notification.id,
        schedule: { at: new Date() },
        sound: 'default',
        smallIcon: 'ic_stat_icon_config_sample',
        iconColor: '#0EA5E9',
      },
    ],
  });
}

/**
 * Manipula clique na notificação
 */
function handleNotificationAction(notification: ActionPerformed): void {
  const type = notification.notification.data?.type;

  // TODO: Implementar navegação baseada no tipo
  switch (type) {
    case 'appointment':
      console.log('Navegar para detalhes da consulta');
      break;
    case 'message':
      console.log('Navegar para chat');
      break;
    case 'alert':
      console.log('Navegar para alerta');
      break;
    default:
      console.log('Navegar para dashboard');
  }
}

/**
 * Envia notificação local (para testes ou lembretes no app)
 */
export async function sendLocalNotification(options: {
  title: string;
  body: string;
  id?: number;
  schedule?: Date;
}): Promise<void> {
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: options.title,
          body: options.body,
          id: options.id || Date.now(),
          schedule: options.schedule ? { at: options.schedule } : { at: new Date() },
          sound: 'default',
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#0EA5E9',
        },
      ],
    });
  } catch (error) {
    console.error('Erro ao enviar notificação local:', error);
  }
}

/**
 * Cancela todas as notificações
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    // cancel() requires options with notifications array, but to clear all we might need to get pending first.
    // For now assuming we want to cancel all pending.
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch (error) {
    console.error('Erro ao limpar notificações:', error);
  }
}

/**
 * Cancela notificações específicas por ID
 */
export async function cancelNotification(ids: number[]): Promise<void> {
  try {
    await LocalNotifications.cancel({
      notifications: ids.map(id => ({ id })),
    });
  } catch (error) {
    console.error('Erro ao cancelar notificações:', error);
  }
}

/**
 * Obtém lista de notificações agendadas
 */
export async function getScheduledNotifications(): Promise<any[]> {
  try {
    const pending = await LocalNotifications.getPending();
    return pending.notifications || [];
  } catch (error) {
    console.error('Erro ao obter notificações agendadas:', error);
    return [];
  }
}
