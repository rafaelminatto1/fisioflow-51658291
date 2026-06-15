import type { Env } from "../../types/env";

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export function buildEutilsUrl(
  env: Pick<Env, "NCBI_API_KEY" | "NCBI_EMAIL">,
  endpoint: string,
  params: Record<string, string | number | undefined>,
): string {
  const url = new URL(`${EUTILS_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }
  url.searchParams.set("tool", "fisioflow");
  if (env.NCBI_EMAIL) url.searchParams.set("email", env.NCBI_EMAIL);
  if (env.NCBI_API_KEY) url.searchParams.set("api_key", env.NCBI_API_KEY);
  return url.toString();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function eutilsFetch<T = unknown>(
  env: Pick<Env, "NCBI_API_KEY" | "NCBI_EMAIL">,
  endpoint: string,
  params: Record<string, string | number | undefined>,
  opts: { maxRetries?: number; baseDelayMs?: number; raw?: boolean } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 300, raw = false } = opts;
  const url = buildEutilsUrl(env, endpoint, params);
  let attempt = 0;
  while (true) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= maxRetries) throw new Error(`NCBI ${endpoint} failed: ${res.status}`);
      await sleep(baseDelayMs * 2 ** attempt);
      attempt++;
      continue;
    }
    if (!res.ok) throw new Error(`NCBI ${endpoint} failed: ${res.status}`);
    return raw ? ((await res.text()) as unknown as T) : ((await res.json()) as T);
  }
}

export async function acquireNcbiSlot(
  db: D1Database | undefined,
  perSecond = 10,
): Promise<boolean> {
  if (!db) return true;
  const windowStart = Math.floor(Date.now() / 1000);
  const key = "ncbi:global";
  await db
    .prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1`,
    )
    .bind(key, windowStart)
    .run();
  const row = (await db
    .prepare(`SELECT count FROM rate_limits WHERE key = ? AND window_start = ?`)
    .bind(key, windowStart)
    .first()) as { count: number } | null;
  return (row?.count ?? 0) < perSecond;
}
