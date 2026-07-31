import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import Svg, { Path, Line, Circle } from "react-native-svg";
import { Camera, Compass, RotateCcw, CheckCircle2 } from "lucide-react-native";

export interface PostureCaptureGuideProps {
  viewMode?: "anterior" | "posterior" | "sagittal";
  onCapture?: (mode: string) => void;
  onModeChange?: (mode: "anterior" | "posterior" | "sagittal") => void;
}

export const PostureCaptureGuide: React.FC<PostureCaptureGuideProps> = ({
  viewMode = "anterior",
  onCapture,
  onModeChange,
}) => {
  const [currentMode, setCurrentMode] = useState<"anterior" | "posterior" | "sagittal">(viewMode);

  // Nível bolha simulado (em produção lê acelerômetro/gyro)
  const isLevel = true;

  const handleSelectMode = (mode: "anterior" | "posterior" | "sagittal") => {
    setCurrentMode(mode);
    onModeChange?.(mode);
  };

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      {/* Level Bubble HUD */}
      <View style={styles.topHud}>
        <View style={[styles.levelBadge, isLevel ? styles.levelOk : styles.levelWarn]}>
          <Compass color={isLevel ? "#34d399" : "#fbbf24"} size={16} />
          <Text style={[styles.levelText, { color: isLevel ? "#34d399" : "#fbbf24" }]}>
            {isLevel ? "Câmera Perpendicular 90°" : "Ajuste a inclinação do iPhone"}
          </Text>
        </View>
      </View>

      {/* Silhouette SVG Overlay */}
      <View style={styles.silhouetteArea} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 300 500">
          {/* Eixo Central de Plumo */}
          <Line x1="150" y1="20" x2="150" y2="480" stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="5, 5" opacity={0.8} />

          {/* Eixos Horizontais de Referência (Ombros, Bacia, Joelhos) */}
          <Line x1="40" y1="120" x2="260" y2="120" stroke="#06b6d4" strokeWidth="1" opacity={0.6} />
          <Line x1="60" y1="240" x2="240" y2="240" stroke="#06b6d4" strokeWidth="1" opacity={0.6} />
          <Line x1="70" y1="360" x2="230" y2="360" stroke="#06b6d4" strokeWidth="1" opacity={0.6} />

          {/* Silhueta Guiada */}
          <Path
            d={
              currentMode === "sagittal"
                ? "M150,50 C165,50 170,70 160,90 C155,100 175,130 170,180 C165,230 160,250 155,300 C150,350 155,420 150,470"
                : "M150,50 C170,50 190,80 210,110 C215,160 195,230 190,260 L195,370 L190,470 M150,50 C130,50 110,80 90,110 C85,160 105,230 110,260 L105,370 L110,470"
            }
            fill="none"
            stroke="#2dd4bf"
            strokeWidth="2.5"
            opacity={0.4}
          />
        </Svg>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <View style={styles.modeSelector}>
          {(["anterior", "sagittal", "posterior"] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeButton, currentMode === m && styles.modeButtonActive]}
              onPress={() => handleSelectMode(m)}
            >
              <Text style={[styles.modeText, currentMode === m && styles.modeTextActive]}>
                {m === "anterior" ? "Anterior" : m === "sagittal" ? "Perfil" : "Posterior"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.captureBtn} onPress={() => onCapture?.(currentMode)}>
          <Camera color="#0f172a" size={24} />
          <Text style={styles.captureText}>Capturar Foto Alinhada</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 40,
  },
  topHud: {
    alignItems: "center",
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
  },
  levelOk: {
    borderColor: "rgba(52, 211, 153, 0.4)",
  },
  levelWarn: {
    borderColor: "rgba(251, 191, 36, 0.4)",
  },
  levelText: {
    fontSize: 11,
    fontWeight: "600",
  },
  silhouetteArea: {
    width: "100%",
    height: 420,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomControls: {
    width: "90%",
    alignItems: "center",
    gap: 12,
  },
  modeSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderRadius: 25,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(51, 65, 85, 0.8)",
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modeButtonActive: {
    backgroundColor: "#2dd4bf",
  },
  modeText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
  },
  modeTextActive: {
    color: "#0f172a",
    fontWeight: "700",
  },
  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2dd4bf",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  captureText: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
  },
});
