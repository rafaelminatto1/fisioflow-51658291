import { requireNativeModule } from "expo-modules-core";

// Native module backed by Vision Framework (Apple) — no VisionCamera dependency
const ExpoVisionPoseDetector = requireNativeModule("ExpoVisionPoseDetector");

/** Detect 2D human body pose landmarks from an image URL */
export async function detectPoseAsync(imageUrl: string): Promise<any[]> {
  return await ExpoVisionPoseDetector.detectPoseAsync(imageUrl);
}

/** Detect 3D human body pose landmarks from an image URL (iOS 17+) */
export async function detectPose3DAsync(imageUrl: string): Promise<any[]> {
  return await ExpoVisionPoseDetector.detectPose3DAsync(imageUrl);
}

export default ExpoVisionPoseDetector;
