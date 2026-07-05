import { DurableObject } from "cloudflare:workers";
import { YServer } from "y-partyserver";
import type { Env } from "../types/env";

/**
 * EvolutionCollaboration — colaboração em tempo real sobre Yjs.
 *
 * Servidor autoritativo: mantém o Y.Doc canônico da sessão, sincroniza os
 * clientes via protocolo y-websocket e entrega o estado atual a quem entra
 * depois. Persistência (onLoad/onSave) e autenticação chegam nas Tasks 4-5.
 */
export class EvolutionCollaborationSql extends YServer<Env> {
  static callbackOptions = { debounceWait: 2000, debounceMaxWait: 10000 };
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
