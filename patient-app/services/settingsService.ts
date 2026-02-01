/**
 * Settings Service
 * Handles app settings and preferences
 */

import { AppStorage } from '@/lib/storage';
import { asyncResult, Result } from '@/lib/async';
import { log } from '@/lib/logger';

/**
 * App settings interface
 */
export interface AppSettings {
  notifications: boolean;
  exerciseReminders: boolean;
  appointmentReminders: boolean;
  autoPlayVideos: boolean;
  hapticFeedback: boolean;
}

/**
 * Get all app settings
 */
export async function getSettings(): Promise<Result<AppSettings>> {
  return asyncResult(async () => {
    const settings = await AppStorage.getSettings();
    return settings;
  }, 'getSettings');
}

/**
 * Get a specific setting
 */
export async function getSetting<K extends keyof AppSettings>(
  key: K
): Promise<Result<AppSettings[K]>> {
  return asyncResult(async () => {
    const settings = await AppStorage.getSettings();
    return settings[key];
  }, 'getSetting');
}

/**
 * Update a specific setting
 */
export async function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<Result<void>> {
  return asyncResult(async () => {
    const storageKey = getStorageKey(key);
    await AppStorage.setSetting(storageKey, value);

    log.info('SETTINGS', `Setting updated: ${key} = ${value}`);
  }, 'updateSetting');
}

/**
 * Toggle a boolean setting
 */
export async function toggleSetting(
  key: keyof AppSettings
): Promise<Result<boolean>> {
  return asyncResult(async () => {
    const settings = await AppStorage.getSettings();
    const currentValue = settings[key];
    const newValue = !currentValue;

    await updateSetting(key, newValue);

    return newValue;
  }, 'toggleSetting');
}

/**
 * Reset all settings to defaults
 */
export async function resetSettings(): Promise<Result<void>> {
  return asyncResult(async () => {
    const defaults: AppSettings = {
      notifications: true,
      exerciseReminders: true,
      appointmentReminders: true,
      autoPlayVideos: false,
      hapticFeedback: true,
    };

    await AppStorage.setSetting(
      '@fisioflow_settings_notifications',
      defaults.notifications
    );
    await AppStorage.setSetting(
      '@fisioflow_settings_exercise_reminders',
      defaults.exerciseReminders
    );
    await AppStorage.setSetting(
      '@fisioflow_settings_appointment_reminders',
      defaults.appointmentReminders
    );
    await AppStorage.setSetting(
      '@fisioflow_settings_auto_play_videos',
      defaults.autoPlayVideos
    );
    await AppStorage.setSetting(
      '@fisioflow_settings_haptic_feedback',
      defaults.hapticFeedback
    );

    log.info('SETTINGS', 'Settings reset to defaults');
  }, 'resetSettings');
}

/**
 * Map setting key to storage key
 */
function getStorageKey(key: keyof AppSettings): string {
  const keyMap: Record<keyof AppSettings, string> = {
    notifications: '@fisioflow_settings_notifications',
    exerciseReminders: '@fisioflow_settings_exercise_reminders',
    appointmentReminders: '@fisioflow_settings_appointment_reminders',
    autoPlayVideos: '@fisioflow_settings_auto_play_videos',
    hapticFeedback: '@fisioflow_settings_haptic_feedback',
  };
  return keyMap[key];
}
