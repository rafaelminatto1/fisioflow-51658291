import React from "react";
import { StyleSheet, View, Text } from "react-native";
import Svg, { Line, Circle } from "react-native-svg";
import Animated, { useAnimatedStyle, SharedValue } from "react-native-reanimated";

interface Point {
  x: number;
  y: number;
  score: number;
}

interface PoseTrackerOverlayProps {
  pose: Record<string, Point> | null;
  status: "ok" | "warn" | "crit";
  message?: string;
}

const EDGES = [
  ["shoulder_left", "shoulder_right"],
  ["shoulder_left", "elbow_left"],
  ["elbow_left", "wrist_left"],
  ["shoulder_right", "elbow_right"],
  ["elbow_right", "wrist_right"],
  ["shoulder_left", "hip_left"],
  ["shoulder_right", "hip_right"],
  ["hip_left", "hip_right"],
  ["hip_left", "knee_left"],
  ["knee_left", "ankle_left"],
  ["hip_right", "knee_right"],
  ["knee_right", "ankle_right"],
];

export function PoseTrackerOverlay({ pose, status, message }: PoseTrackerOverlayProps) {
  if (!pose) return null;

  const getColor = () => {
    switch (status) {
      case "ok":
        return "#10B981";
      case "warn":
        return "#F59E0B";
      case "crit":
        return "#EF4444";
      default:
        return "#fff";
    }
  };

  const color = getColor();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Draw Edges */}
        {EDGES.map(([a, b], i) => {
          const p1 = pose[a];
          const p2 = pose[b];
          if (!p1 || !p2 || p1.score < 0.5 || p2.score < 0.5) return null;
          return (
            <Line
              key={`edge-${i}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={color}
              strokeWidth="1"
              opacity={0.6}
            />
          );
        })}

        {/* Draw Joints */}
        {Object.entries(pose).map(([name, p], i) => {
          if (p.score < 0.5) return null;
          return (
            <Circle
              key={`joint-${i}`}
              cx={p.x}
              cy={p.y}
              r="1.5"
              fill={color}
              stroke="#fff"
              strokeWidth="0.5"
            />
          );
        })}
      </Svg>

      {message && (
        <View style={[styles.messageContainer, { backgroundColor: color + "CC" }]}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  messageText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
