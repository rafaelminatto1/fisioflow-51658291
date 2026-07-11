// Harness temporário: expõe só o VoiceScribeAgent via routeAgentRequest.
import { routeAgentRequest } from "agents";
export { VoiceScribeAgent } from "../src/agents/VoiceScribeAgent";

export default {
  async fetch(request: Request, env: unknown): Promise<Response> {
    const r = await routeAgentRequest(request, env as never);
    return r ?? new Response("not an agent route", { status: 404 });
  },
};
