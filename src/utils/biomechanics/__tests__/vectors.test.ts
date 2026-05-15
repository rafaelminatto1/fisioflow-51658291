import { describe, expect, it } from "vitest";
import { createVector, dotProduct, magnitude, normalize } from "../vectors";

describe("Biomechanical Vectors", () => {
  it("calculates a correct vector between two points", () => {
    const p1 = { x: 0, y: 0, z: 0 };
    const p2 = { x: 3, y: 4, z: 0 };
    const vector = createVector(p1, p2);
    expect(vector).toEqual({ x: 3, y: 4, z: 0 });
  });

  it("calculates correct magnitude (length)", () => {
    const vector = { x: 3, y: 4, z: 0 };
    expect(magnitude(vector)).toBe(5);
  });

  it("calculates correct dot product", () => {
    const v1 = { x: 1, y: 0, z: 0 };
    const v2 = { x: 0, y: 1, z: 0 };
    expect(dotProduct(v1, v2)).toBe(0); // Orthogonal

    const v3 = { x: 2, y: 3, z: 4 };
    const v4 = { x: 5, y: 6, z: 7 };
    expect(dotProduct(v3, v4)).toBe(10 + 18 + 28);
  });

  it("normalizes a vector correctly", () => {
    const v = { x: 10, y: 0, z: 0 };
    expect(normalize(v)).toEqual({ x: 1, y: 0, z: 0 });
    expect(magnitude(normalize({ x: 1, y: 1, z: 1 }))).toBeCloseTo(1);
  });
});
