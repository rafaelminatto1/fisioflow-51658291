// Mobile stubs for Web build
// This file is used by Vite to mock mobile-only packages

// expo-notifications stub
export const setNotificationHandler = () => {};
export const getPermissionsAsync = async () => ({ status: 'undetermined' });
export const requestPermissionsAsync = async () => ({ status: 'undetermined' });
export const getExpoPushTokenAsync = async () => ({ data: '' });
export const addNotificationReceivedListener = () => ({ remove: () => {} });
export const addNotificationResponseReceivedListener = () => ({ remove: () => {} });
export const scheduleNotificationAsync = async () => '';
export const cancelScheduledNotificationAsync = async () => {};
export const cancelAllScheduledNotificationsAsync = async () => {};
export const dismissNotificationAsync = async () => {};
export const dismissAllNotificationsAsync = async () => {};
export const setBadgeCountAsync = async () => {};
export const getBadgeCountAsync = async () => 0;
export const setNotificationChannelAsync = async () => {};
export enum SchedulableTriggerInputTypes { CALENDAR = 'calendar' }
export enum AndroidImportance { MAX = 5, HIGH = 4, DEFAULT = 3 }

// expo-device stub
export const isDevice = false;

// react-native stub
export const Platform = {
  OS: 'web',
  select: <T,>(objs: { web?: T; default?: T; [key: string]: T | undefined }) => objs.web || objs.default,
};

export default {
  setNotificationHandler,
  getPermissionsAsync,
  requestPermissionsAsync,
  getExpoPushTokenAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  dismissNotificationAsync,
  dismissAllNotificationsAsync,
  setBadgeCountAsync,
  getBadgeCountAsync,
  setNotificationChannelAsync,
  SchedulableTriggerInputTypes,
  AndroidImportance,
  isDevice,
  Platform,
};
