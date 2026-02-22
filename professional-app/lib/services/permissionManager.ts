import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Alert, Linking, Platform } from 'react-native';
import { consentManager } from './consentManager';
import { CONSENT_TYPES } from '@/constants/consentTypes';

export type PermissionType = 'camera' | 'photos' | 'location' | 'notifications';
export type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'limited';

export class PermissionManager {
  private static instance: PermissionManager;

  private constructor() {}

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Check current status of a permission
   */
  async checkPermission(permission: PermissionType): Promise<PermissionStatus> {
    switch (permission) {
      case 'camera': {
        const result = await Camera.getCameraPermissionsAsync();
        return result.status as PermissionStatus;
      }
      case 'photos': {
        const { status } = await MediaLibrary.getPermissionsAsync();
        return status as PermissionStatus;
      }
      case 'location': {
        const { status } = await Location.getForegroundPermissionsAsync();
        return status as PermissionStatus;
      }
      case 'notifications': {
        const { status } = await Notifications.getPermissionsAsync();
        return status as any as PermissionStatus;
      }
      default:
        return 'undetermined';
    }
  }

  /**
   * Request permission with optional explainer logic
   */
  async requestPermission(
    permission: PermissionType,
    userId?: string
  ): Promise<PermissionStatus> {
    let status: PermissionStatus = 'undetermined';

    switch (permission) {
      case 'camera': {
        const result = await Camera.requestCameraPermissionsAsync();
        status = result.status as PermissionStatus;
        if (userId && status === 'granted') {
          await consentManager.grantConsent(userId, CONSENT_TYPES.CAMERA_PERMISSION, '1.0');
        }
        break;
      }
      case 'photos': {
        const result = await MediaLibrary.requestPermissionsAsync();
        status = result.status as PermissionStatus;
        if (userId && status === 'granted') {
          await consentManager.grantConsent(userId, CONSENT_TYPES.PHOTOS_PERMISSION, '1.0');
        }
        break;
      }
      case 'location': {
        const result = await Location.requestForegroundPermissionsAsync();
        status = result.status as PermissionStatus;
        if (userId && status === 'granted') {
          await consentManager.grantConsent(userId, CONSENT_TYPES.LOCATION_PERMISSION, '1.0');
        }
        break;
      }
      case 'notifications': {
        const result = await Notifications.requestPermissionsAsync();
        status = result.status as any as PermissionStatus;
        if (userId && status === 'granted') {
          await consentManager.grantConsent(userId, CONSENT_TYPES.NOTIFICATIONS_PERMISSION, '1.0');
        }
        break;
      }
    }

    if (status === 'denied') {
      this.showDeniedAlert(permission);
    }

    return status;
  }

  /**
   * Open app settings in system
   */
  openSettings(): void {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }

  /**
   * Get description for alternative workflow if permission is denied
   */
  getAlternativeWorkflow(permission: PermissionType): string {
    switch (permission) {
      case 'camera':
        return 'Você pode selecionar fotos existentes da sua galeria em vez de tirar uma nova foto.';
      case 'photos':
        return 'Você pode usar a câmera para tirar fotos no momento, se o acesso à galeria estiver restrito.';
      case 'location':
        return 'Você pode selecionar o endereço da clínica manualmente na lista para realizar o check-in.';
      case 'notifications':
        return 'Você pode verificar novos agendamentos e mensagens diretamente no painel principal do aplicativo.';
      default:
        return '';
    }
  }

  private showDeniedAlert(permission: PermissionType): void {
    const labels: Record<PermissionType, string> = {
      camera: 'Câmera',
      photos: 'Fotos',
      location: 'Localização',
      notifications: 'Notificações',
    };

    Alert.alert(
      'Permissão Negada',
      `O acesso à ${labels[permission]} é necessário para esta funcionalidade. ${this.getAlternativeWorkflow(permission)}`,
      [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Configurações', onPress: () => this.openSettings() },
      ]
    );
  }
}

export const permissionManager = PermissionManager.getInstance();
