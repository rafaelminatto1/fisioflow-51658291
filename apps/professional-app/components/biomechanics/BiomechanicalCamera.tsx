import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useFrameProcessor,
} from "react-native-vision-camera";
import { detectPose, Pose } from "expo-vision-pose-detector";
import { runOnJS } from "react-native-reanimated";
import Svg, { Line, Circle, G } from "react-native-svg";
import { JointAngles } from "@/utils/biomechanics/angles";
import { Point3D } from "@/utils/biomechanics/vectors";
import { calculateAsymmetry, evaluateRisk } from "@/utils/biomechanics/scoring";
import { Sparkles, X, Activity, ShieldAlert, CheckCircle2 } from "lucide-react-native";
import { biomechanicsApi } from "@/api/v2/biomechanics";

const { width, height } = Dimensions.get("window");

// Conexões do esqueleto clínico
const BONES = [
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"],
  ["leftHip", "rightHip"],
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
];

interface BiomechanicalCameraProps {
  patientId?: string;
  onSnapshot?: (metrics: any) => void;
  onClose?: () => void;
}

export const BiomechanicalCamera: React.FC<BiomechanicalCameraProps> = ({
  patientId,
  onSnapshot,
  onClose,
}) => {
  const device = useCameraDevice("back");
  const camera = useRef<Camera>(null);

  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [currentPose, setCurrentPose] = useState<Pose | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Métricas em tempo real
  const [metrics, setMetrics] = useState({
    leftKnee: 0,
    rightKnee: 0,
    asymmetry: 0,
    risk: "low" as "low" | "moderate" | "high",
  });

  const format = useCameraFormat(device, [
    { fps: 30 },
    { videoResolution: { width: 1080, height: 1920 } },
  ]);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === "granted");
    })();
  }, []);

  const updateUI = useCallback((pose: Pose) => {
    setCurrentPose(pose);

    if (
      pose.leftHip &&
      pose.leftKnee &&
      pose.leftAnkle &&
      pose.rightHip &&
      pose.rightKnee &&
      pose.rightAnkle
    ) {
      const lK = JointAngles.knee(
        pose.leftHip as Point3D,
        pose.leftKnee as Point3D,
        pose.leftAnkle as Point3D,
      );
      const rK = JointAngles.knee(
        pose.rightHip as Point3D,
        pose.rightKnee as Point3D,
        pose.rightAnkle as Point3D,
      );
      const asym = calculateAsymmetry(lK, rK);
      const risk = evaluateRisk(asym);

      setMetrics({
        leftKnee: lK,
        rightKnee: rK,
        asymmetry: asym,
        risk,
      });
    }
  }, []);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      const pose = detectPose(frame);
      if (pose) {
        runOnJS(updateUI)(pose);
      }
    },
    [updateUI],
  );

  const saveAnalysis = async () => {
    if (!patientId || isSaving) return;

    setIsSaving(true);
    try {
      await biomechanicsApi.create({
        patientId,
        type: "functional_movement",
        analysisData: {
          angles: {
            leftKnee: metrics.leftKnee,
            rightKnee: metrics.rightKnee,
            asymmetry: metrics.asymmetry,
          },
          status: "completed",
        },
      });

      Alert.alert("Sucesso", "Snapshot clínico salvo no prontuário!");
      if (onSnapshot) onSnapshot(metrics);
      if (onClose) onClose();
    } catch (e) {
      console.error("Failed to save biomechanics analysis", e);
      Alert.alert("Erro", "Não foi possível salvar a análise clínica.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!hasPermission)
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Sem permissão de câmera.</Text>
      </View>
    );
  if (!device)
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );

  const riskColor =
    metrics.risk === "high" ? "#ef4444" : metrics.risk === "moderate" ? "#fbbf24" : "#34d399";

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        isActive={isActive}
        frameProcessor={frameProcessor}
        frameProcessorFps={15}
      />

      <View style={styles.overlay}>
        {/* Header HUD */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>AI CINEMATIC ASSISTANT</Text>
            <Text style={styles.headerSub}>FisioFlow Studio • SP</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X color="white" size={20} />
          </TouchableOpacity>
        </View>

        {/* Esqueleto SVG */}
        <Svg style={StyleSheet.absoluteFill}>
          {currentPose && (
            <G opacity={0.7}>
              {BONES.map(([p1, p2]) => renderBone(currentPose[p1], currentPose[p2], riskColor))}
              {Object.keys(currentPose).map((key) => renderJoint(currentPose[key], riskColor))}
            </G>
          )}
        </Svg>

        {/* Painel de Métricas */}
        <View style={styles.metricsContainer}>
          <MetricBadge
            label="JOELHO ESQ"
            value={`${metrics.leftKnee.toFixed(0)}°`}
            color="#60a5fa"
          />
          <MetricBadge
            label="JOELHO DIR"
            value={`${metrics.rightKnee.toFixed(0)}°`}
            color="#60a5fa"
          />
          <View style={[styles.riskPanel, { borderColor: `${riskColor}60` }]}>
            <Text style={styles.metricLabel}>ASSIMETRIA</Text>
            <View style={styles.riskRow}>
              <Text style={[styles.riskValue, { color: riskColor }]}>
                {metrics.asymmetry.toFixed(1)}%
              </Text>
              {metrics.risk === "high" ? (
                <ShieldAlert size={16} color={riskColor} />
              ) : (
                <CheckCircle2 size={16} color={riskColor} />
              )}
            </View>
            <Text style={[styles.riskLabel, { color: riskColor }]}>
              {metrics.risk.toUpperCase()} RISK
            </Text>
          </View>
        </View>

        {/* Botão de Captura */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.captureButton, isSaving && styles.buttonDisabled]}
            onPress={saveAnalysis}
            disabled={isSaving}
          >
            {isSaving ? <ActivityIndicator color="white" /> : <Activity color="white" size={32} />}
          </TouchableOpacity>
          <Text style={styles.captureHint}>SNAPSHOT CLÍNICO</Text>
        </View>
      </View>
    </View>
  );
};

