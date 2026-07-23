import { describe, it, expect } from "vitest";
import { backoffDelay } from "./queueBackoff";

describe("backoffDelay", () => {
  it("cresce exponencialmente a partir de attempts", () => {
    expect(backoffDelay(1)).toBe(10);
    expect(backoffDelay(2)).toBe(20);
    expect(backoffDelay(3)).toBe(40);
  });
  it("limita em 300s", () => {
    expect(backoffDelay(10)).toBe(300);
  });
  it("nunca é negativo para attempts inesperado", () => {
    expect(backoffDelay(0)).toBeGreaterThanOrEqual(0);
  });
});
