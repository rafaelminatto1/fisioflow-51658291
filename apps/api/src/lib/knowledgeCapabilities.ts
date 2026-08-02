import type { MiddlewareHandler } from "hono";
import type { Env } from "../types/env";
import type { AuthVariables } from "./auth";
import { createPool } from "./db";

export const KNOWLEDGE_CAPABILITIES = [
  "manage_library",
  "clinical_review",
  "publish_knowledge",
  "manage_library_policy",
] as const;

export type KnowledgeCapability = (typeof KNOWLEDGE_CAPABILITIES)[number];

export async function resolveKnowledgeCapabilities(
  env: Env,
  organizationId: string,
  userId: string,
): Promise<KnowledgeCapability[]> {
  const pool = createPool(env);
  const result = await pool.query<{ capability: KnowledgeCapability }>(
    `SELECT capability
       FROM knowledge_capability_grants
      WHERE organization_id = $1 AND user_id = $2 AND revoked_at IS NULL
      ORDER BY capability`,
    [organizationId, userId],
  );
  return result.rows.map((row) => row.capability);
}

export function hasKnowledgeCapability(
  capabilities: readonly KnowledgeCapability[],
  capability: KnowledgeCapability,
): boolean {
  return capabilities.includes(capability);
}

export function requireKnowledgeCapability(
  capability: KnowledgeCapability,
): MiddlewareHandler<{ Bindings: Env; Variables: AuthVariables }> {
  return async (c, next) => {
    const user = c.get("user");
    const capabilities = await resolveKnowledgeCapabilities(
      c.env,
      user.organizationId,
      user.uid,
    );
    if (!hasKnowledgeCapability(capabilities, capability)) {
      return c.json(
        {
          data: null,
          error: {
            code: "FORBIDDEN",
            message: "Capability editorial necessária",
            requestId: c.get("requestId") ?? "unknown",
          },
        },
        403,
      );
    }
    await next();
  };
}
