import { beforeEach, describe, expect, it, vi } from "vitest";

import { findContactByIdentity, upsertContact } from "../contacts";

function makePool(impl: (sql: string, params: any[]) => any) {
  return {
    query: vi.fn((sql: string, params: any[]) => Promise.resolve(impl(sql, params))),
  } as any;
}

describe("contacts — dedup canônico de telefone BR", () => {
  beforeEach(() => vi.clearAllMocks());

  it("acha contato existente quando o número difere só por prefixo 55 / formatação", async () => {
    // Contato salvo como nacional ("11993524642"); busca chega com E.164 formatado.
    const pool = makePool((sql) => {
      // 1) Match exato falha (telefone armazenado != dígitos da busca).
      if (/cpf\s*=\s*\$2/.test(sql)) return { rows: [] };
      // 2) Busca canônica por candidatos (últimos 8 dígitos).
      if (/LIKE/.test(sql)) {
        return { rows: [{ id: "contact-1", telefone: "11993524642" }] };
      }
      return { rows: [] };
    });

    const found = await findContactByIdentity(pool, "org-1", {
      telefone: "+55 (11) 99352-4642",
    });

    expect(found?.id).toBe("contact-1");
    // Deve ter emitido a busca canônica por candidatos.
    const canonCall = pool.query.mock.calls.find((c: any[]) => /LIKE/.test(String(c[0])));
    expect(canonCall).toBeTruthy();
  });

  it("não casa números realmente diferentes", async () => {
    const pool = makePool((sql) => {
      if (/cpf\s*=\s*\$2/.test(sql)) return { rows: [] };
      if (/LIKE/.test(sql)) {
        return { rows: [{ id: "outro", telefone: "11999990000" }] };
      }
      return { rows: [] };
    });

    const found = await findContactByIdentity(pool, "org-1", {
      telefone: "11993524642",
    });

    expect(found).toBeNull();
  });

  it("upsertContact grava o telefone em E.164 (com 55)", async () => {
    let insertedPhone: string | null = null;
    const pool = makePool((sql, params) => {
      // findContactByIdentity: nada existente.
      if (/SELECT \* FROM contacts/.test(sql)) return { rows: [] };
      if (/INSERT INTO contacts/.test(sql)) {
        insertedPhone = params[2]; // telefone é o 3º parâmetro
        return { rows: [{ id: "novo", telefone: params[2] }] };
      }
      return { rows: [] };
    });

    await upsertContact(pool, {
      organizationId: "org-1",
      nome: "Fulano",
      telefone: "(11) 99352-4642",
    });

    expect(insertedPhone).toBe("5511993524642");
  });
});
