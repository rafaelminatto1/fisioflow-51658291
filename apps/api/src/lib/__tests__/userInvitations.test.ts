import { beforeEach, describe, expect, it, vi } from "vitest";
import { markInvitationUsed, resolveInvitedRole } from "../userInvitations";

const mockQuery = vi.fn();
const pool = { query: mockQuery } as unknown as Parameters<typeof resolveInvitedRole>[0];

beforeEach(() => {
  mockQuery.mockReset();
});

describe("resolveInvitedRole", () => {
  it("retorna o papel do convite pendente para o e-mail", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          role: "admin",
          organization_id: "00000000-0000-0000-0000-000000000001",
        },
      ],
    });

    const result = await resolveInvitedRole(pool, "amanda_notoya@hotmail.com");

    expect(result).toEqual({
      invitationId: "11111111-1111-1111-1111-111111111111",
      role: "admin",
      roles: ["admin"],
      organizationId: "00000000-0000-0000-0000-000000000001",
    });
  });

  it("casa e-mail ignorando caixa e espaços", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await resolveInvitedRole(pool, "  Amanda_Notoya@Hotmail.com  ");

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ["amanda_notoya@hotmail.com"]);
  });

  it("retorna null quando não há convite pendente", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    expect(await resolveInvitedRole(pool, "ninguem@example.com")).toBeNull();
  });

  it("retorna null sem e-mail e não consulta o banco", async () => {
    expect(await resolveInvitedRole(pool, "")).toBeNull();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("rejeita papel fora da allowlist", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "abc", role: "superuser", organization_id: "org" }],
    });

    expect(await resolveInvitedRole(pool, "x@example.com")).toBeNull();
  });

  it("cai para a organização padrão quando o convite não tem org", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: "abc", role: "fisioterapeuta", organization_id: null }],
    });

    const result = await resolveInvitedRole(pool, "x@example.com");

    expect(result?.organizationId).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("retorna null quando a consulta falha (signup não deve quebrar)", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db down"));

    expect(await resolveInvitedRole(pool, "x@example.com")).toBeNull();
  });
});

describe("markInvitationUsed", () => {
  it("marca o convite como usado apenas se ainda não usado", async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });

    await markInvitationUsed(pool, "inv-1");

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("used_at = NOW()");
    expect(sql).toContain("used_at IS NULL");
    expect(params).toEqual(["inv-1"]);
  });

  it("não propaga erro do banco", async () => {
    mockQuery.mockRejectedValueOnce(new Error("db down"));

    await expect(markInvitationUsed(pool, "inv-1")).resolves.toBeUndefined();
  });
});
