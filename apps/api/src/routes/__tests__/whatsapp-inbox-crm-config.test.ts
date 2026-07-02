import { describe, it, expect } from "vitest";
import { readCrmConfig } from "../whatsapp-inbox";

describe("readCrmConfig — automationsEnabled", () => {
  it("é true quando crm_whatsapp.automations_enabled === true", () => {
    const cfg = readCrmConfig({ crm_whatsapp: { automations_enabled: true } });
    expect(cfg.automationsEnabled).toBe(true);
  });

  it("é false quando ausente (default OFF)", () => {
    expect(readCrmConfig({}).automationsEnabled).toBe(false);
    expect(readCrmConfig({ crm_whatsapp: {} }).automationsEnabled).toBe(false);
  });

  it("é false para valores truthy que não sejam o booleano true (ex.: string)", () => {
    const cfg = readCrmConfig({ crm_whatsapp: { automations_enabled: "true" } as any });
    expect(cfg.automationsEnabled).toBe(false);
  });

  it("expõe os defaults das configurações de disponibilidade do concierge", () => {
    const cfg = readCrmConfig({});
    expect(cfg.concierge.availabilityAutoReply).toBe(false);
    expect(cfg.concierge.availabilityScope).toBe("organization");
    expect(cfg.concierge.availabilityProfileSlug).toBe("");
  });
});
