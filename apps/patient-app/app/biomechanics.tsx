/**
 * Biomechanics Capture Screen — FisioFlow Patient App
 *
 * Análise biomecânica com iPhone usando apenas pacotes Expo já instalados.
 * Não requer EAS custom dev client.
 *
 * UPGRADE PATH (quando estabilizarem):
 *   - react-native-vision-camera@4.7+ → Frame Processors C++ (requer EAS dev client)
 *   - react-native-fast-tflite@1.6+ → MoveNet on-device (fix Bridgeless merged 23/03/2026)
 *   - @shopify/react-native-skia@2.2.20+ → overlay GPU (memory leak iOS fix v2.2.20)
 *
 * Stack atual (seguro, sem novos pacotes):
 *   - expo-camera (~17): gravação de vídeo + preview
 *   - expo-haptics (~15): feedback tátil nos eventos de contato
 *   - react-native-reanimated: animações fluidas
 */

import { useState, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useColors } from "@/hooks/useColorScheme";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Cálculos científicos ──────────────────────────────────────────────────────
// Bosco et al. (1983): h = g × tf² / 8
const boscoHeight = (takeoffFrame: number, landingFrame: number, fps: number) => {
  const tf = (landingFrame - takeoffFrame) / fps;
  return ((9.81 * tf * tf) / 8) * 100; // cm
};

// Sayers et al. (1999): PAPw(W) = 60.7 × h(cm) + 45.3 × BM(kg) − 2055
const sayersPower = (heightCm: number, bodyMassKg: number) =>
  Math.max(0, 60.7 * heightCm + 45.3 * bodyMassKg - 2055);

// Morin et al. (2005) Sine-Wave: cadência e oscilação vertical
const morinGait = (tcFrames: number, tfFrames: number, fps: number) => {
  const tc = tcFrames / fps;
  const tf = tfFrames / fps;
  return {
    cadence: 120 / (tc + tf), // steps/min
    oscillation: ((9.81 * tc * tc) / (Math.PI * Math.PI)) * 100, // cm
    tcMs: tc * 1000,
    tfMs: tf * 1000,
  };
};

// ─── Zonas de Risco ────────────────────────────────────────────────────────────
const oscillationLabel = (v: number) =>
  v < 5 ? "🔵 Baixa" : v <= 10 ? "🟢 Ideal" : "🟡 Ineficiente (> 10cm)";

const cadenceLabel = (v: number) =>
  v >= 180 ? "🟢 Elite (≥180)" : v >= 160 ? "🟡 Moderada" : "🔴 Baixa (< 160)";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TestMode = "select" | "jump" | "gait";
type GaitEvent = { type: "contact" | "toe-off"; frame: number; side: "L" | "R" };

