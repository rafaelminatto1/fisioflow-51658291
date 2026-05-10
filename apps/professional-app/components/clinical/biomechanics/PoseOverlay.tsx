import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Svg, { Line, Circle, Polyline, G, Rect, Text as SvgText } from "react-native-svg";
import { Landmark, calculateAngle, getAngleStatus, calculateVerticalAngle, calculateSymmetry } from "../../../utils/pose-utils";
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

export const PoseOverlay: React.FC<PoseOverlayProps> = ({ pose, width, height, pathHistory }) => {
  if (!pose) return null;

  const renderPath = (jointKey: string, points: { x: number; y: number }[]) => {
    if (points.length < 2) return null;
    
    return (
      <Polyline
        key={`path-${jointKey}`}
        points={points.map(p => `${p.x * width},${p.y * height}`).join(" ")}
        fill="none"
        stroke="#fbbf24"
        strokeWidth="2"
        strokeDasharray="4 2"
        opacity={0.8}
      />
    );
  };

  const renderConnection = (fromKey: string, toKey: string) => {
    const from = pose[fromKey];
    const to = pose[toKey];

    if (!from || !to || from.score < 0.5 || to.score < 0.5) return null;

    return (
      <Line
        key={`${fromKey}-${toKey}`}
        x1={from.x * width}
        y1={from.y * height}
        x2={to.x * width}
        y2={to.y * height}
        stroke="#00f2ff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.6}
      />
    );
  };

  const renderJoint = (key: string) => {
    const p = pose[key];
    if (!p || p.score < 0.5) return null;

    return (
      <Circle
        key={key}
        cx={p.x * width}
        cy={p.y * height}
        r="4"
        fill="#00f2ff"
        stroke="white"
        strokeWidth="1"
      />
    );
  };

  const renderAngle = (p1Key: string, p2Key: string, p3Key: string, label: string) => {
    const p1 = pose[p1Key];
    const p2 = pose[p2Key];
    const p3 = pose[p3Key];

    if (!p1 || !p2 || !p3 || p1.score < 0.5 || p2.score < 0.5 || p3.score < 0.5) return null;

    const angle = calculateAngle(p1, p2, p3);
    return renderAngleLabel(angle, label, p2.x, p2.y);
  };

  const renderVerticalAngle = (p1Key: string, p2Key: string, label: string) => {
    const p1 = pose[p1Key];
    const p2 = pose[p2Key];

    if (!p1 || !p2 || p1.score < 0.5 || p2.score < 0.5) return null;

    const angle = calculateVerticalAngle(p1, p2);
    return renderAngleLabel(angle, label, p2.x, p2.y);
  };

  const renderAngleLabel = (angle: number, label: string, xNorm: number, yNorm: number) => {
    const ref = REFERENCE_ANGLES[label] || { reference: 0, tolerance: 5 };
    const status = getAngleStatus(angle, ref.reference, ref.tolerance);
    const color = STATUS_COLORS[status];
    
    const x = xNorm * width;
    const y = yNorm * height;

    return (
      <React.Fragment key={`angle-${label}-${xNorm}`}>
        <Circle cx={x} cy={y} r="15" fill={color} opacity={0.2} />
        <SvgText
          x={x + 12}
          y={y - 12}
          fill={color}
          fontSize="14"
          fontWeight="bold"
          stroke="black"
          strokeWidth="0.3"
        >
          {`${Math.round(angle)}°`}
        </SvgText>
      </React.Fragment>
    );
  };

  const renderSymmetry = () => {
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

    return (
      <G x={width / 2 - 60} y={60}>
        <Rect width="120" height="30" rx="15" fill="rgba(0,0,0,0.6)" />
        <SvgText
          x="60"
          y="20"
          fill={asymmetry > 15 ? "#ef4444" : "#fbbf24"}
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
        >
          {`Assimetria: ${asymmetry}%`}
        </SvgText>
      </G>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill}>
        {/* Rastreio de Trajetória */}
        {pathHistory && Object.entries(pathHistory).map(([key, points]) => 
          renderPath(key, points)
        )}

        {renderSymmetry()}

        {CONNECTIONS.map(([from, to]) => renderConnection(from, to))}
        {Object.keys(pose).map((key) => renderJoint(key))}
        
        {/* Ângulos Críticos */}
        {renderAngle("leftHip", "leftKnee", "leftAnkle", "joelho_flex")}
        {renderAngle("rightHip", "rightKnee", "rightAnkle", "joelho_flex")}
        
        {/* Inclinação de Tronco (Vertical) */}
        {renderVerticalAngle("leftShoulder", "leftHip", "tronco_inclinacao")}
      </Svg>
    </View>
  );
};
