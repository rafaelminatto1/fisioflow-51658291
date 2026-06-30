import type { Env } from "../types/env";
import { mirrorToR2 } from "./media-mirror";

export const IG_GRAPH = "https://graph.instagram.com/v25.0";

export type InstagramProfile = {
  username: string | null;
  name: string | null;
  profilePic: string | null;
};

export type InstagramProfileBackfillResult = {
  scanned: number;
  updated: number;
  skipped: number;
  failed: number;
};

export type InstagramProfileSyncState = {
  lastSyncedAt: string | null;
  lastStatus: "synced" | "partial" | "error";
  lastResult: InstagramProfileBackfillResult | null;
  pendingCount: number | null;
};

/** Erro categorizado para distinguir falhas fatais de perfil-ausente */
export class InstagramApiError extends Error {
  public readonly statusCode: number;
  public readonly isAuthError: boolean;
  public readonly isRateLimit: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "InstagramApiError";
    this.statusCode = statusCode;
    this.isAuthError = statusCode === 401 || statusCode === 403;
    this.isRateLimit = statusCode === 429;
  }
}

type PoolLike = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

export function formatInstagramDisplayName(profile: {
  username: string | null;
  name: string | null;
}): string | null {
  if (profile.name && profile.username) {
    return `${profile.name} (@${profile.username})`;
  }
  if (profile.name) return profile.name;
  if (profile.username) return `@${profile.username}`;
  return null;
}

/**
 * Verifica se um token de longa duração do Instagram provavelmente expirou.
 * Tokens de longa duração são válidos por ~60 dias.
 */
export function isTokenLikelyExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false; // sem info de expiração, não assumptions
  try {
    return new Date(expiresAt).getTime() < Date.now();
  } catch {
    return false;
  }
}

/**
 * Busca o perfil público do remetente no Instagram (nome + @username + foto)
 * a partir do IGSID. Disponível para contatos que iniciaram conversa com a conta.
 *
 * Lança InstagramApiError para erros fatais (auth, rate limit) para que o
 * caller possa decidir parar ou continuar. Retorna null para perfis não encontrados
 * ou respostas malformadas (conta como "skipped").
 */
export async function fetchInstagramProfile(
  igsid: string,
  token: string | undefined,
): Promise<InstagramProfile | null> {
  if (!token) return null;

  try {
    const res = await fetch(
      `${IG_GRAPH}/${encodeURIComponent(igsid)}?fields=name,username,profile_pic&access_token=${encodeURIComponent(token)}`,
    );

    if (res.status === 401 || res.status === 403) {
      const data = (await res.json().catch(() => ({}))) as { error?: unknown };
      throw new InstagramApiError(
        `Instagram API auth falhou (${res.status}): ${JSON.stringify(data.error ?? "unknown")}`,
        res.status,
      );
    }

    if (res.status === 429) {
      throw new InstagramApiError(
        "Instagram API rate limit atingido — tentar novamente mais tarde",
        429,
      );
    }

    if (res.status === 404) {
      // Perfil não existe mais — skip silencioso
      return null;
    }

    if (!res.ok) {
      // Outros erros (5xx do Meta, etc.) — loga mas não aborta o batch inteiro
      const body = await res.text().catch(() => "");
      console.warn(
        `[Instagram Profile] fetchInstagramProfile status=${res.status} igsid=${igsid}:`,
        body.slice(0, 200),
      );
      return null;
    }

    const data = (await res.json()) as {
      name?: string;
      username?: string;
      profile_pic?: string;
      error?: unknown;
    };

    if (data && (data.name || data.username || data.profile_pic)) {
      return {
        name: data.name ?? null,
        username: data.username ?? null,
        profilePic: data.profile_pic ?? null,
      };
    }
  } catch (e) {
    // Re-throw InstagramApiError para que o caller decida
    if (e instanceof InstagramApiError) throw e;
    console.warn("[Instagram Profile] fetchInstagramProfile falhou:", e);
  }

  return null;
}

