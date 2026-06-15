/**
 * Tipos e utilitários vetoriais para análise biomecânica.
 */
export interface Point3D {
  x: number;
  y: number;
  z?: number;
  score?: number;
}

/** Distância euclidiana 2D entre dois pontos. */
export const distance2D = (a: Point3D, b: Point3D): number => Math.hypot(b.x - a.x, b.y - a.y);
