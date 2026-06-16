import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Image } from "react-native";
import { Camera, useCameraDevice, useFrameProcessor } from "react-native-vision-camera";
import { detectPose, Pose } from "expo-vision-pose-detector";
import { runOnJS } from "react-native-reanimated";
import { X } from "lucide-react-native";
import { mapVisionToPoseLandmarks } from "../../../utils/pose-utils";
import { SkiaPoseOverlay } from "./SkiaPoseOverlay";

interface BiomechanicsCameraViewProps {
  onPoseDetected: (pose: any) => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  onClose: () => void;
  ghostMedia?: string | null;
}

const { width, height } = Dimensions.get("window");

export const BiomechanicsCameraView: React.FC<BiomechanicsCameraViewProps> = ({
  onPoseDetected,
  isRecording,
  onToggleRecording,
  onClose,
  ghostMedia,
}) => {
  const device = useCameraDevice("back");
  const [currentPose, setCurrentPose] = React.useState<any>(null);
  const [jointHistory, setJointHistory] = React.useState<
    Record<string, { x: number; y: number }[]>
  >({});

  const updatePose = (results: Pose) => {
    const mapped = mapVisionToPoseLandmarks(results);
    if (mapped) {
      setCurrentPose(mapped);
      onPoseDetected(mapped);

      if (isRecording) {
        setJointHistory((prev) => {
          const next = { ...prev };
          // Rastrear articulações de interesse
          const jointsToTrack = ["leftAnkle", "rightAnkle", "leftKnee", "rightKnee"];

          jointsToTrack.forEach((joint) => {
            if (mapped[joint] && mapped[joint].score > 0.5) {
              const history = next[joint] || [];
              next[joint] = [...history.slice(-50), { x: mapped[joint].x, y: mapped[joint].y }];
            }
          });

          return next;
        });
      }
    }
  };

  const handleToggleRecording = () => {
    if (!isRecording) {
      setJointHistory({}); // Limpar histórico ao iniciar nova gravação
    }
    onToggleRecording();
  };

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      const results = detectPose(frame);
      if (results) {
        runOnJS(updatePose)(results);
      }
    },
    [onPoseDetected, isRecording],
  );

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Câmera não disponível</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />

      {ghostMedia && (
        <Image
          source={{ uri: ghostMedia }}
          style={[StyleSheet.absoluteFill, { opacity: 0.3 }]}
          resizeMode="cover"
        />
      )}

      <SkiaPoseOverlay pose={currentPose} width={width} height={height} pathHistory={jointHistory} />

      {/* Overlays e Controles */}
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <X size={32} color="white" />
        </TouchableOpacity>

        <View style={styles.bottomControls}>
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={[styles.recordButton, isRecording && styles.recordingButton]}
              onPress={handleToggleRecording}
            >
              <View style={[styles.recordInner, isRecording && styles.recordingInner]} />
            </TouchableOpacity>
          </View>
        </View>

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.dot} />
            <Text style={styles.recordingText}>GRAVANDO</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 20,
    justifyContent: "space-between",
  },
  errorText: {
    color: "white",
    textAlign: "center",
    marginTop: 100,
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
  bottomControls: {
    alignItems: "center",
    marginBottom: 40,
  },
  controlsContainer: {
    padding: 20,
    borderRadius: 40,
    overflow: "hidden",
    backgroundColor: "#0F172A",
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  recordingButton: {
    borderColor: "rgba(255,255,255,0.5)",
  },
  recordInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#ef4444",
  },
  recordingInner: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  recordingIndicator: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    marginRight: 8,
  },
  recordingText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
