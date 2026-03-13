import { getNeonAccessToken } from '@/lib/auth/neon-token';
import { getWorkersApiUrl } from '@/lib/api/config';

const BASE_URL = getWorkersApiUrl();

type RequestError = Error & {
  status?: number;
  payload?: unknown;
};

async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await getNeonAccessToken();
  return { Authorization: `Bearer ${token}` };
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const authHeaders = await getAuthHeader();
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    const refreshedToken = await getNeonAccessToken({ forceSessionReload: true });
    const retry = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshedToken}`,
        ...options.headers,
      },
    });

    if (!retry.ok) {
      const retryBody = await retry.json().catch(() => ({ error: retry.statusText }));
      const error = new Error(retryBody?.error ?? `HTTP ${retry.status}`) as RequestError;
      error.status = retry.status;
      error.payload = retryBody;
      throw error;
    }

    return retry.json() as Promise<T>;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const error = new Error(body?.error ?? `HTTP ${res.status}`) as RequestError;
    error.status = res.status;
    error.payload = body;
    throw error;
  }

  return res.json() as Promise<T>;
}

export async function requestPublic<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}
