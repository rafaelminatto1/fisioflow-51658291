import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { G, Path, Circle, Rect } from "react-native-svg";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";

export interface PainPoint {
  id: string;
  region: string;
  x: number;
  y: number;
  intensity: number;
  side: "front" | "back";
}

export interface PainMapProps {
  painPoints: PainPoint[];
  onAddPoint: (point: Omit<PainPoint, "id">) => void;
  onRemovePoint: (id: string) => void;
  onUpdateIntensity: (id: string, intensity: number) => void;
  editable?: boolean;
  view: "front" | "back";
}

const INTENSITY_COLORS = [
  "#22C55E",
  "#4ADE80",
  "#86EFAC",
  "#FDE047",
  "#FACC15",
  "#FB923C",
  "#F97316",
  "#EF4444",
  "#DC2626",
  "#991B1B",
];

function intensityColor(intensity: number): string {
  return INTENSITY_COLORS[Math.max(0, Math.min(9, intensity - 1))];
}

const BODY_WIDTH = 200;
const BODY_HEIGHT = 440;

interface RegionDef {
  id: string;
  label: string;
  path: string;
  centerX: number;
  centerY: number;
}

const FRONT_REGIONS: RegionDef[] = [
  {
    id: "head",
    label: "Cabeça",
    path: "M85,8 Q100,0 115,8 Q124,18 124,32 Q124,46 115,52 Q100,58 85,52 Q76,46 76,32 Q76,18 85,8 Z",
    centerX: 100,
    centerY: 30,
  },
  {
    id: "neck_front",
    label: "Pescoço",
    path: "M90,52 L110,52 L110,70 L90,70 Z",
    centerX: 100,
    centerY: 61,
  },
  {
    id: "shoulder_l",
    label: "Ombro E",
    path: "M60,72 L90,72 L90,90 L60,95 Q48,92 44,85 Q42,78 48,74 Z",
    centerX: 68,
    centerY: 83,
  },
  {
    id: "shoulder_r",
    label: "Ombro D",
    path: "M110,72 L140,72 Q152,74 156,85 Q158,92 148,95 L110,90 L110,72 Z",
    centerX: 132,
    centerY: 83,
  },
  {
    id: "upper_arm_l",
    label: "Bíceps E",
    path: "M44,96 L64,94 L66,144 L46,146 Z",
    centerX: 55,
    centerY: 120,
  },
  {
    id: "upper_arm_r",
    label: "Bíceps D",
    path: "M136,94 L156,96 L154,146 L134,144 Z",
    centerX: 145,
    centerY: 120,
  },
  {
    id: "chest",
    label: "Peito",
    path: "M90,72 L110,72 L112,110 L88,110 Z",
    centerX: 100,
    centerY: 91,
  },
  {
    id: "elbow_l",
    label: "Cotovelo E",
    path: "M46,146 L66,144 L67,164 L47,166 Z",
    centerX: 56,
    centerY: 155,
  },
  {
    id: "elbow_r",
    label: "Cotovelo D",
    path: "M134,144 L154,146 L153,166 L133,164 Z",
    centerX: 144,
    centerY: 155,
  },
  {
    id: "forearm_l",
    label: "Antebraço E",
    path: "M47,166 L67,164 L69,216 L49,218 Z",
    centerX: 58,
    centerY: 191,
  },
  {
    id: "forearm_r",
    label: "Antebraço D",
    path: "M133,164 L153,166 L151,218 L131,216 Z",
    centerX: 142,
    centerY: 191,
  },
  {
    id: "abdomen",
    label: "Abdômen",
    path: "M88,112 L112,112 L112,170 L88,170 Z",
    centerX: 100,
    centerY: 141,
  },
  {
    id: "wrist_l",
    label: "Punho E",
    path: "M49,218 L69,216 L70,234 L50,236 Z",
    centerX: 60,
    centerY: 226,
  },
  {
    id: "wrist_r",
    label: "Punho D",
    path: "M131,216 L151,218 L150,236 L130,234 Z",
    centerX: 140,
    centerY: 226,
  },
  {
    id: "hand_l",
    label: "Mão E",
    path: "M50,236 L70,234 L72,262 L68,268 L58,268 L48,262 Z",
    centerX: 60,
    centerY: 252,
  },
  {
    id: "hand_r",
    label: "Mão D",
    path: "M130,234 L150,236 L152,262 L142,268 L132,268 L128,262 Z",
    centerX: 140,
    centerY: 252,
  },
  {
    id: "hip_l",
    label: "Quadril E",
    path: "M88,172 L100,172 L100,210 L82,210 L78,195 Z",
    centerX: 90,
    centerY: 192,
  },
  {
    id: "hip_r",
    label: "Quadril D",
    path: "M100,172 L112,172 L122,195 L118,210 L100,210 Z",
    centerX: 110,
    centerY: 192,
  },
  {
    id: "thigh_l",
    label: "Coxa E",
    path: "M78,212 L100,212 L100,300 L74,300 Z",
    centerX: 88,
    centerY: 256,
  },
  {
    id: "thigh_r",
    label: "Coxa D",
    path: "M100,212 L122,212 L126,300 L100,300 Z",
    centerX: 112,
    centerY: 256,
  },
  {
    id: "knee_l",
    label: "Joelho E",
    path: "M74,302 L100,302 L100,330 L72,330 Z",
    centerX: 86,
    centerY: 316,
  },
  {
    id: "knee_r",
    label: "Joelho D",
    path: "M100,302 L126,302 L128,330 L100,330 Z",
    centerX: 114,
    centerY: 316,
  },
  {
    id: "shin_l",
    label: "Panturrilha E",
    path: "M72,332 L100,332 L100,400 L76,400 Z",
    centerX: 86,
    centerY: 366,
  },
  {
    id: "shin_r",
    label: "Panturrilha D",
    path: "M100,332 L128,332 L124,400 L100,400 Z",
    centerX: 114,
    centerY: 366,
  },
  {
    id: "ankle_l",
    label: "Tornozelo E",
    path: "M76,402 L100,402 L100,420 L74,420 Z",
    centerX: 86,
    centerY: 411,
  },
  {
    id: "ankle_r",
    label: "Tornozelo D",
    path: "M100,402 L124,402 L126,420 L100,420 Z",
    centerX: 114,
    centerY: 411,
  },
  {
    id: "foot_l",
    label: "Pé E",
    path: "M74,420 L100,420 L102,436 L70,436 Z",
    centerX: 86,
    centerY: 428,
  },
  {
    id: "foot_r",
    label: "Pé D",
    path: "M100,420 L126,420 L130,436 L98,436 Z",
    centerX: 114,
    centerY: 428,
  },
];