export async function backfillInstagramProfilesForOrganization(
  pool: PoolLike,
  orgId: string,
  igToken: string,
  options?: {
    limit?: number;
    force?: boolean;
    /** Quando presente, espelha o avatar no R2 (URL estável, sem 403 futuro). */
    env?: Env;
  },
): Promise<InstagramProfileBackfillResult> {
  const limit = Math.min(Math.max(Number(options?.limit ?? 100), 1), 300);
  const force = options?.force === true;

  const contactsResult = await pool.query(
    `SELECT DISTINCT wc.id, wc.wa_id, wc.username, wc.display_name, wc.avatar_url, wc.updated_at
     FROM whatsapp_contacts wc
     JOIN wa_conversations c ON c.contact_id = wc.id
     WHERE wc.organization_id = $1
       AND c.organization_id = $1
       AND c.channel = 'instagram'
       AND wc.wa_id IS NOT NULL
       AND (
         $2::boolean = true
         OR wc.username IS NULL
         OR wc.display_name IS NULL
         OR wc.avatar_url IS NULL
       )
     ORDER BY wc.updated_at DESC
     LIMIT $3`,
    [orgId, force, limit],
  );

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of contactsResult.rows) {
    let profile: InstagramProfile | null;
    try {
      profile = await fetchInstagramProfile(String(row.wa_id), igToken);
    } catch (e) {
      // Erro fatal do Instagram API (auth ou rate limit) — parar o batch
      if (e instanceof InstagramApiError) {
        if (e.isAuthError) {
          console.error(
            `[Instagram Profile] backfill abortado — token inválido/expirado para org=${orgId}:`,
            e.message,
          );
          // Contatos restantes contam como failed
          const remaining = contactsResult.rows.length - updated - skipped - failed;
          failed += remaining;
          throw e; // Propaga para que o endpoint retorne o erro adequado
        }
        if (e.isRateLimit) {
          console.warn(
            `[Instagram Profile] backfill interrompido — rate limit atingido após ${updated} updates para org=${orgId}`,
          );
          // Rate limit: conta os restantes como skipped (retryable)
          const remaining = contactsResult.rows.length - updated - skipped - failed;
          skipped += remaining;
          break; // Para o loop, mas retorna resultado parcial
        }
      }
      // Outros erros de fetch — skip individual
      failed += 1;
      continue;
    }

    if (!profile) {
      skipped += 1;
      continue;
    }

    const username = profile.username ?? null;
    const displayName = formatInstagramDisplayName({
      name: profile.name ?? null,
      username,
    });
    let avatarUrl = profile.profilePic ?? null;
    // Espelha o avatar no R2 — a URL do CDN do IG expira (causa dos 403).
    if (avatarUrl && options?.env) {
      avatarUrl = (await mirrorToR2(options.env, avatarUrl, "crm/instagram/avatars")) ?? avatarUrl;
    }

    if (!username && !displayName && !avatarUrl) {
      skipped += 1;
      continue;
    }

    try {
      await pool.query(
        `UPDATE whatsapp_contacts
         SET username = COALESCE($2, username),
             display_name = COALESCE($3, display_name),
             avatar_url = COALESCE($4, avatar_url),
             updated_at = now()
         WHERE id = $1`,
        [row.id, username, displayName, avatarUrl],
      );
      updated += 1;
    } catch (error) {
      failed += 1;
      console.error("[Instagram Profile] backfill update error:", {
        contactId: row.id,
        orgId,
        error,
      });
    }
  }

  return {
    scanned: contactsResult.rows.length,
    updated,
    skipped,
    failed,
  };
}

export function readInstagramProfileSyncState(
  settings: Record<string, unknown> | undefined,
): InstagramProfileSyncState | null {
  const crm = settings && typeof settings === "object" ? (settings.crm_whatsapp as Record<string, unknown> | undefined) : undefined;
  const raw = crm?.instagram_profile_sync;
  if (!raw || typeof raw !== "object") return null;

  const lastResultRaw = (raw as Record<string, unknown>).last_result;
  const lastResult =
    lastResultRaw && typeof lastResultRaw === "object"
      ? {
          scanned: Number((lastResultRaw as Record<string, unknown>).scanned ?? 0),
          updated: Number((lastResultRaw as Record<string, unknown>).updated ?? 0),
          skipped: Number((lastResultRaw as Record<string, unknown>).skipped ?? 0),
          failed: Number((lastResultRaw as Record<string, unknown>).failed ?? 0),
        }
      : null;

  const status = (raw as Record<string, unknown>).last_status;
  const normalizedStatus =
    status === "synced" || status === "partial" || status === "error" ? status : "synced";

  return {
    lastSyncedAt:
      typeof (raw as Record<string, unknown>).last_synced_at === "string"
        ? String((raw as Record<string, unknown>).last_synced_at)
        : null,
    lastStatus: normalizedStatus,
    lastResult,
    pendingCount:
      typeof (raw as Record<string, unknown>).pending_count === "number"
        ? Number((raw as Record<string, unknown>).pending_count)
        : typeof (raw as Record<string, unknown>).pending_count === "string"
          ? Number((raw as Record<string, unknown>).pending_count)
          : null,
  };
}

export async function persistInstagramProfileSyncState(
  pool: PoolLike,
  orgId: string,
  result: InstagramProfileBackfillResult,
  pendingCount: number,
) {
  let settingsRes: { rows: Record<string, unknown>[] };
  try {
    settingsRes = await pool.query(`SELECT settings FROM organizations WHERE id = $1 LIMIT 1`, [
      orgId,
    ]);
  } catch (dbErr) {
    console.error("[Instagram Profile] persistInstagramProfileSyncState: falhou ao ler settings:", dbErr);
    return null;
  }

  const settings = settingsRes.rows[0]?.settings;
  let parsed: Record<string, unknown>;
  try {
    parsed =
      settings && typeof settings === "object"
        ? (settings as Record<string, unknown>)
        : typeof settings === "string"
          ? (JSON.parse(settings) as Record<string, unknown>)
          : {};
  } catch (parseErr) {
    console.error("[Instagram Profile] persistInstagramProfileSyncState: JSON.parse falhou para settings:", parseErr);
    parsed = {};
  }

  const crm = (parsed.crm_whatsapp as Record<string, unknown>) ?? {};
  const nextCrm = {
    ...crm,
    instagram_profile_sync: {
      last_synced_at: new Date().toISOString(),
      last_status:
        result.failed > 0
          ? "partial"
          : result.updated > 0 || result.scanned > 0
            ? "synced"
            : "synced",
      last_result: result,
      pending_count: pendingCount,
    },
  };

  const nextSettings = { ...parsed, crm_whatsapp: nextCrm };
  try {
    await pool.query(`UPDATE organizations SET settings = $1::jsonb, updated_at = NOW() WHERE id = $2`, [
      JSON.stringify(nextSettings),
      orgId,
    ]);
  } catch (updateErr) {
    console.error("[Instagram Profile] persistInstagramProfileSyncState: falhou ao gravar settings:", updateErr);
    return null;
  }

  return {
    lastSyncedAt: String(nextCrm.instagram_profile_sync.last_synced_at),
    lastStatus:
      nextCrm.instagram_profile_sync.last_status === "error"
        ? "error"
        : nextCrm.instagram_profile_sync.last_status === "partial"
          ? "partial"
          : "synced",
    lastResult: result,
    pendingCount,
  };
}
