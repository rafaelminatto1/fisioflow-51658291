/**
 * Geometry utilities for NeuroPose analysis
 */

export interface Point2D {
    x: number;
    y: number;
    z?: number;
    visibility?: number;
}

export interface Vector2D {
    x: number;
    y: number;
}

/**
 * Calculates the angle between three points (A, B, C) where B is the vertex.
 * Returns angle in degrees.
 */
export function calculateAngle(a: Point2D, b: Point2D, c: Point2D): number {
    if (!a || !b || !c) return 0;

    const vectorBA: Vector2D = { x: a.x - b.x, y: a.y - b.y };
    const vectorBC: Vector2D = { x: c.x - b.x, y: c.y - b.y };

    const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y;
    const magnitudeBA = Math.sqrt(vectorBA.x * vectorBA.x + vectorBA.y * vectorBA.y);
    const magnitudeBC = Math.sqrt(vectorBC.x * vectorBC.x + vectorBC.y * vectorBC.y);

    if (magnitudeBA * magnitudeBC === 0) return 0;

    const angleRad = Math.acos(dotProduct / (magnitudeBA * magnitudeBC));
    const angleDeg = (angleRad * 180) / Math.PI;

    return angleDeg;
}

/**
 * Calculates the midpoint between two points.
 */
export function midPoint(a: Point2D, b: Point2D): Point2D {
    return {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2
    };
}

/**
 * Calculates Euclidean distance between two points.
 */
export function distance(a: Point2D, b: Point2D): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

/**
 * Checks if a point is within a bounding box.
 */
export function isPointInBox(point: Point2D, box: { x: number, y: number, width: number, height: number }): boolean {
    return point.x >= box.x && point.x <= box.x + box.width &&
        point.y >= box.y && point.y <= box.y + box.height;
}

/**
 * Converts normalized MediaPipe coordinates (0-1) to pixel coordinates.
 */
export function normalizedToPixelCoordinates(
    normalizedX: number,
    normalizedY: number,
    imageWidth: number,
    imageHeight: number
): Point2D {
    const xPx = Math.min(Math.floor(normalizedX * imageWidth), imageWidth - 1);
    const yPx = Math.min(Math.floor(normalizedY * imageHeight), imageHeight - 1);
    return { x: xPx, y: yPx };
}

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
};
