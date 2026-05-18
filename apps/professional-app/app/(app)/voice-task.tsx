import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { fetchApi } from "@/lib/api";
import { router, Stack } from "expo-router";
import { toast } from "@/lib/toast";

export default function VoiceTaskScreen() {
  const colors = useColors();
  const { isRecording, startRecording, stopRecording, audioUri } = useAudioRecorder();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessVoice = async () => {
    if (!audioUri) return;
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("audio", {
        uri: audioUri,
        name: "voice-task.m4a",
        type: "audio/m4a",
      } as any);

      const res = await fetchApi<any>("/api/ai/voice/task", {
        method: "POST",
        body: formData,
      });

      if (res.success) {
        toast.success("Tarefa criada com sucesso!");
        router.back();
      }
    } catch {
      toast.error("Falha ao criar tarefa via voz.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: "Comando de Voz", headerLargeTitle: true }} />

      <View style={styles.content}>
        <View style={[styles.aiCircle, { backgroundColor: colors.primary + "10" }]}>
          <Ionicons name="mic" size={60} color={colors.primary} />
          {isRecording && <View style={[styles.recordingPulse, { borderColor: colors.primary }]} />}
        </View>

        <Text style={[styles.instruction, { color: colors.text }]}>
          {isRecording
            ? "Ouvindo seu comando..."
            : "Toque no microfone e diga o que precisa ser feito."}
        </Text>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Ex: "Peça para a recepção ligar para o Sr. João e confirmar a RM dele."
        </Text>

        <View style={styles.controls}>
          {!isRecording && !audioUri && (
            <TouchableOpacity
              style={[styles.micButton, { backgroundColor: colors.primary }]}
              onPress={startRecording}
            >
              <Ionicons name="mic" size={32} color="white" />
            </TouchableOpacity>
          )}

          {isRecording && (
            <TouchableOpacity
              style={[styles.stopButton, { backgroundColor: colors.error }]}
              onPress={stopRecording}
            >
              <Ionicons name="stop" size={32} color="white" />
            </TouchableOpacity>
          )}

          {audioUri && !isProcessing && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.retryButton, { borderColor: colors.border }]}
                onPress={() => router.replace("/(app)/voice-task" as any)}
              >
                <Text style={[styles.retryText, { color: colors.textSecondary }]}>
                  Gravar novamente
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.success }]}
                onPress={handleProcessVoice}
              >
                <Text style={styles.confirmText}>Criar Tarefa IA</Text>
              </TouchableOpacity>
            </View>
          )}

          {isProcessing && <ActivityIndicator size="large" color={colors.primary} />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  aiCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  recordingPulse: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 80,
    borderWidth: 4,
    opacity: 0.5,
  },
  instruction: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  hint: {
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 60,
  },
  controls: {
    width: "100%",
    alignItems: "center",
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 15,
    borderWidth: 1,
  },
  retryText: { fontWeight: "bold" },
  confirmButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 15,
  },
  confirmText: { color: "white", fontWeight: "bold" },
});