const renderBone = (p1: any, p2: any, color: string) => {
  if (!p1 || !p2 || p1.score < 0.5 || p2.score < 0.5) return null;
  return (
    <Line
      key={`bone-${p1.x}-${p1.y}-${p2.x}`}
      x1={p1.x * width}
      y1={p1.y * height}
      x2={p2.x * width}
      y2={p2.y * height}
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  );
};

const renderJoint = (p: any, color: string) => {
  if (!p || p.score < 0.5) return null;
  return (
    <Circle
      key={`joint-${p.x}-${p.y}`}
      cx={p.x * width}
      cy={p.y * height}
      r="4"
      fill="white"
      stroke={color}
      strokeWidth="1.5"
    />
  );
};

const MetricBadge = ({ label, value, color }: any) => (
  <View style={styles.metricBadge}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" },
  overlay: { ...StyleSheet.absoluteFillObject },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    paddingTop: 60,
    zIndex: 10,
  },
  headerTitle: { color: "white", fontSize: 12, fontWeight: "900", letterSpacing: 2 },
  headerSub: { color: "#60a5fa", fontSize: 10, fontWeight: "bold", fontStyle: "italic" },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  metricsContainer: { position: "absolute", top: 130, right: 20, gap: 10 },
  metricBadge: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "flex-end",
  },
  riskPanel: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    padding: 12,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
  },
  riskRow: { flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 2 },
  metricLabel: { color: "white", opacity: 0.5, fontSize: 8, fontWeight: "900" },
  metricValue: { fontSize: 20, fontWeight: "900", fontVariant: ["tabular-nums"] },
  riskValue: { fontSize: 24, fontWeight: "900", fontVariant: ["tabular-nums"] },
  riskLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  controls: { position: "absolute", bottom: 60, alignSelf: "center", alignItems: "center" },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#1E40AF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1E40AF",
    shadowRadius: 20,
    shadowOpacity: 0.6,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.2)",
  },
  buttonDisabled: { opacity: 0.7 },
  captureHint: {
    color: "white",
    fontSize: 9,
    fontWeight: "900",
    marginTop: 12,
    letterSpacing: 1.5,
    opacity: 0.8,
  },
  errorText: { color: "white", textAlign: "center", marginTop: 100, fontWeight: "bold" },
});
