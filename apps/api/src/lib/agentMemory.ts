import type { Env } from "../types/env";
import { getRawSql } from "./db";

export type AgentMemoryScope = {
  organizationId: string;
  patientId?: string;
  therapistId?: string;
  profileType?: "organization" | "patient" | "professional";
};

export type AgentMemoryRememberInput = AgentMemoryScope & {
  content: string;
  sessionId?: string;
  profileTypes?: Array<"organization" | "patient" | "professional">;
};

export type AgentMemoryDriver = "native" | "pgvector";

// Driver nativo (Cloudflare Agent Memory) quando o binding existir;
// fallback pgvector no Neon enquanto o private beta nao for liberado (T064).
export function getAgentMemoryDriver(env: Env): AgentMemoryDriver | null {
  if (typeof env.AGENT_MEMORY?.getProfile === "function") return "native";
  if (env.AI && (env.HYPERDRIVE || env.NEON_URL)) return "pgvector";
  return null;
}

export function isAgentMemoryConfigured(env: Env): boolean {
  return getAgentMemoryDriver(env) !== null;
}

export function buildAgentMemoryProfile(scope: AgentMemoryScope): string {
  if (scope.profileType === "patient" && scope.patientId) {
    return `org:${scope.organizationId}|patient:${scope.patientId}`.slice(0, 100);
  }
  if (scope.profileType === "professional" && scope.therapistId) {
    return `org:${scope.organizationId}|professional:${scope.therapistId}`.slice(0, 100);
  }
  return `org:${scope.organizationId}`.slice(0, 100);
}

export function buildAgentMemoryProfiles(
  scope: AgentMemoryScope & { profileTypes?: Array<"organization" | "patient" | "professional"> },
): Array<{ type: "organization" | "patient" | "professional"; profile: string }> {
  const requested = scope.profileTypes?.length
    ? scope.profileTypes
    : (["organization", "patient", "professional"] as const);

  return requested
    .map((type) => {
      if (type === "patient" && !scope.patientId) return null;
      if (type === "professional" && !scope.therapistId) return null;
      return {
        type,
        profile: buildAgentMemoryProfile({ ...scope, profileType: type }),
      };
    })
    .filter((item): item is { type: "organization" | "patient" | "professional"; profile: string } =>
      Boolean(item),
    );
}

export async function rememberAgentMemory(env: Env, input: AgentMemoryRememberInput): Promise<{
  configured: boolean;
  driver?: AgentMemoryDriver;
  memories?: Array<{ type: string; profile: string; memory: unknown }>;
}> {
  const driver = getAgentMemoryDriver(env);
  if (!driver) return { configured: false };
  if (driver === "pgvector") return rememberPgvector(env, input);

  const profiles = buildAgentMemoryProfiles(input);
  const memories = await Promise.all(
    profiles.map(async ({ type, profile }) => {
      const memoryProfile = await env.AGENT_MEMORY!.getProfile(profile);
      const memory = await memoryProfile.remember({
        content: sanitizeMemoryContent(input.content),
        sessionId: input.sessionId ?? null,
      });
      return { type, profile, memory };
    }),
  );
  return { configured: true, driver: "native", memories };
}

export async function recallAgentMemory(env: Env, input: AgentMemoryScope & { query: string }): Promise<{
  configured: boolean;
  driver?: AgentMemoryDriver;
  answer?: string;
  recalls?: Array<{ type: string; profile: string; answer?: string; candidates?: unknown[]; count?: number }>;
  count?: number;
}> {
  const driver = getAgentMemoryDriver(env);
  if (!driver) return { configured: false };
  if (driver === "pgvector") return recallPgvector(env, input);

  const profiles = buildAgentMemoryProfiles(input);
  const recalls = await Promise.all(
    profiles.map(async ({ type, profile }) => {
      const memoryProfile = await env.AGENT_MEMORY!.getProfile(profile);
      const result = await memoryProfile.recall(sanitizeRecallQuery(input.query), {
        thinkingLevel: "medium",
        responseLength: "medium",
        referenceDate: new Date().toISOString(),
      });
      return {
        type,
        profile,
        answer: result.answer,
        candidates: result.candidates,
        count: result.count,
      };
    }),
  );

  return {
    configured: true,
    driver: "native",
    answer: recalls
      .map((recall) => recall.answer)
      .filter(Boolean)
      .join("\n\n"),
    recalls,
    count: recalls.reduce((sum, recall) => sum + Number(recall.count ?? 0), 0),
  };
}

