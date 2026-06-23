import { describe, it, expect } from "vitest";
import {
  DEFAULT_REMINDER_CONFIG,
  computeReminderSendAt,
  resolveReminderConfig,
} from "../reminderScheduling";

const cfg = DEFAULT_REMINDER_CONFIG; // UTC-3

// Helper: instante UTC esperado para um horário local (UTC-3) → soma 3h.
const localUtc = (iso: string) => new Date(`${iso}:00Z`).toISOString();

describe("computeReminderSendAt", () => {
  it("sessão 07h → envia 19h da véspera", () => {
    const at = computeReminderSendAt("2026-06-25", "07:00", cfg);
    // 2026-06-24 19:00 local (UTC-3) = 22:00 UTC
    expect(at.toISOString()).toBe(localUtc("2026-06-24T22:00"));
  });

  it("sessão 08h → envia 19h da véspera", () => {
    const at = computeReminderSendAt("2026-06-25", "08:30", cfg);
    expect(at.toISOString()).toBe(localUtc("2026-06-24T22:00"));
  });

  it("sessão 09h → envia 07h do mesmo dia", () => {
    const at = computeReminderSendAt("2026-06-25", "09:00", cfg);
    // 07:00 local = 10:00 UTC
    expect(at.toISOString()).toBe(localUtc("2026-06-25T10:00"));
  });

  it("sessão 10h → envia 07h do mesmo dia", () => {
    const at = computeReminderSendAt("2026-06-25", "10:00", cfg);
    expect(at.toISOString()).toBe(localUtc("2026-06-25T10:00"));
  });

  it("sessão 11h → envia 08h do mesmo dia", () => {
    const at = computeReminderSendAt("2026-06-25", "11:00", cfg);
    // 08:00 local = 11:00 UTC
    expect(at.toISOString()).toBe(localUtc("2026-06-25T11:00"));
  });

  it("sessão 12h → envia 08h do mesmo dia", () => {
    const at = computeReminderSendAt("2026-06-25", "12:00", cfg);
    expect(at.toISOString()).toBe(localUtc("2026-06-25T11:00"));
  });

  it("sessão 14h → regra padrão 5h antes (09h local)", () => {
    const at = computeReminderSendAt("2026-06-25", "14:00", cfg);
    // 14:00 local - 5h = 09:00 local = 12:00 UTC
    expect(at.toISOString()).toBe(localUtc("2026-06-25T12:00"));
  });

  it("sessão 18h → regra padrão 5h antes (13h local)", () => {
    const at = computeReminderSendAt("2026-06-25", "18:00", cfg);
    expect(at.toISOString()).toBe(localUtc("2026-06-25T16:00"));
  });

  it("sessão 19h30 → regra padrão 5h antes (14h30 local)", () => {
    const at = computeReminderSendAt("2026-06-25", "19:30", cfg);
    expect(at.toISOString()).toBe(localUtc("2026-06-25T17:30"));
  });
});

describe("resolveReminderConfig", () => {
  it("retorna defaults para entrada vazia", () => {
    expect(resolveReminderConfig(null)).toEqual(DEFAULT_REMINDER_CONFIG);
    expect(resolveReminderConfig(undefined).defaultHoursBefore).toBe(5);
  });

  it("mescla parcial sobre defaults", () => {
    const merged = resolveReminderConfig({ defaultHoursBefore: 3, enabled: false });
    expect(merged.defaultHoursBefore).toBe(3);
    expect(merged.enabled).toBe(false);
    expect(merged.bands).toHaveLength(3);
  });
});
