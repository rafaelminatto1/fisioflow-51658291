import type { Env } from "../types/env";

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

export function isAgentMemoryConfigured(env: Env): boolean {
  return typeof env.AGENT_MEMORY?.getProfile === "function";
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
  memories?: Array<{ type: string; profile: string; memory: unknown }>;
}> {
  if (!isAgentMemoryConfigured(env)) return { configured: false };

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
  return { configured: true, memories };
}

export async function recallAgentMemory(env: Env, input: AgentMemoryScope & { query: string }): Promise<{
  configured: boolean;
  answer?: string;
  recalls?: Array<{ type: string; profile: string; answer?: string; candidates?: unknown[]; count?: number }>;
  count?: number;
}> {
  if (!isAgentMemoryConfigured(env)) return { configured: false };

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
    answer: recalls
      .map((recall) => recall.answer)
      .filter(Boolean)
      .join("\n\n"),
    recalls,
    count: recalls.reduce((sum, recall) => sum + Number(recall.count ?? 0), 0),
  };
}

function sanitizeMemoryContent(content: string): string {
  return content.trim().replace(/\s+/g, " ").slice(0, 4_000);
}

function sanitizeRecallQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").slice(0, 1_000);
}
