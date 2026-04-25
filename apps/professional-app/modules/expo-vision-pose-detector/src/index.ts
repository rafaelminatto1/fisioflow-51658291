import { requireNativeModule } from "expo-modules-core";
import { VisionCameraProxy, type Frame } from "react-native-vision-camera";

// This is the JS interface that the rest of the app will use
const ExpoVisionPoseDetector = requireNativeModule("ExpoVisionPoseDetector");

export async function detectPoseAsync(imageUrl: string): Promise<any[]> {
  return await ExpoVisionPoseDetector.detectPoseAsync(imageUrl);
}

/**
 * Real-time vision-camera frame processor plugin
 */
const plugin = VisionCameraProxy.initFrameProcessorPlugin("detectPose", {});

export function detectPose(frame: Frame): any[] {
  "worklet";
  if (plugin == null) throw new Error('Failed to load Frame Processor Plugin "detectPose"!');
  return plugin.call(frame) as any[];
}

export default ExpoVisionPoseDetector;
