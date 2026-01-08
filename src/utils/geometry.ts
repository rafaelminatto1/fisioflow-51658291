export interface Point3D {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

export interface Landmark extends Point3D { }

/**
 * Calculates the angle between three points (A, B, C) where B is the vertex.
 * Uses 2D projection (x, y) for calculation as per standard biomechanics on video.
 * Returns angle in degrees [0, 180].
 * 
 * Formula: θ = |atan2(Cy - By, Cx - Bx) - atan2(Ay - By, Ax - Bx)|
 */
export const calculateAngle = (a: Point3D, b: Point3D, c: Point3D): number => {
    const radians =
        Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);

    let angle = Math.abs((radians * 180.0) / Math.PI);

    if (angle > 180.0) {
        angle = 360 - angle;
    }

    return angle;
};

/**
 * Calculates distance between two points in 2D plane
 */
export const calculateDistance = (a: Point3D, b: Point3D): number => {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

export const POSE_LANDMARKS = {
    NOSE: 0,
    LEFT_EYE_INNER: 1,
    LEFT_EYE: 2,
    LEFT_EYE_OUTER: 3,
    RIGHT_EYE_INNER: 4,
    RIGHT_EYE: 5,
    RIGHT_EYE_OUTER: 6,
    LEFT_EAR: 7,
    RIGHT_EAR: 8,
    MOUTH_LEFT: 9,
    MOUTH_RIGHT: 10,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_PINKY: 17,
    RIGHT_PINKY: 18,
    LEFT_INDEX: 19,
    RIGHT_INDEX: 20,
    LEFT_THUMB: 21,
    RIGHT_THUMB: 22,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
    LEFT_HEEL: 29,
    RIGHT_HEEL: 30,
    LEFT_FOOT_INDEX: 31,
    RIGHT_FOOT_INDEX: 32,
} as const;

export interface UnifiedLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
    name?: string; // Enhanced with optional name for debugging
}
