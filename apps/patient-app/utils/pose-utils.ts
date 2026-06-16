export interface Landmark {
  x: number;
  y: number;
  z?: number;
  score?: number;
}

export interface Pose {
  nose?: Landmark;
  leftEye?: Landmark;
  rightEye?: Landmark;
  leftEar?: Landmark;
  rightEar?: Landmark;
  leftShoulder?: Landmark;
  rightShoulder?: Landmark;
  leftElbow?: Landmark;
  rightElbow?: Landmark;
  leftWrist?: Landmark;
  rightWrist?: Landmark;
  leftHip?: Landmark;
  rightHip?: Landmark;
  leftKnee?: Landmark;
  rightKnee?: Landmark;
  leftAnkle?: Landmark;
  rightAnkle?: Landmark;
  leftHeel?: Landmark;
  rightHeel?: Landmark;
  leftFootIndex?: Landmark;
  rightFootIndex?: Landmark;
  [key: string]: Landmark | undefined;
}

export const mapVisionToPoseLandmarks = (results: Pose): Pose | null => {
  if (!results) return null;

  return {
    nose: results.nose,
    leftEye: results.leftEye,
    rightEye: results.rightEye,
    leftEar: results.leftEar,
    rightEar: results.rightEar,
    leftShoulder: results.leftShoulder,
    rightShoulder: results.rightShoulder,
    leftElbow: results.leftElbow,
    rightElbow: results.rightElbow,
    leftWrist: results.leftWrist,
    rightWrist: results.rightWrist,
    leftHip: results.leftHip,
    rightHip: results.rightHip,
    leftKnee: results.leftKnee,
    rightKnee: results.rightKnee,
    leftAnkle: results.leftAnkle,
    rightAnkle: results.rightAnkle,
    leftHeel: results.leftHeel,
    rightHeel: results.rightHeel,
    leftFootIndex: results.leftFootIndex,
    rightFootIndex: results.rightFootIndex,
  };
};

export const calculateAngle = (p1: Landmark, p2: Landmark, p3: Landmark): number => {
  const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360 - angle;
  }

  return Math.round(angle * 10) / 10;
};

export const getAngleStatus = (
  angle: number,
  reference: number,
  tolerance: number,
): "ok" | "warning" | "alert" => {
  const diff = Math.abs(angle - reference);
  if (diff <= tolerance) return "ok";
  if (diff <= tolerance * 2) return "warning";
  return "alert";
};

export const formatAngle = (angle: number) => `${angle.toFixed(1)}°`;