async function embedText(env: Env, text: string): Promise<number[] | null> {
  try {
    const response = (await env.AI.run("@cf/baai/bge-m3", { text: [text] })) as {
      data?: number[][];
    };
    return response.data?.[0] ?? null;
  } catch (error) {
    console.error("[agentMemory] embedding failed:", error);
    return null;
  }
}

async function rememberPgvector(env: Env, input: AgentMemoryRememberInput): Promise<{
  configured: boolean;
  driver?: AgentMemoryDriver;
  memories?: Array<{ type: string; profile: string; memory: unknown }>;
}> {
  const content = sanitizeMemoryContent(input.content);
  const embedding = await embedText(env, content);
  const profiles = buildAgentMemoryProfiles(input);
  const profileTypes = profiles.map((p) => p.type);

  const sql = getRawSql(env, "write");
  const rows = await sql`
    INSERT INTO agent_memories (
      organization_id, patient_id, therapist_id, session_id, profile_types, content, embedding
    )
    VALUES (
      ${input.organizationId}::uuid,
      ${input.patientId ?? null},
      ${input.therapistId ?? null},
      ${input.sessionId ?? null},
      ${profileTypes},
      ${content},
      ${embedding ? JSON.stringify(embedding) : null}::vector
    )
    RETURNING id, created_at
  `;

  return {
    configured: true,
    driver: "pgvector",
    memories: profiles.map(({ type, profile }) => ({ type, profile, memory: rows.rows?.[0] ?? null })),
  };
}

async function recallPgvector(env: Env, input: AgentMemoryScope & { query: string }): Promise<{
  configured: boolean;
  driver?: AgentMemoryDriver;
  answer?: string;
  recalls?: Array<{ type: string; profile: string; answer?: string; candidates?: unknown[]; count?: number }>;
  count?: number;
}> {
  const query = sanitizeRecallQuery(input.query);
  const embedding = await embedText(env, query);
  if (!embedding) return { configured: true, driver: "pgvector", answer: "", recalls: [], count: 0 };

  const sql = getRawSql(env, "read");
  const result = await sql`
    SELECT id, content, profile_types, patient_id, therapist_id, created_at,
           1 - (embedding <=> ${JSON.stringify(embedding)}::vector) AS similarity
    FROM agent_memories
    WHERE organization_id = ${input.organizationId}::uuid
      AND embedding IS NOT NULL
      AND (${input.patientId ?? null}::uuid IS NULL OR patient_id = ${input.patientId ?? null}::uuid OR patient_id IS NULL)
      AND (${input.therapistId ?? null} IS NULL OR therapist_id = ${input.therapistId ?? null} OR therapist_id IS NULL)
    ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
    LIMIT 8
  `;

  const rows: Array<{ content: string; similarity: number }> = result.rows ?? [];
  const relevant = rows.filter((row) => Number(row.similarity ?? 0) >= 0.45);

  return {
    configured: true,
    driver: "pgvector",
    answer: relevant.map((row) => `- ${row.content}`).join("\n"),
    recalls: [
      {
        type: "pgvector",
        profile: buildAgentMemoryProfile(input),
        candidates: relevant,
        count: relevant.length,
      },
    ],
    count: relevant.length,
  };
}

function sanitizeMemoryContent(content: string): string {
  return content.trim().replace(/\s+/g, " ").slice(0, 4_000);
}

function sanitizeRecallQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").slice(0, 1_000);
}
