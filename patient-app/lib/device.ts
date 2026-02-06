/**
 * Device Utilities
 * Helper functions for device information and platform-specific code
 */


/**
 * Device information interface
 */

import { Platform, Dimensions, StatusBar, PixelRatio } from 'react-native';
import * as Device from 'expo-device';
import { APP_VERSION, APP_NAME } from './constants';
import { log } from './logger';

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  osVersion: string;
  modelName: string;
  brand: string;
  isTablet: boolean;
  screenWidth: number;
  screenHeight: number;
  scale: number;
  fontScale: number;
  statusBarHeight: number;
  appVersion: string;
  appName: string;
}

/**
 * Get comprehensive device information
 */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const dimensions = Dimensions.get('window');
  const statusBarHeight = StatusBar.currentHeight || 0;

  let modelName = 'Unknown';
  let brand = 'Unknown';

  if (Platform.OS === 'ios') {
    // For iOS, try to get device model
    const width = dimensions.width;
    const height = dimensions.height;
    modelName = getModelNameForIOS(width, height);
    brand = 'Apple';
  } else if (Platform.OS === 'android') {
    // For Android, use expo-device
    try {
      modelName = Device.modelName || 'Android';
      brand = Device.brand || 'Android';
    } catch (error) {
      log.warn('DEVICE', 'Could not get Android device info', error);
      modelName = 'Android';
      brand = 'Android';
    }
  }

  return {
    platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    osVersion: Platform.Version as string,
    modelName,
    brand,
    isTablet: isTablet(),
    screenWidth: dimensions.width,
    screenHeight: dimensions.height,
    scale: PixelRatio.get(),
    fontScale: PixelRatio.getFontScale(),
    statusBarHeight,
    appVersion: APP_VERSION,
    appName: APP_NAME,
  };
}

/**
 * Get iOS model name based on screen dimensions
 */
function getModelNameForIOS(width: number, height: number): string {
  // Common iOS device screen sizes (points)
  const models: Record<string, string> = {
    '375x667': 'iPhone SE (2nd gen) / iPhone 8',
    '375x812': 'iPhone 13 mini / iPhone 12 mini / iPhone X / iPhone XS',
    '390x844': 'iPhone 14 / iPhone 13 / iPhone 13 Pro',
    '393x852': 'iPhone 14 Pro / iPhone 15 Pro',
    '414x896': 'iPhone 14 Plus / iPhone 13 Pro Max / iPhone 11 / iPhone XR',
    '430x932': 'iPhone 14 Pro Max / iPhone 15 Plus',
    '428x926': 'iPhone 15 Pro Max',
    '768x1024': 'iPad (9th gen)',
    '810x1080': 'iPad Air (5th gen)',
    '834x1194': 'iPad Pro 11"',
    '1024x1366': 'iPad Pro 12.9"',
  };

  const key = `${Math.round(width)}x${Math.round(height)}`;
  return models[key] || 'iPhone/iPad';
}

/**
 * Check if device is a tablet
 */
export function isTablet(): boolean {
  const dimensions = Dimensions.get('window');
  const { width, height } = dimensions;
  const aspectRatio = Math.max(width, height) / Math.min(width, height);

  // Tablet if aspect ratio is close to 4:3 or screen is large enough
  return aspectRatio < 1.6 || Math.min(width, height) >= 768;
}

/**
 * Check if device has notch
 */
export function hasNotch(): boolean {
  if (Platform.OS === 'ios') {
    // Most newer iPhones have notches
    const dimensions = Dimensions.get('window');
    return dimensions.height >= 812; // iPhone X and newer
  }
  return false; // Android notches vary by manufacturer
}

/**
 * Get responsive size based on screen width
 */
export function getResponsiveSize(
  small: number,
  medium: number,
  large: number,
  xlarge: number = large
): number {
  const screenWidth = Dimensions.get('window').width;

  if (screenWidth < 375) return small; // iPhone SE
  if (screenWidth < 390) return medium; // iPhone 8, iPhone 13 mini
  if (screenWidth < 430) return large; // iPhone 14, iPhone 15
  return xlarge; // iPhone 14 Plus, iPhone 15 Pro Max
}

/**
 * Scale size based on pixel ratio for sharper text/images
 */
export function scaleSize(size: number): number {
  return PixelRatio.getPixelSizeForLayoutSize(size);
}

/**
 * Get the appropriate font size for the device
 */
export function getFontSize(baseSize: number): number {
  const fontScale = PixelRatio.getFontScale();
  // Limit font scale to avoid excessively large text
  const clampedFontScale = Math.min(fontScale, 1.5);
  return baseSize * clampedFontScale;
}

/**
 * Check if device is in landscape mode
 */
export function isLandscape(): boolean {
  const dimensions = Dimensions.get('window');
  return dimensions.width > dimensions.height;
}

/**
 * Get safe area padding for notched devices
 */
export function getSafeAreaPadding(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const statusBarHeight = StatusBar.currentHeight || 0;
  const hasNotchDevice = hasNotch();

  return {
    top: hasNotchDevice ? statusBarHeight + 10 : statusBarHeight + 5,
    bottom: hasNotchDevice ? 20 : 5,
    left: 5,
    right: 5,
  };
}

/**
 * Log device info on app start (for debugging)
 */
export async function logDeviceInfo(): Promise<void> {
  if (!__DEV__) return;

  try {
    const info = await getDeviceInfo();
    log.info('DEVICE', 'Device Info', {
      platform: info.platform,
      osVersion: info.osVersion,
      model: info.modelName,
      isTablet: info.isTablet,
      screen: `${info.screenWidth}x${info.screenHeight}`,
      scale: info.scale,
      fontScale: info.fontScale,
    });
  } catch (error) {
    log.error('DEVICE', 'Could not log device info', error);
  }
}

/**
 * Get user agent string for API requests
 */
export async function getUserAgent(): Promise<string> {
  const info = await getDeviceInfo();
  return `${info.appName}/${info.appVersion} (${info.platform} ${info.osVersion}; ${info.brand} ${info.modelName})`;
}
