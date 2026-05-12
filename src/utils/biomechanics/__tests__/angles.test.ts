import { describe, expect, it } from "vitest";
import { calculateAngle, JointAngles } from "../angles";

describe("Biomechanical Angles", () => {
  it("calculates correct angle between points (90 degrees)", () => {
    const a = { x: 1, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    const c = { x: 0, y: 1, z: 0 };
    expect(calculateAngle(a, b, c)).toBe(90);
  });

  it("calculates correct angle between points (180 degrees)", () => {
    const a = { x: 1, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    const c = { x: -1, y: 0, z: 0 };
    expect(calculateAngle(a, b, c)).toBe(180);
  });

  it("JointAngles.knee calculates flexion correctly", () => {
    const hip = { x: 0, y: 100, z: 0 };
    const knee = { x: 0, y: 50, z: 0 };
    const ankle = { x: 50, y: 50, z: 0 }; // 90 degree flexion
    expect(JointAngles.knee(hip, knee, ankle)).toBe(90);
  });
});
