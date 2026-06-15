import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import { PoseTrackerOverlay } from "@/components/ai/PoseTrackerOverlay";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import * as Haptics from "expo-haptics";

export default function ExerciseVisionScreen() {
  const { id: exerciseId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();

  const [recording, setRecording] = useState(false);
  const [pose, setPose] = useState<any>(null);
  const [status, setStatus] = useState<"ok" | "warn" | "crit">("ok");
  const [message, setMessage] = useState("Aguardando início...");
  const [reps, setReps] = useState(0);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  const toggleRecording = () => {
    if (!recording) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRecording(true);
      setMessage("Mantenha a postura...");
      setReps(0);
    } else {
      setRecording(false);
      Alert.alert(
        "Série Concluída",
        `Você realizou ${reps} repetições. Deseja ver o relatório de performance?`,
        [
          { text: "Repetir", style: "cancel", onPress: () => setReps(0) },
          {
            text: "Ver Relatório",
            onPress: () => router.push(`/exercise/report?id=${exerciseId}&reps=${reps}&rom=115`),
          },
        ],
      );
    }
  };

  if (!device || !hasPermission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 10 }}>
          Configurando visão computacional...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={true} />

      <PoseTrackerOverlay pose={pose} status={status} message={recording ? message : undefined} />

      {/* Top HUD */}
      <View style={styles.topHud}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>REPS</Text>
            <Text style={styles.statValue}>{reps}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>STATUS</Text>
            <Text style={[styles.statValue, { color: status === "ok" ? "#10B981" : "#EF4444" }]}>
              {status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Record Button */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={toggleRecording}
          style={[styles.recordButton, recording && styles.recordingActive]}
        >
          <View style={[styles.recordInner, recording && styles.recordInnerSquare]} />
        </TouchableOpacity>
        <Text style={styles.controlLabel}>
          {recording ? "PARAR SÉRIE" : "INICIAR MONITORAMENTO"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  topHud: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  statsContainer: { flexDirection: "row", gap: 10 },
  statPill: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    alignItems: "center",
    minWidth: 80,
  },
  statLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: "800", marginBottom: 2 },
  statValue: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  controls: { position: "absolute", bottom: 60, alignSelf: "center", alignItems: "center" },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  recordingActive: { borderColor: "#EF4444" },
  recordInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#EF4444" },
  recordInnerSquare: { borderRadius: 8, width: 30, height: 30 },
  controlLabel: { color: "#fff", fontSize: 12, fontWeight: "bold", letterSpacing: 1 },
});