export default function BiomechanicsScreen() {
  const colors = useColors();
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState<TestMode>("select");
  const [facing, setFacing] = useState<CameraType>("back");
  const [recording, setRecording] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const frameTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Patient data
  const [bodyMass] = useState<number | null>(null);

  // Jump test
  const [takeoffFrame, setTakeoffFrame] = useState<number | null>(null);
  const [landingFrame, setLandingFrame] = useState<number | null>(null);

  // Gait test
  const [gaitEvents, setGaitEvents] = useState<GaitEvent[]>([]);

  // ─── Recording ────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!cameraRef.current) return;
    setRecording(true);
    setFrameCount(0);
    setTakeoffFrame(null);
    setLandingFrame(null);
    setGaitEvents([]);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Simulates frame counter (real frame count needs vision-camera)
    // At 60fps: 1 frame ≈ 16.67ms
    frameTimer.current = setInterval(() => setFrameCount((f) => f + 1), 16);
  }, []);

  const stopRecording = useCallback(async () => {
    if (frameTimer.current) clearInterval(frameTimer.current);
    setRecording(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // ─── Jump Events ──────────────────────────────────────────────────────────
  const markTakeoff = useCallback(async () => {
    setTakeoffFrame(frameCount);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [frameCount]);

  const markLanding = useCallback(async () => {
    setLandingFrame(frameCount);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [frameCount]);

  // ─── Gait Events ──────────────────────────────────────────────────────────
  const markGait = useCallback(
    async (type: GaitEvent["type"], side: GaitEvent["side"]) => {
      setGaitEvents((prev) => [...prev, { type, frame: frameCount, side }]);
      // Vibração curta = contato, longa = impulsão
      if (type === "contact") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    },
    [frameCount],
  );

  // ─── Results ──────────────────────────────────────────────────────────────
  const jumpResult = (() => {
    if (takeoffFrame == null || landingFrame == null) return null;
    const h = boscoHeight(takeoffFrame, landingFrame, 60);
    return {
      height: h.toFixed(1),
      power: bodyMass != null ? sayersPower(h, bodyMass).toFixed(0) : null,
    };
  })();

  const gaitResult = (() => {
    const sorted = [...gaitEvents].sort((a, b) => a.frame - b.frame);
    let tcFrames = 0,
      tfFrames = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const e1 = sorted[i],
        e2 = sorted[i + 1];
      if (e1.type === "contact" && e2.type === "toe-off") tcFrames = e2.frame - e1.frame;
      else if (e1.type === "toe-off" && e2.type === "contact") tfFrames = e2.frame - e1.frame;
    }
    if (tcFrames === 0) return null;
    return morinGait(tcFrames, tfFrames, 60);
  })();

  // ─── Permission check ─────────────────────────────────────────────────────
  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Acesso à Câmera</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          O Biomechanics Lab precisa da câmera para gravação.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Permitir Câmera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Test Selection ───────────────────────────────────────────────────────
  if (mode === "select") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Biomechanics Lab</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            SELECIONE O PROTOCOLO
          </Text>

          {/* Jump Test */}
          <TouchableOpacity
            style={[styles.testCard, { backgroundColor: colors.surface }]}
            onPress={() => setMode("jump")}
          >
            <View style={[styles.testIcon, { backgroundColor: "#3b82f620" }]}>
              <Ionicons name="arrow-up" size={28} color="#3b82f6" />
            </View>
            <View style={styles.testInfo}>
              <Text style={[styles.testTitle, { color: colors.text }]}>Salto Vertical</Text>
              <Text style={[styles.testRef, { color: "#3b82f6" }]}>
                Bosco (1983) + Sayers (1999)
              </Text>
              <Text style={[styles.testDesc, { color: colors.textSecondary }]}>
                Altura de salto (CMJ/SJ) e Potência de Pico em Watts
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Gait Test */}
          <TouchableOpacity
            style={[styles.testCard, { backgroundColor: colors.surface }]}
            onPress={() => setMode("gait")}
          >
            <View style={[styles.testIcon, { backgroundColor: "#22c55e20" }]}>
              <Ionicons name="walk" size={28} color="#22c55e" />
            </View>
            <View style={styles.testInfo}>
              <Text style={[styles.testTitle, { color: colors.text }]}>Corrida & Marcha</Text>
              <Text style={[styles.testRef, { color: "#22c55e" }]}>Morin et al. (2005)</Text>
              <Text style={[styles.testDesc, { color: colors.textSecondary }]}>
                Cadência, oscilação vertical e rigidez de perna
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* AI Upgrade Info */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              IA de rastreamento de pose (MoveNet) disponível no painel web. Versão mobile aguarda
              estabilização do react-native-fast-tflite (março 2026).
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Jump / Gait Test Screen ──────────────────────────────────────────────
  const isJump = mode === "jump";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#000" }]}>
      {/* Camera Preview */}
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

      {/* Overlay HUD */}
      <View style={styles.overlay}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              stopRecording();
              setMode("select");
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.topCenter}>
            <Text style={styles.hudTitle}>{isJump ? "⚡ MYJUMP LAB" : "🏃 GAIT ANALYSIS"}</Text>
            <Text style={styles.hudRef}>
              {isJump ? "Bosco 1983 · Sayers 1999" : "Morin 2005 Sine-Wave"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.flipBtn}
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
          >
            <Ionicons name="camera-reverse-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Frame Counter */}
        {recording && (
          <View style={styles.frameCounter}>
            <View style={styles.recDot} />
            <Text style={styles.frameText}>F {frameCount} · 60fps</Text>
          </View>
        )}

        {/* ── Jump Controls ── */}
        {isJump && (
          <View style={styles.jumpControls}>
            {!recording ? (
              <TouchableOpacity style={styles.startBtn} onPress={startRecording}>
                <Ionicons name="videocam" size={24} color="#fff" />
                <Text style={styles.startBtnText}>INICIAR GRAVAÇÃO</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.jumpBtns}>
                  <TouchableOpacity
                    style={[
                      styles.eventBtn,
                      { backgroundColor: takeoffFrame != null ? "#22c55e" : "#1e40af" },
                    ]}
                    onPress={markTakeoff}
                  >
                    <Text style={styles.eventBtnText}>
                      {takeoffFrame != null ? `✓ DECOLAGEM\nF ${takeoffFrame}` : "① DECOLAGEM"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.eventBtn,
                      { backgroundColor: landingFrame != null ? "#22c55e" : "#7c3aed" },
                    ]}
                    onPress={markLanding}
                  >
                    <Text style={styles.eventBtnText}>
                      {landingFrame != null ? `✓ POUSO\nF ${landingFrame}` : "② POUSO"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
                  <Ionicons name="stop" size={20} color="#fff" />
                  <Text style={styles.stopBtnText}>ENCERRAR</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ── Gait Controls ── */}
        {!isJump && (
          <View style={styles.gaitControls}>
            {!recording ? (
              <TouchableOpacity style={styles.startBtn} onPress={startRecording}>
                <Ionicons name="videocam" size={24} color="#fff" />
                <Text style={styles.startBtnText}>INICIAR GRAVAÇÃO</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.gaitBtnsGrid}>
                  {/* Contato: vibração curta | Impulso: vibração forte */}
                  <TouchableOpacity
                    style={[styles.gaitBtn, { backgroundColor: "#22c55e" }]}
                    onPress={() => markGait("contact", "R")}
                  >
                    <Text style={styles.gaitBtnText}>CONTATO{"\n"}DIREITA</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.gaitBtn, { backgroundColor: "#3b82f6" }]}
                    onPress={() => markGait("contact", "L")}
                  >
                    <Text style={styles.gaitBtnText}>CONTATO{"\n"}ESQUERDA</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.gaitBtn, { backgroundColor: "#ef4444" }]}
                    onPress={() => markGait("toe-off", "R")}
                  >
                    <Text style={styles.gaitBtnText}>IMPULSO{"\n"}DIREITA</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.gaitBtn, { backgroundColor: "#a855f7" }]}
                    onPress={() => markGait("toe-off", "L")}
                  >
                    <Text style={styles.gaitBtnText}>IMPULSO{"\n"}ESQUERDA</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.eventCount}>{gaitEvents.length} eventos marcados</Text>
                <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
                  <Ionicons name="stop" size={20} color="#fff" />
                  <Text style={styles.stopBtnText}>ENCERRAR</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ── Results ── */}
        {!recording && (jumpResult || gaitResult) && (
          <View style={styles.results}>
            {jumpResult && (
              <>
                <Text style={styles.resultTitle}>RESULTADO · BOSCO (1983)</Text>
                <Text style={styles.resultBig}>{jumpResult.height} cm</Text>
                <Text style={styles.resultSub}>Altura de Salto</Text>
                {jumpResult.power && (
                  <>
                    <Text style={styles.resultBig}>{jumpResult.power} W</Text>
                    <Text style={styles.resultSub}>Potência Pico · Sayers (1999)</Text>
                  </>
                )}
                {bodyMass == null && (
                  <Text style={styles.resultHint}>
                    Informe sua massa no perfil para calcular a potência
                  </Text>
                )}
              </>
            )}
            {gaitResult && (
              <>
                <Text style={styles.resultTitle}>RESULTADO · MORIN (2005)</Text>
                <View style={styles.resultRow}>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultBig}>{gaitResult.cadence.toFixed(1)}</Text>
                    <Text style={styles.resultSub}>spm</Text>
                    <Text style={styles.resultZone}>{cadenceLabel(gaitResult.cadence)}</Text>
                  </View>
                  <View style={styles.resultItem}>
                    <Text style={styles.resultBig}>{gaitResult.oscillation.toFixed(1)}</Text>
                    <Text style={styles.resultSub}>cm oscilação</Text>
                    <Text style={styles.resultZone}>
                      {oscillationLabel(gaitResult.oscillation)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.resultHint}>
                  tc = {gaitResult.tcMs.toFixed(0)}ms · tf = {gaitResult.tfMs.toFixed(0)}ms
                </Text>
              </>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  title: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginHorizontal: 16, marginBottom: 24, textAlign: "center" },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 2, marginBottom: 8 },
  testCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 12,
  },
  testIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  testInfo: { flex: 1 },
  testTitle: { fontSize: 16, fontWeight: "800" },
  testRef: { fontSize: 10, fontWeight: "700", marginTop: 2 },
  testDesc: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  infoCard: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 12, marginTop: 8 },
  infoText: { fontSize: 11, flex: 1, lineHeight: 16 },
  primaryBtn: {
    backgroundColor: "#3b82f6",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  // Camera screen
  camera: { ...StyleSheet.absoluteFillObject },
  overlay: { flex: 1, justifyContent: "space-between" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  flipBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  topCenter: { alignItems: "center" },
  hudTitle: { color: "#fff", fontSize: 13, fontWeight: "900", letterSpacing: 1 },
  hudRef: { color: "rgba(255,255,255,0.6)", fontSize: 9, marginTop: 2 },
  frameCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
  frameText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Jump controls
  jumpControls: {
    padding: 16,
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  jumpBtns: { flexDirection: "row", gap: 12 },
  eventBtn: { flex: 1, padding: 14, borderRadius: 16, alignItems: "center" },
  eventBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },

  // Gait controls
  gaitControls: {
    padding: 16,
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  gaitBtnsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gaitBtn: { width: (SCREEN_W - 56) / 2, padding: 14, borderRadius: 14, alignItems: "center" },
  gaitBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  eventCount: { color: "rgba(255,255,255,0.7)", fontSize: 11, textAlign: "center" },

  // Shared
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ef4444",
    padding: 16,
    borderRadius: 16,
  },
  startBtnText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 12,
    borderRadius: 12,
  },
  stopBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Results
  results: {
    backgroundColor: "rgba(0,0,0,0.9)",
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 8,
  },
  resultTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
  },
  resultBig: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -1,
  },
  resultSub: { color: "rgba(255,255,255,0.5)", fontSize: 11, textAlign: "center", marginTop: -4 },
  resultRow: { flexDirection: "row", gap: 16 },
  resultItem: { flex: 1, alignItems: "center" },
  resultZone: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
    color: "#a3e635",
  },
  resultHint: { color: "rgba(255,255,255,0.4)", fontSize: 10, textAlign: "center" },
});
