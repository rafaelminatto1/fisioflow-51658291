// Stub for react-native in web builds
// Using actual ES module exports for Vite compatibility

// Platform stub
export const Platform = {
  OS: 'web',
  select: (obj: any) => obj.web ?? obj.default,
  isTesting: false,
};

// StyleSheet stub
export const StyleSheet = { create: (styles: any) => styles };

// Component stubs - export as 'any' to avoid type issues
export const View: any = 'div';
export const Text: any = 'span';
export const Image: any = 'img';
export const ScrollView: any = 'div';
export const FlatList: any = 'div';
export const TouchableOpacity: any = 'button';
export const TouchableHighlight: any = 'button';
export const TouchableWithoutFeedback: any = 'div';
export const TextInput: any = 'input';
export const ActivityIndicator: any = 'div';
export const Modal: any = 'div';
export const SafeAreaView: any = 'div';
export const StatusBar: any = 'div';
export const Dimensions: any = { get: () => ({ width: 1920, height: 1080 }) };
export const PixelRatio: any = { get: () => 1 };

// Type exports
export type ViewStyle = any;
export type TextStyle = any;
export type ImageStyle = any;

// Default export as object
const ReactNative = {
  Platform,
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  Dimensions,
  PixelRatio,
};

export default ReactNative;
