import { FisioFlowMCP, type Env } from "./server";

export { FisioFlowMCP };

function extractBearer(request: Request): string {
  const auth = request.headers.get("Authorization") ?? "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") return new Response("ok");

    // Propaga o token do chamador para a instância do agente via props.
    const token = extractBearer(request);
    (ctx as unknown as { props?: Record<string, unknown> }).props = { token };

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return FisioFlowMCP.serveSSE("/sse").fetch(request, env, ctx);
    }
    if (url.pathname === "/mcp") {
      return FisioFlowMCP.serve("/mcp").fetch(request, env, ctx);
    }
    return new Response("Not found", { status: 404 });
  },
};
