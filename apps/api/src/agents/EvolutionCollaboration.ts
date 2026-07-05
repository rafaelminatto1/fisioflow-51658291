import { DurableObject } from "cloudflare:workers";
import type { Connection, ConnectionContext } from "partyserver";
import { YServer } from "y-partyserver";
import { resolveJwtCandidate, userHasRole } from "../lib/auth";
import { getRawSql } from "../lib/db";
import type { Env } from "../types/env";

/** Papéis autorizados a editar a evolução clínica colaborativamente. */
const EDITABLE_ROLES = ["admin", "fisioterapeuta", "estagiario"];

/** Persistido via `connection.setState()` — sobrevive à hibernação do DO. */
type CollabConnectionState = {
  userId: string;
  orgId: string;
};

async function loadSessionOrgId(env: Env, sessionId: string): Promise<string | null> {
  const sql = getRawSql(env, "read");
  const res = await sql(`SELECT org_id FROM sessions WHERE id = $1 LIMIT 1`, [sessionId]);
  const row = res.rows?.[0] as { org_id?: string | null } | undefined;
  return row?.org_id ?? null;
}

/**
 * EvolutionCollaboration — colaboração em tempo real sobre Yjs.
 *
 * Servidor autoritativo: mantém o Y.Doc canônico da sessão, sincroniza os
 * clientes via protocolo y-websocket e entrega o estado atual a quem entra
 * depois. Persistência (onLoad/onSave) chega na Task 5.
 *
 * Autenticação (Task 4): o upgrade do WebSocket chega sem passar por
 * middleware HTTP normal, então a validação acontece aqui em `onConnect` —
 * o `partyserver` já aceitou o socket nesse ponto (ver `Server#fetch`), então
 * recusar significa fechar a conexão com um código 4401/4403 antes de
 * repassar para `YServer#onConnect` (que dispara o hand-shake de sync).
 */
export class EvolutionCollaborationSql extends YServer<Env> {
  static callbackOptions = { debounceWait: 2000, debounceMaxWait: 10000 };

  async onConnect(connection: Connection, ctx: ConnectionContext): Promise<void> {
    const token = new URL(ctx.request.url).searchParams.get("token");
    if (!token) {
      connection.close(4401, "missing token");
      return;
    }

    let user;
    try {
      user = await resolveJwtCandidate(this.env, token);
    } catch (error) {
      console.error("[EvolutionCollaboration] JWT verification failed:", error);
      user = null;
    }

    if (!user) {
      connection.close(4401, "invalid token");
      return;
    }

    const sessionOrgId = await loadSessionOrgId(this.env, this.name).catch((error) => {
      console.error("[EvolutionCollaboration] Failed to load session org:", error);
      return null;
    });

    if (!sessionOrgId || sessionOrgId !== user.organizationId) {
      connection.close(4403, "org mismatch");
      return;
    }

    if (!userHasRole(user, EDITABLE_ROLES)) {
      connection.close(4403, "role not allowed");
      return;
    }

    const state: CollabConnectionState = { userId: user.uid, orgId: user.organizationId };
    connection.setState(state);

    await super.onConnect(connection, ctx);
  }
}

/**
 * @deprecated Relay KV dormante da implementação anterior. Sem binding desde a
 * migração que aponta EVOLUTION_COLLABORATION para EvolutionCollaborationSql.
 * Mantida exportada (o Cloudflare exige que a classe exista enquanto o namespace
 * existir) até ser removida via `deleted_classes` num deploy separado da troca de
 * binding — mesmo precedente de PatientAgent/ClinicAgent (wrangler v11 → v12).
 */
export class EvolutionCollaboration extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }
    return new Response("Gone", { status: 410 });
  }
}
