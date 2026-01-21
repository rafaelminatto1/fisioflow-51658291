/**
 * Serviço de Autenticação Biométrica para iOS
 * Utiliza Face ID / Touch ID para login rápido e seguro
 */

import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

const BIOMETRIC_SERVER = "com.fisioflow.app";

/**
 * Verifica se a autenticação biométrica está disponível no dispositivo
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable || false;
  } catch (error) {
    console.error('Erro ao verificar biometria:', error);
    return false;
  }
}

/**
 * Configura e tenta fazer login com biometria
 * @returns true se o login biométrico foi bem-sucedido
 */
export async function setupBiometricAuth(): Promise<boolean> {
  const available = await isBiometricAvailable();

  if (!available) {
    return false;
  }

  try {
    // Verificar se já tem credenciais salvas
    const hasCredentials = await NativeBiometric.getCredentials({
      server: BIOMETRIC_SERVER
    }).catch(() => null);

    if (hasCredentials) {
      // Tentar login com biometria
      const verified = await NativeBiometric.verifyIdentity({
        reason: 'Acessar FisioFlow Pro',
        title: 'Autenticação Biométrica',
        subtitle: 'Use Face ID ou Touch ID',
        description: 'Escaneie seu rosto ou toque no sensor'
      });

      if (verified) {
        // Fazer login com Supabase usando credenciais salvas
        const { error } = await supabase.auth.signInWithPassword({
          email: hasCredentials.username,
          password: hasCredentials.password
        });

        if (!error) {
          return true;
        }
      }
    }
  } catch (error) {
    console.error('Erro no login biométrico:', error);
  }

  return false;
}

/**
 * Salva credenciais criptografadas para uso futuro com biometria
 */
export async function saveCredentialsForBiometric(
  email: string,
  password: string
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await NativeBiometric.setCredentials({
      username: email,
      password: password,
      server: BIOMETRIC_SERVER
    });
  } catch (error) {
    console.error('Erro ao salvar credenciais biométricas:', error);
  }
}

/**
 * Remove credenciais salvas (logout biométrico)
 */
export async function clearBiometricCredentials(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await NativeBiometric.deleteCredentials({
      server: BIOMETRIC_SERVER
    });
  } catch (error) {
    console.error('Erro ao limpar credenciais biométricas:', error);
  }
}

/**
 * Verifica se existem credenciais salvas
 */
export async function hasSavedCredentials(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const credentials = await NativeBiometric.getCredentials({
      server: BIOMETRIC_SERVER
    }).catch(() => null);
    return !!credentials;
  } catch (error) {
    return false;
  }
}

/**
 * Tipo de biometria disponível no dispositivo
 */
export async function getBiometricType(): Promise<'face' | 'touch' | 'none'> {
  if (!Capacitor.isNativePlatform()) {
    return 'none';
  }

  try {
    const result = await NativeBiometric.isAvailable();

    if (!result.isAvailable) {
      return 'none';
    }

    // Verificar se é Face ID ou Touch ID
    const isFace = result.biometryType === 'face_id';
    return isFace ? 'face' : 'touch';
  } catch (error) {
    return 'none';
  }
}
