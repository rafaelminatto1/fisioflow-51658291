import React, { useEffect, useState, useRef, useCallback } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Dimensions } from "react-native";
import { 
  Camera, 
  useCameraDevice, 
  useCameraFormat,
  useFrameProcessor,
  PhotoFile
} from "react-native-vision-camera";
import { detectPose, Pose } from "expo-vision-pose-detector";
import { runOnJS } from "react-native-reanimated";
import Svg, { Line, Circle, G, Text as SvgText } from "react-native-svg";
import { JointAngles } from "@/utils/biomechanics/angles";
import { Point3D } from "@/utils/biomechanics/vectors";
import { calculateAsymmetry } from "@/utils/biomechanics/scoring";
import { Sparkles, Camera as CameraIcon, RotateCcw, ShieldCheck, Activity } from "lucide-react-native";
import { biomechanicsApi } from "@/api/v2/biomechanics";

const { width, height } = Dimensions.get("window");

interface BiomechanicalCameraProps {
  patientId?: string;
  onSnapshot?: (metrics: any) => void;
  onClose?: () => void;
}

export const BiomechanicalCamera: React.FC<BiomechanicalCameraProps> = ({ 
  patientId, 
  onSnapshot,
  onClose
}) => {
  const device = useCameraDevice("back");
  const camera = useRef<Camera>(null);
  
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [currentPose, setCurrentPose] = useState<Pose | null>(null);
  
  // Métricas em tempo real
  const [metrics, setMetrics] = useState({
    leftKnee: 0,
    rightKnee: 0,
    asymmetry: 0
  });

  const format = useCameraFormat(device, [
    { fps: 30 },
    { videoResolution: { width: 1080, height: 1920 } }
  ]);

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === "granted");
    })();
  }, []);

  const updateUI = useCallback((pose: Pose) => {
    setCurrentPose(pose);
    
    // Mapear pontos para nosso formato 3D e calcular ângulos de precisão
    if (pose.leftHip && pose.leftKnee && pose.leftAnkle && 
        pose.rightHip && pose.rightKnee && pose.rightAnkle) {
      
      const lK = JointAngles.knee(pose.leftHip as Point3D, pose.leftKnee as Point3D, pose.leftAnkle as Point3D);
      const rK = JointAngles.knee(pose.rightHip as Point3D, pose.rightKnee as Point3D, pose.rightAnkle as Point3D);
      const asym = calculateAsymmetry(lK, rK);
      
      setMetrics({
        leftKnee: lK,
        rightKnee: rK,
        asymmetry: asym
      });
    }
  }, []);

  const frameProcessor = useFrameProcessor((frame) => {
    "worklet";
    const pose = detectPose(frame);
    if (pose) {
      runOnJS(updateUI)(pose);
    }
  }, [updateUI]);

  const saveAnalysis = async () => {
    if (!patientId) return;
    
    try {
      // Salvar snapshot clínico no banco Neon via AI Studio
      await biomechanicsApi.create({
        patientId,
        type: "functional_movement",
        analysisData: {
          angles: {
            leftKnee: metrics.leftKnee,
            rightKnee: metrics.rightKnee,
            asymmetry: metrics.asymmetry
          },
          status: "completed"
        }
      });
      
      if (onSnapshot) onSnapshot(metrics);
      if (onClose) onClose();
    } catch (e) {
      console.error("Failed to save biomechanics analysis", e);
    }
  };

  if (!hasPermission) return <View style={styles.container}><Text style={styles.errorText}>Sem permissão.</Text></View>;
  if (!device) return <ActivityIndicator size="large" style={styles.container} />;

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        format={format}
        isActive={isActive}
        frameProcessor={frameProcessor}
        frameProcessorFps={15} // Processar a cada 2 quadros para poupar bateria
      />

      <View style={styles.overlay}>
        <Svg style={StyleSheet.absoluteFill}>
          {currentPose && (
            <G opacity={0.6}>
              {/* Desenhar conexões críticas do esqueleto */}
              {renderBone(currentPose.leftHip, currentPose.leftKnee)}
              {renderBone(currentPose.leftKnee, currentPose.leftAnkle)}
              {renderBone(currentPose.rightHip, currentPose.rightKnee)}
              {renderBone(currentPose.rightKnee, currentPose.rightAnkle)}
            </G>
          )}
        </Svg>

        <View style={styles.metricsContainer}>
          <MetricBadge label="JOELHO ESQ" value={`${metrics.leftKnee.toFixed(0)}°`} color="#60a5fa" />
          <MetricBadge label="JOELHO DIR" value={`${metrics.rightKnee.toFixed(0)}°`} color="#34d399" />
          <MetricBadge 
            label="ASSIMETRIA" 
            value={`${metrics.asymmetry.toFixed(1)}%`} 
            color={metrics.asymmetry > 15 ? "#ef4444" : "#fbbf24"} 
          />
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.captureButton} onPress={saveAnalysis}>
             <Activity color="white" size={32} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const renderBone = (p1: any, p2: any) => {
  if (!p1 || !p2) return null;
  return (
    <Line 
      x1={p1.x * width} y1={p1.y * height} 
      x2={p2.x * width} y2={p2.y * height} 
      stroke="#00f2ff" strokeWidth="3" 
    />
  );
};

const MetricBadge = ({ label, value, color }: any) => (
  <View style={[styles.metricBadge, { borderColor: `${color}40` }]}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  overlay: { ...StyleSheet.absoluteFillObject },
  metricsContainer: { position: "absolute", top: 100, right: 20, gap: 8 },
  metricBadge: { 
    backgroundColor: "rgba(15, 23, 42, 0.85)", 
    padding: 10, 
    borderRadius: 12, 
    borderWidth: 1, 
    alignItems: "flex-end" 
  },
  metricLabel: { color: "white", opacity: 0.6, fontSize: 8, fontWeight: "900" },
  metricValue: { fontSize: 18, fontWeight: "900" },
  controls: { position: "absolute", bottom: 50, alignSelf: "center" },
  captureButton: { 
    width: 70, height: 70, borderRadius: 35, 
    backgroundColor: "#1E40AF", justifyContent: "center", 
    alignItems: "center", shadowColor: "#1E40AF", shadowRadius: 15, shadowOpacity: 0.5 
  },
  errorText: { color: "white", textAlign: "center", marginTop: 50 }
});

