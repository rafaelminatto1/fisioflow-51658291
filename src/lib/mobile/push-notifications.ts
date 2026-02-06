import { PushNotifications, PushNotificationSchema, Token, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { db, getFirebaseAuth, doc, setDoc } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';

/**
 * Serviço para gerenciar Push Notifications no iOS
 */

export interface PushNotificationData {
  title: string;
  body: string;
  userId?: string;
  type: 'appointment' | 'message' | 'alert' | 'update';
  data?: Record<string, unknown>;
}

/**
 * Inicializa o sistema de push notifications
 * Deve ser chamado ao iniciar o app (apenas em nativo)
 */
export async function initPushNotifications(): Promise<void> {
  // Verificar se está em plataforma nativa
  if (!Capacitor.isNativePlatform()) {
    logger.info('Push notifications não disponíveis na web', undefined, 'push-notifications');
    return;
  }

  try {
    // Solicitar permissão
    const result = await PushNotifications.requestPermissions();

    if (result.receive === 'granted') {
      await PushNotifications.register();
      logger.info('Push notifications registradas com sucesso', undefined, 'push-notifications');
    } else {
      logger.warn('Permissão de notificação negada pelo usuário', undefined, 'push-notifications');
      return;
    }

    // Listener: Registro bem-sucedido
    await PushNotifications.addListener('registration', async (token: Token) => {
      // Dado sensível removido: apenas primeiros 8 caracteres do token para debug (segurança)
      const maskedToken = token.value.substring(0, 8) + '...';
      logger.info('Push token registrado', { token: maskedToken }, 'push-notifications');
      await savePushTokenToDatabase(token.value);
    });

    // Listener: Erro no registro
    await PushNotifications.addListener('registrationError', (error: unknown) => {
      logger.error('Erro no registro de push notification', error, 'push-notifications');
    });

    // Listener: Notificação recebida (app em foreground)
    await PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotificationSchema) => {
      logger.info('Notificação recebida (app aberto)', { notification }, 'push-notifications');

      // Mostrar notificação local também
      await showLocalNotification({
        title: notification.data?.title || 'FisioFlow',
        body: notification.data?.body || '',
        id: Date.now(),
      });
    });

    // Listener: Notificação clicada (app aberto pela notificação)
    await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      logger.info('Notificação clicada', { notification }, 'push-notifications');
      handleNotificationAction(notification);
    });
  } catch (error) {
    logger.error('Erro ao inicializar push notifications', error, 'push-notifications');
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

      logger.info('Token salvo no Firestore', undefined, 'push-notifications');
    } else {
      logger.info('Usuário não autenticado, token não salvo', undefined, 'push-notifications');
    }
  } catch (error) {
    logger.error('Erro ao salvar token', error, 'push-notifications');
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
      logger.info('Navegar para detalhes da consulta', undefined, 'push-notifications');
      break;
    case 'message':
      logger.info('Navegar para chat', undefined, 'push-notifications');
      break;
    case 'alert':
      logger.info('Navegar para alerta', undefined, 'push-notifications');
      break;
    default:
      logger.info('Navegar para dashboard', undefined, 'push-notifications');
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
    logger.error('Erro ao enviar notificação local', error, 'push-notifications');
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
    logger.error('Erro ao limpar notificações', error, 'push-notifications');
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
    logger.error('Erro ao cancelar notificações', error, 'push-notifications');
  }
}

/**
 * Obtém lista de notificações agendadas
 */
export async function getScheduledNotifications(): Promise<LocalNotificationScheduleResult[]> {
  try {
    const pending = await LocalNotifications.getPending();
    return pending.notifications || [];
  } catch (error) {
    logger.error('Erro ao obter notificações agendadas', error, 'push-notifications');
    return [];
  }
}
