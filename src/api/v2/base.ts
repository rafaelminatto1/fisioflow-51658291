import { getNeonAccessToken } from "@/lib/auth/neon-token";
import { getWorkersApiUrl } from "@/lib/api/config";

type RequestError = Error & {
  status?: number;
  payload?: unknown;
};

async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await getNeonAccessToken();
  return { Authorization: `Bearer ${token}` };
}

function getErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;

  const payload = body as {
    error?: unknown;
    message?: unknown;
    details?: unknown;
  };
  const base =
    typeof payload.error === "string"
      ? payload.error
      : typeof payload.message === "string"
        ? payload.message
        : fallback;

  return typeof payload.details === "string" && payload.details.trim()
    ? `${base}: ${payload.details}`
    : base;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeader();
  const url = `${getWorkersApiUrl()}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    const refreshedToken = await getNeonAccessToken({
      forceSessionReload: true,
    });
    const retry = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshedToken}`,
        ...options.headers,
      },
    });

    if (!retry.ok) {
      const retryBody = await retry.json().catch(() => ({ error: retry.statusText }));
      const error = new Error(getErrorMessage(retryBody, `HTTP ${retry.status}`)) as RequestError;
      error.status = retry.status;
      error.payload = retryBody;
      throw error;
    }

    return retry.json() as Promise<T>;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const error = new Error(getErrorMessage(body, `HTTP ${res.status}`)) as RequestError;
    error.status = res.status;
    error.payload = body;
    throw error;
  }

  const contentType = res.headers.get("Content-Type");
  if (contentType?.includes("application/pdf")) {
    return res.blob() as unknown as Promise<T>;
  }

  return res.json() as Promise<T>;
}

export async function requestPublic<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${getWorkersApiUrl()}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(getErrorMessage(body, `HTTP ${res.status}`));
  }

  return res.json() as Promise<T>;
}
