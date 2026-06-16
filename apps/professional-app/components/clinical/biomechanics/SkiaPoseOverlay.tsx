import React from "react";
import { StyleSheet } from "react-native";
import { Canvas, Line, Circle, Path, Skia, vec, Text, useFont } from "@shopify/react-native-skia";
import {
  calculateAngle,
  getAngleStatus,
  calculateVerticalAngle,
  calculateSymmetry,
} from "../../../utils/pose-utils";
import { REFERENCE_ANGLES } from "../../../types/biomechanics";

interface PoseOverlayProps {
  pose: any;
  width: number;
  height: number;
  pathHistory?: Record<string, { x: number; y: number }[]>;
}

const CONNECTIONS = [
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"],
  ["leftHip", "rightHip"],
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
];

const STATUS_COLORS = {
  ok: "#00f2ff", // Cyan
  warning: "#fbbf24", // Amber
  alert: "#ef4444", // Red
};

export const SkiaPoseOverlay: React.FC<PoseOverlayProps> = ({ pose, width, height, pathHistory }) => {
  if (!pose) return null;

  const renderPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return null;
    const path = Skia.Path.Make();
    path.moveTo(points[0].x * width, points[0].y * height);
    for (let i = 1; i < points.length; i++) {
      path.lineTo(points[i].x * width, points[i].y * height);
    }
    return path;
  };

  const getSymmetryAsymmetry = () => {
    const lH = pose.leftHip;
    const lK = pose.leftKnee;
    const lA = pose.leftAnkle;
    const rH = pose.rightHip;
    const rK = pose.rightKnee;
    const rA = pose.rightAnkle;

    if (!lH || !lK || !lA || !rH || !rK || !rA) return null;
    if (lK.score < 0.5 || rK.score < 0.5) return null;

    const leftAngle = calculateAngle(lH, lK, lA);
    const rightAngle = calculateAngle(rH, rK, rA);
    const asymmetry = calculateSymmetry(leftAngle, rightAngle);

    if (asymmetry < 5) return null;
    return asymmetry;
  };

  const asymmetry = getSymmetryAsymmetry();

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Rastreio de Trajetória */}
      {pathHistory &&
        Object.values(pathHistory).map((points, index) => {
          const path = renderPath(points);
          if (!path) return null;
          return (
            <Path
              key={`path-${index}`}
              path={path}
              color="#fbbf24"
              style="stroke"
              strokeWidth={2}
              opacity={0.8}
            />
          );
        })}

      {/* Conexões (Esqueleto) */}
      {CONNECTIONS.map(([fromKey, toKey]) => {
        const from = pose[fromKey];
        const to = pose[toKey];
        if (!from || !to || from.score < 0.5 || to.score < 0.5) return null;

        return (
          <Line
            key={`${fromKey}-${toKey}`}
            p1={vec(from.x * width, from.y * height)}
            p2={vec(to.x * width, to.y * height)}
            color="#00f2ff"
            strokeWidth={2}
          />
        );
      })}

      {/* Landmarks (Juntas) */}
      {Object.keys(pose).map((key) => {
        const p = pose[key];
        if (!p || p.score < 0.5) return null;
        return (
          <Circle
            key={`joint-${key}`}
            c={vec(p.x * width, p.y * height)}
            r={4}
            color="#00f2ff"
          />
        );
      })}

      {/* Ângulos Visuais - Podemos desenhar os círculos dos ângulos */}
      {["left", "right"].map((side) => {
        const hip = pose[`${side}Hip`];
        const knee = pose[`${side}Knee`];
        const ankle = pose[`${side}Ankle`];

        if (!hip || !knee || !ankle || hip.score < 0.5 || knee.score < 0.5 || ankle.score < 0.5) return null;

        const angle = calculateAngle(hip, knee, ankle);
        const ref = REFERENCE_ANGLES["joelho_flex"] || { reference: 0, tolerance: 5 };
        const status = getAngleStatus(angle, ref.reference, ref.tolerance);
        const color = STATUS_COLORS[status];

        return (
          <Circle
            key={`angle-${side}-knee`}
            c={vec(knee.x * width, knee.y * height)}
            r={15}
            color={color}
            opacity={0.5}
          />
        );
      })}
    </Canvas>
  );
};
