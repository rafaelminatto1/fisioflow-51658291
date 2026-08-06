import { fetchApi } from "@/lib/api";
import { authApi } from "@/lib/auth-api";
import { fisioLogger } from "../errors/logger";
import { auditLogger } from "./auditLogger";
import type { ApiResponse } from "@/types/api";
import type { DataDeletionRequest } from "@/types/dataDeletion";

/**
 * Pedido de exclusão de dados (LGPD art. 18).
 *
 * Até 08/2026 este serviço chamava `/api/users/:id/delete`,
 * `/api/users/:id/deletion-status` e `/api/users/:id/cancel-deletion` — as três
 * inexistentes (404). O pedido do usuário nunca era registrado em lugar nenhum.
 *
 * O fluxo real do Worker é `/api/lgpd/data-deletion-request`, que responde com a
 * base legal: dado clínico tem retenção mínima de 20 anos (Lei 13.787/2018 art. 6
 * e Resolução COFFITO 415/2012), então `scope=all` é registrado mas negado, e
 * `scope=cadastral` entra em análise. Não existe cancelamento — um pedido em
 * análise é resolvido pelo encarregado, não desfeito pelo app.
 */

/** Linha de `lgpd_deletion_requests` como o Worker devolve. */
interface LgpdDeletionRow {
  id: string;
  status: string;
  scope: string;
  requester_email: string;
  response_summary?: string | null;
  legal_basis?: string | null;
  due_at?: string | null;
  responded_at?: string | null;
  created_at: string;
}

export interface DeletionRequestView {
  id: string;
  status: string;
  scope: string;
  /** Resposta automatizada do Worker, com a base legal da retenção. */
  responseSummary?: string;
  legalBasis?: string;
  createdAt: string;
  dueAt?: string;
  respondedAt?: string;
}

function toView(row: LgpdDeletionRow): DeletionRequestView {
  return {
    id: row.id,
    status: row.status,
    scope: row.scope,
    responseSummary: row.response_summary || undefined,
    legalBasis: row.legal_basis || undefined,
    createdAt: row.created_at,
    dueAt: row.due_at || undefined,
    respondedAt: row.responded_at || undefined,
  };
}

class DataDeletionService {
  private static instance: DataDeletionService;

  private constructor() {}

  static getInstance(): DataDeletionService {
    if (!DataDeletionService.instance) {
      DataDeletionService.instance = new DataDeletionService();
    }
    return DataDeletionService.instance;
  }

  /** Pedido em aberto do próprio usuário, se houver. */
  async getDeletionStatus(email: string): Promise<DeletionRequestView | null> {
    try {
      const response = await fetchApi<ApiResponse<LgpdDeletionRow[]>>(
        "/api/lgpd/data-deletion-requests",
        { params: { requester_email: email } },
      );
      const rows = response.data || [];
      const open = rows.find((row) => row.status === "in_review") || rows[0];
      return open ? toView(open) : null;
    } catch {
      return null;
    }
  }

  /**
   * @param scope `cadastral` remove nome/e-mail/telefone; `all` é registrado mas
   * negado, com a justificativa legal na resposta.
   */
  async requestDeletion(
    email: string,
    scope: "all" | "cadastral" | "marketing" = "cadastral",
    name?: string,
  ): Promise<DeletionRequestView> {
    try {
      const response = await fetchApi<ApiResponse<LgpdDeletionRow>>(
        "/api/lgpd/data-deletion-request",
        {
          method: "POST",
          data: {
            requester_email: email,
            requester_name: name,
            scope,
            request_origin: "professional_app",
          },
        },
      );

      await auditLogger.logEvent({
        userId: email,
        action: "delete",
        resourceType: "auth",
        details: { scope },
      });

      return toView(response.data);
    } catch (error) {
      fisioLogger.error("Account deletion request failed", error, "DataDeletionService");
      throw error;
    }
  }

  async requestAccountDeletion(
    scope: "all" | "cadastral" | "marketing" = "cadastral",
  ): Promise<DeletionRequestView> {
    const user = await authApi.getMe();
    if (!user?.email) throw new Error("Not authenticated");
    return this.requestDeletion(user.email, scope, user.name);
  }
}

export const dataDeletionService = DataDeletionService.getInstance();
export type { DataDeletionRequest };