const BACK_REGIONS: RegionDef[] = [
  {
    id: "head_back",
    label: "Cabeça",
    path: "M85,8 Q100,0 115,8 Q124,18 124,32 Q124,46 115,52 Q100,58 85,52 Q76,46 76,32 Q76,18 85,8 Z",
    centerX: 100,
    centerY: 30,
  },
  {
    id: "neck_back",
    label: "Pescoço",
    path: "M90,52 L110,52 L110,70 L90,70 Z",
    centerX: 100,
    centerY: 61,
  },
  {
    id: "shoulder_l_back",
    label: "Ombro E",
    path: "M60,72 L90,72 L90,90 L60,95 Q48,92 44,85 Q42,78 48,74 Z",
    centerX: 68,
    centerY: 83,
  },
  {
    id: "shoulder_r_back",
    label: "Ombro D",
    path: "M110,72 L140,72 Q152,74 156,85 Q158,92 148,95 L110,90 L110,72 Z",
    centerX: 132,
    centerY: 83,
  },
  {
    id: "upper_back",
    label: "Costas Superiores",
    path: "M88,72 L112,72 L112,130 L88,130 Z",
    centerX: 100,
    centerY: 101,
  },
  {
    id: "upper_arm_l_back",
    label: "Bíceps E",
    path: "M44,96 L64,94 L66,144 L46,146 Z",
    centerX: 55,
    centerY: 120,
  },
  {
    id: "upper_arm_r_back",
    label: "Bíceps D",
    path: "M136,94 L156,96 L154,146 L134,144 Z",
    centerX: 145,
    centerY: 120,
  },
  {
    id: "elbow_l_back",
    label: "Cotovelo E",
    path: "M46,146 L66,144 L67,164 L47,166 Z",
    centerX: 56,
    centerY: 155,
  },
  {
    id: "elbow_r_back",
    label: "Cotovelo D",
    path: "M134,144 L154,146 L153,166 L133,164 Z",
    centerX: 144,
    centerY: 155,
  },
  {
    id: "lower_back",
    label: "Lombar",
    path: "M88,132 L112,132 L112,180 L88,180 Z",
    centerX: 100,
    centerY: 156,
  },
  {
    id: "forearm_l_back",
    label: "Antebraço E",
    path: "M47,166 L67,164 L69,216 L49,218 Z",
    centerX: 58,
    centerY: 191,
  },
  {
    id: "forearm_r_back",
    label: "Antebraço D",
    path: "M133,164 L153,166 L151,218 L131,216 Z",
    centerX: 142,
    centerY: 191,
  },
  {
    id: "wrist_l_back",
    label: "Punho E",
    path: "M49,218 L69,216 L70,234 L50,236 Z",
    centerX: 60,
    centerY: 226,
  },
  {
    id: "wrist_r_back",
    label: "Punho D",
    path: "M131,216 L151,218 L150,236 L130,234 Z",
    centerX: 140,
    centerY: 226,
  },
  {
    id: "hand_l_back",
    label: "Mão E",
    path: "M50,236 L70,234 L72,262 L68,268 L58,268 L48,262 Z",
    centerX: 60,
    centerY: 252,
  },
  {
    id: "hand_r_back",
    label: "Mão D",
    path: "M130,234 L150,236 L152,262 L142,268 L132,268 L128,262 Z",
    centerX: 140,
    centerY: 252,
  },
  {
    id: "hip_l_back",
    label: "Glúteo E",
    path: "M88,182 L100,182 L100,220 L82,220 L78,200 Z",
    centerX: 90,
    centerY: 200,
  },
  {
    id: "hip_r_back",
    label: "Glúteo D",
    path: "M100,182 L112,182 L122,200 L118,220 L100,220 Z",
    centerX: 110,
    centerY: 200,
  },
  {
    id: "thigh_l_back",
    label: "Coxa E",
    path: "M78,222 L100,222 L100,300 L74,300 Z",
    centerX: 88,
    centerY: 261,
  },
  {
    id: "thigh_r_back",
    label: "Coxa D",
    path: "M100,222 L122,222 L126,300 L100,300 Z",
    centerX: 112,
    centerY: 261,
  },
  {
    id: "knee_l_back",
    label: "Joelho E",
    path: "M74,302 L100,302 L100,330 L72,330 Z",
    centerX: 86,
    centerY: 316,
  },
  {
    id: "knee_r_back",
    label: "Joelho D",
    path: "M100,302 L126,302 L128,330 L100,330 Z",
    centerX: 114,
    centerY: 316,
  },
  {
    id: "shin_l_back",
    label: "Panturrilha E",
    path: "M72,332 L100,332 L100,400 L76,400 Z",
    centerX: 86,
    centerY: 366,
  },
  {
    id: "shin_r_back",
    label: "Panturrilha D",
    path: "M100,332 L128,332 L124,400 L100,400 Z",
    centerX: 114,
    centerY: 366,
  },
  {
    id: "ankle_l_back",
    label: "Tornozelo E",
    path: "M76,402 L100,402 L100,420 L74,420 Z",
    centerX: 86,
    centerY: 411,
  },
  {
    id: "ankle_r_back",
    label: "Tornozelo D",
    path: "M100,402 L124,402 L126,420 L100,420 Z",
    centerX: 114,
    centerY: 411,
  },
  {
    id: "foot_l_back",
    label: "Pé E",
    path: "M74,420 L100,420 L102,436 L70,436 Z",
    centerX: 86,
    centerY: 428,
  },
  {
    id: "foot_r_back",
    label: "Pé D",
    path: "M100,420 L126,420 L130,436 L98,436 Z",
    centerX: 114,
    centerY: 428,
  },
];

