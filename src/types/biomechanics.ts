export interface Point {
  x: number;
  y: number;
}

export interface TrajectoryPoint extends Point {
  frame: number;
}

export interface GaitEvent {
  type: "contact" | "toe-off";
  frame: number;
  side: "L" | "R";
}

export interface TrackedTraj {
  points: TrajectoryPoint[];
  color: string;
  label: string;
  keypointIdx: number | null; // null = manual tracking
}

export const KP_NAMES = [
  "Nariz",
  "Olho E",
  "Olho D",
  "Orelha E",
  "Orelha D",
  "Ombro E",
  "Ombro D",
  "Cotovelo E",
  "Cotovelo D",
  "Punho E",
  "Punho D",
  "Quadril E",
  "Quadril D",
  "Joelho E",
  "Joelho D",
  "Tornozelo E",
  "Tornozelo D",
];

export const KP_GROUPS = [
  { label: "Cabeça", indices: [0, 1, 2, 3, 4] },
  { label: "Tronco", indices: [5, 6, 11, 12] },
  { label: "Braços", indices: [7, 8, 9, 10] },
  { label: "Pernas", indices: [13, 14, 15, 16] },
];

export const TRAJ_COLORS = ["#ff6b35", "#ffd700", "#00ff88", "#ff69b4", "#00cfff", "#c084fc"];

export interface JumpMetrics {
  height: string;
  flightTime: string;
  peakPower: string | null;
}

export interface GaitMetrics {
  cadenceVal: number;
  cadence: string;
  oscillationCm: number;
  oscillation: string;
  legStiffness: string | null;
  kvert: string | null;
  tcMs: string;
  tfMs: string;
}

export interface JointAngle {
  name: string;
  value: number;
  label: string;
  color: string;
  p1: Point;
  center: Point;
  p2: Point;
}

export type FunctionalTestType = "y-balance" | "hop-test" | "less" | "squat" | "lunge";

export interface FunctionalAssessment {
  type: FunctionalTestType;
  status: "not_started" | "in_progress" | "completed";
  score: number | null;
  asymmetry: number | null;
  observations: string[];
  metrics: Record<string, any>;
}
