import { describe, it, expect, vi } from "vitest";
import { normalizeStages, fetchCampaignAudience } from "../campaignAudience";

describe("normalizeStages", () => {
  it("limpa e filtra vazios; não-array vira []", () => {
    expect(normalizeStages(["lead", " em_contato ", "", null])).toEqual(["lead", "em_contato"]);
    expect(normalizeStages("x")).toEqual([]);
    expect(normalizeStages(undefined)).toEqual([]);
  });
});

describe("fetchCampaignAudience", () => {
  it("countOnly retorna a contagem e passa os estágios normalizados", async () => {
    const query = vi.fn(async (_sql: string, _params?: any[]) => ({ rows: [{ c: 7 }] }));
    const pool = { query } as any;
    const out = await fetchCampaignAudience(pool, "o1", ["aguardando", ""], { countOnly: true });
    expect(out.count).toBe(7);
    expect(out.rows).toEqual([]);
    const params = query.mock.calls[0]![1] as any[];
    expect(params[0]).toBe("o1");
    expect(params[1]).toEqual(["aguardando"]);
    expect(params[2]).toBe(false); // onlyEngaged default
    expect(String(query.mock.calls[0][0])).toMatch(/COUNT/i);
  });

  it("onlyEngaged passa true e usa o filtro de conversa existente", async () => {
    const query = vi.fn(async (_sql: string, _params?: any[]) => ({ rows: [{ c: 3 }] }));
    const pool = { query } as any;
    await fetchCampaignAudience(pool, "o1", [], { countOnly: true, onlyEngaged: true });
    expect((query.mock.calls[0]![1] as any[])[2]).toBe(true);
    expect(String(query.mock.calls[0]![0])).toMatch(/wa_conversations/);
  });

  it("sempre aplica o opt-out de marketing (LGPD)", async () => {
    const query = vi.fn(async (_sql: string, _params?: any[]) => ({ rows: [{ c: 1 }] }));
    const pool = { query } as any;
    await fetchCampaignAudience(pool, "o1", [], { countOnly: true });
    expect(String(query.mock.calls[0]![0])).toMatch(/marketing_consents/);
  });

  it("retorna os destinatários com telefone", async () => {
    const rows = [
      { contact_id: "c1", phone: "5511999990001", name: "Maria" },
      { contact_id: "c2", phone: "5511999990002", name: "João" },
    ];
    const query = vi.fn(async (_sql: string, _params?: any[]) => ({ rows }));
    const pool = { query } as any;
    const out = await fetchCampaignAudience(pool, "o1", [], {});
    expect(out.count).toBe(2);
    expect(out.rows).toEqual(rows);
    // sem filtro de estágio → array vazio (casa todos via cardinality)
    expect((query.mock.calls[0]![1] as any[])[1]).toEqual([]);
  });
});
