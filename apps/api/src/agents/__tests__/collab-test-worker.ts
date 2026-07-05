import { getServerByName } from "partyserver";
import type { EvolutionCollaborationSql } from "../EvolutionCollaboration";

export { EvolutionCollaborationSql } from "../EvolutionCollaboration";

interface TestEnv {
  EVOLUTION_COLLABORATION: DurableObjectNamespace<EvolutionCollaborationSql>;
}

export default {
  async fetch(request: Request, env: TestEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/sessions/") && url.pathname.endsWith("/collaboration")) {
      const parts = url.pathname.split("/");
      const sessionId = parts[parts.length - 2];
      if (!sessionId) return new Response("Session ID required", { status: 400 });
      const stub = await getServerByName(env.EVOLUTION_COLLABORATION, sessionId);
      return stub.fetch(request);
    }
    return new Response("Not Found", { status: 404 });
  },
};
