import { requireNativeModule } from 'expo-modules-core';

// This is the JS interface that the rest of the app will use
const ExpoVisionPoseDetector = requireNativeModule('ExpoVisionPoseDetector');

export async function detectPoseAsync(imageUrl: string): Promise<any[]> {
  return await ExpoVisionPoseDetector.detectPoseAsync(imageUrl);
}

export default ExpoVisionPoseDetector;
