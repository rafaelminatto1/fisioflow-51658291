import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Camera, useCameraDevice, useFrameProcessor } from "react-native-vision-camera";
import { detectPose, Pose } from "expo-vision-pose-detector";
import { runOnJS } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { fetchApi } from "@/lib/api";
import { PoseOverlay } from "../biomechanics/PoseOverlay";
import { mapVisionToPoseLandmarks } from "../../../utils/pose-utils";

interface ClinicalTestVerifierCameraProps {
  testId: string;
  testName: string;
  onValidationComplete: (result: any) => void;
  onClose: () => void;
}

export const ClinicalTestVerifierCamera: React.FC<ClinicalTestVerifierCameraProps> = ({
  testId,
  testName,
  onValidationComplete,
  onClose,
}) => {
  const device = useCameraDevice("back");
  const [currentPose, setCurrentPose] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>("Posicione o paciente para o teste...");

  const verifyExecution = async (pose: any) => {
    if (isValidating) return;
    setIsValidating(true);

    try {
      const res = await fetchApi<{ success: boolean; data: any }>("/api/clinical/verify-test", {
        method: "POST",
        body: JSON.stringify({
          test_id: testId,
          pose_data: pose,
        }),
      });

      if (res.data?.isValid) {
        setFeedback(res.data.feedback);
        if (res.data.qualityScore > 90) {
           // Trava o resultado se estiver perfeito
           onValidationComplete(res.data);
        }
      } else {
        setFeedback(`⚠️ ${res.data.feedback}`);
      }
    } catch (e) {
      console.warn("Validation failed", e);
    } finally {
      setIsValidating(false);
    }
  };

  const updatePose = (results: Pose) => {
    const mapped = mapVisionToPoseLandmarks(results);
    if (mapped) {
      setCurrentPose(mapped);
      // Validar a cada 2 segundos para não sobrecarregar
      if (!isValidating) {
        verifyExecution(mapped);
      }
    }
  };

  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";
    const results = detectPose(frame);
    if (results) {
      runOnJS(updatePose)(results);
    }
  }, []);

  if (!device) return <View style={styles.error}><Text>Câmera não disponível</Text></View>;

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
      />

      <PoseOverlay pose={currentPose} width={300} height={600} />

      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Verificador IA: {testName}</Text>
          </View>
        </View>

        <View style={styles.bottomFeedback}>
          <BlurView intensity={80} style={styles.feedbackCard}>
            {isValidating && <ActivityIndicator size="small" color="#0EA5E9" style={{ marginBottom: 8 }} />}
            <Text style={styles.feedbackText}>{feedback}</Text>
          </BlurView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  error: { flex: 1, justifyContent: "center", alignItems: "center" },
  overlay: { ...StyleSheet.absoluteFillObject, padding: 24, justifyContent: "space-between" },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  titleContainer: { flex: 1 },
  title: { color: "white", fontSize: 16, fontWeight: "900", textTransform: "uppercase" },
  bottomFeedback: { marginBottom: 40 },
  feedbackCard: { padding: 20, borderRadius: 20, alignItems: "center", overflow: "hidden" },
  feedbackText: { color: "white", fontSize: 14, fontWeight: "bold", textAlign: "center" }
});
