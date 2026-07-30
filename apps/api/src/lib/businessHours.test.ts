import { describe, it, expect } from "vitest";
import { isWithinBusinessHours } from "./businessHours";

// Datas em UTC; BRT = UTC-3.
describe("isWithinBusinessHours (America/Sao_Paulo)", () => {
  it("terça 10h BRT (13h UTC) = aberto", () => {
    expect(isWithinBusinessHours(new Date("2026-07-28T13:00:00Z"))).toBe(true);
  });
  it("terça 6h BRT (09h UTC) = fechado (antes das 7h)", () => {
    expect(isWithinBusinessHours(new Date("2026-07-28T09:00:00Z"))).toBe(false);
  });
  it("terça 21h BRT (00h UTC quarta) = fechado (>=21h)", () => {
    expect(isWithinBusinessHours(new Date("2026-07-29T00:00:00Z"))).toBe(false);
  });
  it("sábado 10h BRT = aberto", () => {
    expect(isWithinBusinessHours(new Date("2026-08-01T13:00:00Z"))).toBe(true);
  });
  it("sábado 14h BRT (17h UTC) = fechado (>=13h)", () => {
    expect(isWithinBusinessHours(new Date("2026-08-01T17:00:00Z"))).toBe(false);
  });
  it("domingo 10h BRT = fechado", () => {
    expect(isWithinBusinessHours(new Date("2026-08-02T13:00:00Z"))).toBe(false);
  });
});
