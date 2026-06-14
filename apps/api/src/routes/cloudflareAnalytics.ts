import { Hono } from "hono";
import { requireAuth, requireRole, type AuthVariables } from "../lib/auth";
import type { Env } from "../types/env";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use("*", requireAuth);
app.use("*", requireRole(["admin", "owner"]));

app.get("/status", async (c) => {
  const user = c.get("user");

  return c.json({
    configured: Boolean(c.env.CF_API_TOKEN && c.env.CF_ACCOUNT_ID),
    accountIdPresent: Boolean(c.env.CF_ACCOUNT_ID),
  });
});

app.post("/graphql", async (c) => {
  const user = c.get("user");

  const body = (await c.req.json().catch(() => ({}))) as {
    query?: string;
    variables?: Record<string, unknown>;
  };
  if (!body.query) return c.json({ error: "query obrigatoria" }, 400);

  const result = await cloudflareGraphql(c.env, body.query, {
    accountTag: c.env.CF_ACCOUNT_ID,
    ...body.variables,
  });

  return c.json(result);
});

app.get("/workflows", async (c) => {
  const user = c.get("user");

  const hours = Math.min(168, Math.max(1, Number(c.req.query("hours") ?? 24)));
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const query = `
    query FisioFlowWorkflowAnalytics($accountTag: string!, $since: Time!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          workflowsAdaptiveGroups(
            limit: 100
            filter: { datetime_geq: $since }
          ) {
            dimensions {
              workflowName
              eventType
            }
            count
          }
        }
      }
    }
  `;

  const result = await cloudflareGraphql(c.env, query, {
    accountTag: c.env.CF_ACCOUNT_ID,
    since,
  });

  return c.json({
    windowHours: hours,
    since,
    result,
  });
});

async function cloudflareGraphql(
  env: Env,
  query: string,
  variables: Record<string, unknown>,
): Promise<unknown> {
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) {
    return { error: "CF_API_TOKEN e CF_ACCOUNT_ID sao necessarios" };
  }

  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}


export { app as cloudflareAnalyticsRoutes };
