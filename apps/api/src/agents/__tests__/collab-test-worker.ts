import { getServerByName } from "partyserver";
import type { EvolutionCollaborationSql } from "../EvolutionCollaboration";
import type { NotesCollaboration } from "../NotesCollaboration";

export { EvolutionCollaborationSql } from "../EvolutionCollaboration";
export { NotesCollaboration } from "../NotesCollaboration";

interface TestEnv {
  EVOLUTION_COLLABORATION: DurableObjectNamespace<EvolutionCollaborationSql>;
  NOTES_COLLABORATION: DurableObjectNamespace<NotesCollaboration>;
  FISIOFLOW_CONFIG: KVNamespace;
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
    if (url.pathname.startsWith("/api/notes/") && url.pathname.endsWith("/collaboration")) {
      const noteId = url.pathname.split("/").at(-2);
      if (!noteId) return new Response("Note ID required", { status: 400 });
      return env.NOTES_COLLABORATION.get(env.NOTES_COLLABORATION.idFromName(noteId)).fetch(request);
    }
    return new Response("Not Found", { status: 404 });
  },
};
