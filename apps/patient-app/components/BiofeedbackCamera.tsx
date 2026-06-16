import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from "react-native";
import { Camera, useCameraDevice, useFrameProcessor } from "react-native-vision-camera";
import { runOnJS } from "react-native-reanimated";
import { X } from "lucide-react-native";
import { Canvas, Line, Circle, Skia, vec } from "@shopify/react-native-skia";
import { mapVisionToPoseLandmarks, Pose, calculateAngle, getAngleStatus } from "../utils/pose-utils";

interface BiofeedbackCameraProps {
  onClose: () => void;
  targetAngle?: number;
  tolerance?: number;
}

const { width, height } = Dimensions.get("window");

export const BiofeedbackCamera: React.FC<BiofeedbackCameraProps> = ({
  onClose,
  targetAngle = 90,
  tolerance = 15,
}) => {
  const device = useCameraDevice("front");
  const [currentPose, setCurrentPose] = React.useState<Pose | null>(null);

  const updatePose = (results: Pose) => {
    const mapped = mapVisionToPoseLandmarks(results);
    if (mapped) {
      setCurrentPose(mapped);
    }
  };

  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";
    // Mock the frame processor or use detectPose if available in worklet
    // For now we assume a valid plugin exists or we send null
    // const results = detectPose(frame);
    // if (results) runOnJS(updatePose)(results);
  }, []);

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Câmera frontal não disponível</Text>
      </View>
    );
  }

  const renderFeedback = () => {
    if (!currentPose) return null;

    const leftShoulder = currentPose.leftShoulder;
    const leftElbow = currentPose.leftElbow;
    const leftWrist = currentPose.leftWrist;

    if (!leftShoulder || !leftElbow || !leftWrist || leftShoulder.score! < 0.5 || leftElbow.score! < 0.5 || leftWrist.score! < 0.5) {
      return null;
    }

    const currentAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const status = getAngleStatus(currentAngle, targetAngle, tolerance);
    
    let color = "#fbbf24"; // warning
    if (status === "ok") color = "#00f2ff"; // good
    if (status === "alert") color = "#ef4444"; // bad

    return (
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Line
          p1={vec(leftShoulder.x * width, leftShoulder.y * height)}
          p2={vec(leftElbow.x * width, leftElbow.y * height)}
          color={color}
          strokeWidth={4}
        />
        <Line
          p1={vec(leftElbow.x * width, leftElbow.y * height)}
          p2={vec(leftWrist.x * width, leftWrist.y * height)}
          color={color}
          strokeWidth={4}
        />
        <Circle c={vec(leftElbow.x * width, leftElbow.y * height)} r={8} color="white" />
        <Circle c={vec(leftElbow.x * width, leftElbow.y * height)} r={20} color={color} opacity={0.4} />
      </Canvas>
    );
  };

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />
      {renderFeedback()}
      
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={32} color="white" />
        </TouchableOpacity>
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>Mantenha o ângulo em {targetAngle}°</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  errorText: { color: "white", textAlign: "center", marginTop: 100 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    justifyContent: "space-between",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  instructionsContainer: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
    alignItems: "center",
  },
  instructionsText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