function IntensityPicker({
  visible,
  region,
  currentValue,
  onSelect,
  onDismiss,
  colors,
}: {
  visible: boolean;
  region: string;
  currentValue: number;
  onSelect: (v: number) => void;
  onDismiss: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const { selection, medium } = useHaptics();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.modalOverlay} onPress={onDismiss}>
        <Pressable
          style={[
            styles.pickerCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => {}}
        >
          <Text style={[styles.pickerTitle, { color: colors.text }]}>Intensidade — {region}</Text>
          <View style={styles.intensityGrid}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
              <TouchableOpacity
                key={v}
                style={[
                  styles.intensityBtn,
                  {
                    backgroundColor: currentValue === v ? intensityColor(v) : colors.surfaceHover,
                    borderColor: intensityColor(v),
                  },
                ]}
                onPress={() => {
                  selection();
                  onSelect(v);
                }}
                accessibilityLabel={`Intensidade ${v}`}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.intensityBtnText,
                    { color: currentValue === v ? "#FFFFFF" : colors.text },
                  ]}
                >
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function PainMap({
  painPoints,
  onAddPoint,
  onRemovePoint,
  onUpdateIntensity,
  editable = true,
  view,
}: PainMapProps) {
  const colors = useColors();
  const { light, selection } = useHaptics();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeRegion, setActiveRegion] = useState<RegionDef | null>(null);
  const [activePointId, setActivePointId] = useState<string | null>(null);

  const regions = view === "front" ? FRONT_REGIONS : BACK_REGIONS;
  const visiblePoints = painPoints.filter((p) => p.side === view);

  const handleRegionPress = useCallback(
    (region: RegionDef) => {
      if (!editable) return;
      light();
      const existing = visiblePoints.find((p) => p.region === region.id);
      if (existing) {
        setActivePointId(existing.id);
        setActiveRegion(region);
        setPickerVisible(true);
      } else {
        setActivePointId(null);
        setActiveRegion(region);
        setPickerVisible(true);
      }
    },
    [editable, visiblePoints, light],
  );

  const handleIntensitySelect = useCallback(
    (intensity: number) => {
      if (!activeRegion) return;
      if (activePointId) {
        onUpdateIntensity(activePointId, intensity);
      } else {
        onAddPoint({
          region: activeRegion.id,
          x: activeRegion.centerX / BODY_WIDTH,
          y: activeRegion.centerY / BODY_HEIGHT,
          intensity,
          side: view,
        });
      }
      setPickerVisible(false);
      setActiveRegion(null);
      setActivePointId(null);
    },
    [activeRegion, activePointId, view, onAddPoint, onUpdateIntensity],
  );

  const handlePointPress = useCallback(
    (point: PainPoint) => {
      if (!editable) return;
      selection();
      const region = regions.find((r) => r.id === point.region);
      if (region) {
        setActivePointId(point.id);
        setActiveRegion(region);
        setPickerVisible(true);
      }
    },
    [editable, regions, selection],
  );

  const handleRemovePoint = useCallback(
    (id: string) => {
      onRemovePoint(id);
      setPickerVisible(false);
      setActiveRegion(null);
      setActivePointId(null);
    },
    [onRemovePoint],
  );

  const screenWidth = Dimensions.get("window").width;
  const svgScale = Math.min((screenWidth - 32) / BODY_WIDTH, 1);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <View style={styles.bodyWrapper}>
        <Svg
          width={BODY_WIDTH * svgScale}
          height={BODY_HEIGHT * svgScale}
          viewBox={`0 0 ${BODY_WIDTH} ${BODY_HEIGHT}`}
        >
          <G scale={svgScale}>
            {regions.map((region) => {
              const point = visiblePoints.find((p) => p.region === region.id);
              const fill = point ? intensityColor(point.intensity) + "40" : "transparent";
              const stroke = point ? intensityColor(point.intensity) : colors.border;
              return (
                <Path
                  key={region.id}
                  d={region.path}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={point ? 2 : 1}
                  onPress={() => handleRegionPress(region)}
                />
              );
            })}

            {visiblePoints.map((point) => {
              const region = regions.find((r) => r.id === point.region);
              if (!region) return null;
              return (
                <G key={point.id} onPress={() => handlePointPress(point)}>
                  <Circle
                    cx={region.centerX}
                    cy={region.centerY}
                    r={10}
                    fill={intensityColor(point.intensity)}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    opacity={0.9}
                  />
                </G>
              );
            })}
          </G>
        </Svg>
      </View>

      {visiblePoints.length > 0 && (
        <View style={[styles.legend, { borderTopColor: colors.border }]}>
          <Text style={[styles.legendTitle, { color: colors.text }]}>Pontos de dor</Text>
          {visiblePoints.map((point) => {
            const region = regions.find((r) => r.id === point.region);
            return (
              <View key={point.id} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: intensityColor(point.intensity) }]}
                />
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
                  {region?.label || point.region} — {point.intensity}/10
                </Text>
                {editable && (
                  <TouchableOpacity
                    onPress={() => handleRemovePoint(point.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel={`Remover ${region?.label}`}
                  >
                    <Text style={[styles.removeBtn, { color: colors.error }]}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      <IntensityPicker
        visible={pickerVisible}
        region={activeRegion?.label || ""}
        currentValue={
          activePointId ? visiblePoints.find((p) => p.id === activePointId)?.intensity || 5 : 5
        }
        onSelect={handleIntensitySelect}
        onDismiss={() => {
          setPickerVisible(false);
          setActiveRegion(null);
          setActivePointId(null);
        }}
        colors={colors}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  bodyWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  legend: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
  },
  removeBtn: {
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  pickerCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  intensityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  intensityBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  intensityBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
