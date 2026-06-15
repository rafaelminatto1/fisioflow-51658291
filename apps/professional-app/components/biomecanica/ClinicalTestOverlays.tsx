import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Line, Rect, Circle, G } from "react-native-svg";
import { bio, font } from "@/constants/biomecanica";

interface OverlayProps {
  points: { x: number; y: number }[];
}

export function TrendelenburgOverlay({ points }: OverlayProps) {
  // Expectations: Point 0 (Left Hip), Point 1 (Right Hip)
  if (points.length < 2) return null;

  const p1 = points[0];
  const p2 = points[1];

  // Calculate angle of the line between hips
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const isPositive = Math.abs(angle) > 5;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg height="100%" width="100%">
        <G opacity={0.8}>
          <Line
            x1={p1.x - 50}
            y1={p1.y}
            x2={p2.x + 50}
            y2={p1.y}
            stroke="white"
            strokeWidth={1}
            strokeDasharray="5 5"
          />
          <Line
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={isPositive ? "#EF4444" : bio.primary}
            strokeWidth={4}
          />
          <Circle cx={p1.x} cy={p1.y} r={6} fill={isPositive ? "#EF4444" : bio.primary} />
          <Circle cx={p2.x} cy={p2.y} r={6} fill={isPositive ? "#EF4444" : bio.primary} />
        </G>
      </Svg>
      <View
        style={[
          styles.badge,
          {
            top: p1.y - 40,
            left: (p1.x + p2.x) / 2 - 40,
            backgroundColor: isPositive ? "#EF4444" : "#10B981",
          },
        ]}
      >
        <Text style={styles.badgeText}>
          {Math.abs(angle).toFixed(1)}° {isPositive ? "DROP" : "OK"}
        </Text>
      </View>
    </View>
  );
}

export function ValgusOverlay({ points }: OverlayProps) {
  // Expectations: Point 0 (Hip), Point 1 (Knee), Point 2 (Ankle)
  if (points.length < 3) return null;

  const [p1, p2, p3] = points;

  // Angle at knee
  const a = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2);
  const b = Math.pow(p2.x - p3.x, 2) + Math.pow(p2.y - p3.y, 2);
  const c = Math.pow(p3.x - p1.x, 2) + Math.pow(p3.y - p1.y, 2);
  const angle = Math.acos((a + b - c) / Math.sqrt(4 * a * b)) * (180 / Math.PI);

  const isPositive = angle < 170; // Medial collapse

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg height="100%" width="100%">
        <G opacity={0.8}>
          <Line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={bio.primary} strokeWidth={3} />
          <Line x1={p2.x} y1={p2.y} x2={p3.x} y2={p3.y} stroke={bio.primary} strokeWidth={3} />
          <Circle cx={p2.x} cy={p2.y} r={8} fill={isPositive ? "#EF4444" : "#10B981"} />
        </G>
      </Svg>
      <View
        style={[
          styles.badge,
          { top: p2.y, left: p2.x + 20, backgroundColor: isPositive ? "#EF4444" : "#10B981" },
        ]}
      >
        <Text style={styles.badgeText}>{isPositive ? "VALGO" : "ALINHADO"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: font.extrabold,
  },
});
