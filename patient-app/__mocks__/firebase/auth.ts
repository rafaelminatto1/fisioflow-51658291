// Mock for firebase/auth
export const authMock = {
  currentUser: null,
  onAuthStateChanged: jest.fn(),
};

export function getAuth() {
  return authMock;
}

export function signInWithEmailAndPassword() {
  return Promise.resolve({
    user: { uid: 'test-user-id', email: 'test@example.com' },
  });
}

export function createUserWithEmailAndPassword() {
  return Promise.resolve({
    user: { uid: 'test-user-id', email: 'test@example.com' },
  });
}

export function signOut() {
  return Promise.resolve();
}

export function sendPasswordResetEmail() {
  return Promise.resolve();
}

export function onAuthStateChanged() {
  return jest.fn(() => jest.fn());
}

export function updateProfile() {
  return Promise.resolve();
}

export function initializeAuth() {
  return authMock;
}

export function getReactNativePersistence() {
  return {};
}
