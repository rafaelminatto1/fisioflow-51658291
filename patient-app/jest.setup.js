/**
 * Jest Setup File
 * Global mocks and configurations
 */

// Mock native modules
// Note: jest-expo preset handles most of these, but we can override/customize here

// Mock expo modules
jest.mock('expo-av', () => ({
  Video: jest.fn(),
  Audio: {
    Sound: jest.fn(),
  },
  ResizableVideo: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn((url) => url),
  openURL: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      version: '1.0.0',
      name: 'FisioFlow',
    },
  },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: jest.fn(),
}));

jest.mock('expo-splash-screen', () => ({
  SplashScreen: {
    preventAutoHideAsync: jest.fn(),
    hideAsync: jest.fn(),
  },
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  getInfoAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'images',
    Videos: 'videos',
    All: 'all',
  },
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
  getStringAsync: jest.fn(() => Promise.resolve('')),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  addEventListener: jest.fn(() => jest.fn()),
  removeEventListener: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getDevicePushTokenAsync: jest.fn(() => Promise.resolve({ data: 'mock-push-token' })),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  AndroidNotificationChannel: {
    Importance: {
      DEFAULT: 'default',
      HIGH: 'high',
      MAX: 'max',
    },
  },
}));

// Mock Firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  addDoc: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const GestureHandler = require('react-native-gesture-handler/jestSetup');
  return {
    ...GestureHandler,
    Gesture: {
      Tap: jest.fn(),
      Pan: jest.fn(),
      Pinch: jest.fn(),
      Rotation: jest.fn(),
      Fling: jest.fn(),
      LongPress: jest.fn(),
      NativeViewGesture: jest.fn(),
    },
    GestureDetector: jest.fn(({ children }) => children),
    GestureHandlerRootView: 'GestureHandlerRootView',
  };
});

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
    dispatch: jest.fn(),
    isFocused: jest.fn(() => true),
  }),
  useRoute: () => ({
    params: {},
    name: 'TestScreen',
    path: '/test',
  }),
  useFocusEffect: jest.fn((effect) => effect()),
  NavigationContainer: jest.fn(({ children }) => children),
  useNavigationState: jest.fn(() => ({ index: 0, routes: [] })),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
    canDismiss: jest.fn(() => true),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
  useGlobalSearchParams: jest.fn(() => ({})),
  Stack: jest.fn(({ children }) => children),
  Tabs: jest.fn(({ children }) => children),
  Link: jest.fn(({ children }) => children),
  Redirect: jest.fn(),
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

// Silence console warnings in tests unless needed
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock performance API
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
};

// Set timezone for consistent date tests
process.env.TZ = 'America/Sao_Paulo';
