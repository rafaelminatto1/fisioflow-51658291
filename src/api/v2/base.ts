import { getNeonAccessToken } from "@/lib/auth/neon-token";
import { getWorkersApiUrl } from "@/lib/api/config";
type RequestError = Error & {
  status?: number;
  payload?: unknown;
};

/**
 * Resposta sintética que `request()` retorna quando enfileira uma mutação
 * offline. Use {@link isOfflineEnqueuedResponse} para detectar e tratar.
 */
export interface OfflineEnqueuedResponse {
  success: true;
  offline: true;
}

export function isOfflineEnqueuedResponse(value: unknown): value is OfflineEnqueuedResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { offline?: unknown }).offline === true &&
    (value as { success?: unknown }).success === true
  );
}

/**
 * Wrapper de tipo para retornos que podem ser uma entidade real OU um
 * placeholder optimista marcado com `__offline: true`. Use nos hooks de
 * mutation que precisam diferenciar offline de online.
 *
 * Exemplo:
 *   onSuccess: (data: MaybeOffline<AppointmentBase>) => {
 *     if (isOfflinePlaceholder(data)) { ... }
 *   }
 */
export type MaybeOffline<T> = T | (Partial<T> & { __offline: true; id: string });

export function isOfflinePlaceholder<T>(
  value: MaybeOffline<T> | undefined | null,
): value is Partial<T> & { __offline: true; id: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { __offline?: unknown }).__offline === true
  );
}

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

export async function request<T>(
  path: string,
  options: RequestInit & { keepalive?: boolean } = {},
): Promise<T> {
  const authHeaders = await getAuthHeader();
  const baseUrl = getWorkersApiUrl();
  const url = path.startsWith("http://") || path.startsWith("https://")
    ? path
    : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const method = options.method || "GET";
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  try {
    const res = await fetch(url, {
      ...options,
      keepalive: options.keepalive,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
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
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          Authorization: `Bearer ${refreshedToken}`,
          ...options.headers,
        },
      });

      if (!retry.ok) {
        let retryBody: Record<string, unknown> = {};
        try {
          retryBody = (await retry.json()) as Record<string, unknown>;
        } catch {
          retryBody = { error: retry.statusText, parseError: true };
        }
        const error = new Error(getErrorMessage(retryBody, `HTTP ${retry.status}`)) as RequestError;
        error.status = retry.status;
        error.payload = retryBody;
        throw error;
      }

      return retry.json() as Promise<T>;
    }

    if (!res.ok) {
      let body: Record<string, unknown> = {};
      try {
        body = (await res.json()) as Record<string, unknown>;
      } catch {
        body = { error: res.statusText, parseError: true };
      }
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
  } catch (error) {
    // Interceptar erro de rede se for mutação e estiver offline
    if (
      method !== "GET" &&
      typeof navigator !== "undefined" &&
      !navigator.onLine &&
      (error instanceof TypeError || (error as Error).message.includes("Failed to fetch"))
    ) {
      console.warn(`[API] Offline detectado. Enfileirando ${method} ${path}`);

      const { enqueueAction } = await import("@/services/offlineSync");
      await enqueueAction("API_REQUEST", {
        url: path,
        method,
        body: options.body,
      });

      // Notifica o usuário que a ação foi salva offline
      try {
        const { toast } = await import("sonner");
        toast.info("Você está offline. A ação será sincronizada quando a conexão retornar.", {
          duration: 5000,
        });
      } catch {
        // toast pode não estar disponível em todos os contextos
      }

      // Simular retorno de sucesso para o hook não quebrar
      return { success: true, offline: true } as unknown as T;
    }
    throw error;
  }
}

/**
 * Faz download autenticado de conteúdo binário sem expor URLs públicas do R2.
 * O chamador é responsável por criar e revogar a URL local do Blob.
 */
export async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const baseUrl = getWorkersApiUrl();
  const url = path.startsWith("http://") || path.startsWith("https://")
    ? path
    : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const fetchBlob = async (forceSessionReload = false) => {
    const token = await getNeonAccessToken({ forceSessionReload });
    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  };

  let response = await fetchBlob();
  if (response.status === 401) response = await fetchBlob(true);
  if (!response.ok) {
    let body: unknown;
    try { body = await response.json(); } catch { body = undefined; }
    const error = new Error(getErrorMessage(body, `HTTP ${response.status}`)) as RequestError;
    error.status = response.status;
    error.payload = body;
    throw error;
  }
  return response.blob();
}

export async function requestPublic<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getWorkersApiUrl();
  const url = path.startsWith("http://") || path.startsWith("https://")
    ? path
    : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

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
