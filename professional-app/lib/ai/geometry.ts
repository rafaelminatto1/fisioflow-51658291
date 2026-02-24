/**
 * Geometry utilities for Biofeedback IA (Mobile)
 */

export interface Point2D {
    x: number;
    y: number;
    z?: number;
    visibility?: number;
}

/**
 * Calculates the angle between three points (A, B, C) where B is the vertex.
 * Returns angle in degrees.
 */
export function calculateAngle(a: Point2D, b: Point2D, c: Point2D): number {
    if (!a || !b || !c) return 0;

    const vectorBA = { x: a.x - b.x, y: a.y - b.y };
    const vectorBC = { x: c.x - b.x, y: c.y - b.y };

    const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y;
    const magnitudeBA = Math.sqrt(vectorBA.x * vectorBA.x + vectorBA.y * vectorBA.y);
    const magnitudeBC = Math.sqrt(vectorBC.x * vectorBC.x + vectorBC.y * vectorBC.y);

    if (magnitudeBA * magnitudeBC === 0) return 0;

    // Acosseno do produto escalar normalizado
    let cosTheta = dotProduct / (magnitudeBA * magnitudeBC);
    
    // Clamp to [-1, 1] due to floating point errors
    cosTheta = Math.max(-1, Math.min(1, cosTheta));
    
    const angleRad = Math.acos(cosTheta);
    const angleDeg = (angleRad * 180) / Math.PI;

    return angleDeg;
}

/**
 * Calculates Euclidean distance between two points.
 */
export function distance(a: Point2D, b: Point2D): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}
