// Mock for firebase/app
export function initializeApp() {
  return { name: '[DEFAULT]' };
}

export function getApps() {
  return [];
}

export function getApp() {
  return { name: '[DEFAULT]' };
}
