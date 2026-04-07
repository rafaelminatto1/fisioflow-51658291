// Stub para react-native-vision-camera no dev build sem módulo nativo
// O módulo nativo está excluído do autolinking neste build.
// Componentes que usam a câmera devem verificar disponibilidade antes de usar.

const { View, Text } = require('react-native');

const Camera = (props) => null;
Camera.getAvailableCameraDevices = () => [];
Camera.getCameraPermissionStatus = async () => 'not-determined';
Camera.requestCameraPermission = async () => 'denied';
Camera.getMicrophonePermissionStatus = async () => 'not-determined';
Camera.requestMicrophonePermission = async () => 'denied';

const useCameraDevice = () => undefined;
const useCameraPermission = () => ({
  hasPermission: false,
  requestPermission: async () => false,
});
const useMicrophonePermission = () => ({
  hasPermission: false,
  requestPermission: async () => false,
});
const useFrameProcessor = () => undefined;
const useSkiaFrameProcessor = () => undefined;
const useCameraFormat = () => undefined;
const useCodeScanner = () => undefined;

module.exports = {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
  useFrameProcessor,
  useSkiaFrameProcessor,
  useCameraFormat,
  useCodeScanner,
  CameraRuntimeError: class CameraRuntimeError extends Error {},
  CameraPermissionError: class CameraPermissionError extends Error {},
};
