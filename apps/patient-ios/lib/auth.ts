// Placeholder auth functions - TODO: Integrate with Firebase
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: string;
}

export async function login(credentials: LoginCredentials): Promise<void> {
  // TODO: Implement Firebase authentication
  // For now, this is a placeholder that simulates login
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate successful login for testing
      console.log('Login attempt:', credentials.email);
      // Set a mock user for testing
      setCurrentUser({ email: credentials.email, uid: 'mock-user-id' });
      resolve();
    }, 500);
  });
}

export async function register(data: RegisterData): Promise<void> {
  // TODO: Implement Firebase registration
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('Register attempt:', data.email);
      setCurrentUser({ email: data.email, uid: 'mock-user-id', name: data.name });
      resolve();
    }, 500);
  });
}

export async function logout(): Promise<void> {
  // TODO: Implement Firebase logout
  console.log('Logout');
  setCurrentUser(null);
}

export async function signOut(): Promise<void> {
  // Alias for logout
  return logout();
}

export async function resetPassword(email: string): Promise<void> {
  // TODO: Implement Firebase password reset
  console.log('Password reset requested for:', email);
}

// Notification functions
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return false;
  }
}

export async function getFCMToken(): Promise<string | null> {
  // TODO: Implement FCM token retrieval with Firebase Cloud Messaging
  // For now, return a placeholder
  console.log('FCM token requested');
  return null;
}

// Auth state change listener
type AuthStateCallback = (user: any) => void;

let currentUser: any = null;
let authListeners: AuthStateCallback[] = [];

export function onAuthStateChanged(callback: AuthStateCallback): () => void {
  authListeners.push(callback);

  // Immediately call with current user
  callback(currentUser);

  // Return unsubscribe function
  return () => {
    authListeners = authListeners.filter(l => l !== callback);
  };
}

// For testing - set current user
function setCurrentUser(user: any) {
  currentUser = user;
  authListeners.forEach(l => l(user));
}
