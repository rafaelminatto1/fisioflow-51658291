import { Point, GaitEvent, GaitMetrics, JumpMetrics } from "../types/biomechanics";

export const oscillationZone = (val: number) => {
  if (val < 5) return { color: "text-blue-400", label: "Baixa", bg: "bg-blue-400/10" };
  if (val <= 10) return { color: "text-green-500", label: "Ideal", bg: "bg-green-500/10" };
  return { color: "text-amber-500", label: "Ineficiente", bg: "bg-amber-500/10" };
};

export const cadenceZone = (val: number) => {
  if (val >= 180) return { color: "text-green-500", label: "Elite" };
  if (val >= 160) return { color: "text-amber-400", label: "Moderada" };
  return { color: "text-red-500", label: "Baixa" };
};

export const powerZone = (val: number) => {
  if (val >= 4000) return { color: "text-green-500", label: "Alto" };
  if (val >= 2500) return { color: "text-blue-400", label: "Médio" };
  return { color: "text-muted-foreground", label: "Baixo" };
};

export const calcJumpMetrics = (
  takeoff: number | undefined,
  landing: number | undefined,
  fps: number,
  patientMass: number | null,
): JumpMetrics | null => {
  if (takeoff == null || landing == null) return null;
  const flightTime = (landing - takeoff) / fps;
  const heightM = (9.81 * Math.pow(flightTime, 2)) / 8; // Bosco 1983
  const heightCm = heightM * 100;
  const peakPower =
    patientMass != null
      ? Math.max(0, 60.7 * heightCm + 45.3 * patientMass - 2055) // Sayers 1999
      : null;
  return {
    height: heightCm.toFixed(1),
    flightTime: (flightTime * 1000).toFixed(0),
    peakPower: peakPower?.toFixed(0) ?? null,
  };
};

export const calcGaitMetrics = (
  events: GaitEvent[],
  fps: number,
  patientMass: number | null,
  legLength: number | null,
  runSpeed: number,
): GaitMetrics | null => {
  const sorted = [...events].sort((a, b) => a.frame - b.frame);
  let tc = 0,
    tf = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const e1 = sorted[i],
      e2 = sorted[i + 1];
    if (e1.type === "contact" && e2.type === "toe-off") tc = (e2.frame - e1.frame) / fps;
    else if (e1.type === "toe-off" && e2.type === "contact") tf = (e2.frame - e1.frame) / fps;
  }
  if (tc === 0) return null;

  const g = 9.81;
  const cadenceVal = 120 / (tc + tf);
  const oscillationCm = ((g * Math.pow(tc, 2)) / (Math.PI * Math.PI)) * 100;

  let legStiffnessKNm: number | null = null;
  let kvertKNm: number | null = null;
  if (patientMass != null && legLength != null) {
    const L0 = legLength / 100;
    const Fmax = (Math.PI * patientMass * g * (tc + tf)) / tc;
    const deltaY = (g * Math.pow(tc, 2)) / (Math.PI * Math.PI);
    kvertKNm = Fmax / deltaY / 1000;
    const underSqrt = Math.pow(L0, 2) - Math.pow((runSpeed * tc) / 2, 2);
    if (underSqrt > 0) {
      const deltaL = L0 - Math.sqrt(underSqrt);
      legStiffnessKNm = deltaL > 0 ? Fmax / deltaL / 1000 : null;
    }
  }

  return {
    cadenceVal,
    cadence: cadenceVal.toFixed(1),
    oscillationCm,
    oscillation: oscillationCm.toFixed(1),
    legStiffness: legStiffnessKNm?.toFixed(1) ?? null,
    kvert: kvertKNm?.toFixed(1) ?? null,
    tcMs: (tc * 1000).toFixed(0),
    tfMs: (tf * 1000).toFixed(0),
  };
};

export const calcAngle = (p1: Point, center: Point, p2: Point) => {
  const a1 = Math.atan2(p1.y - center.y, p1.x - center.x);
  const a2 = Math.atan2(p2.y - center.y, p2.x - center.x);
  let angle = (a1 - a2) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  if (angle > 180) angle = 360 - angle;
  return angle.toFixed(1);
};
