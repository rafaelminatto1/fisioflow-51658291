import { config } from "../config";
import { getToken } from "../token-storage";

export { config } from "../config";
export { getToken } from "../token-storage";

export class ApiError extends Error {
  constructor(
    public endpoint: string,
    public status: number,
    public message: string,
  ) {
    super(`API Error [${endpoint}]: ${status} - ${message}`);
    this.name = "ApiError";
  }
}

async function getAuthToken(): Promise<string> {
  const token = await getToken();
  if (!token) {
    throw new Error("User not authenticated");
  }
  return token;
}

export function cleanRequestData(data: any): any {
  if (Array.isArray(data)) {
    return data.map((item) => cleanRequestData(item));
  }
  if (typeof data !== "object" || data === null) {
    return data;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = typeof value === "object" && value !== null ? cleanRequestData(value) : value;
    }
  }
  return cleaned;
}

export interface FetchOptions extends RequestInit {
  data?: any;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  skipAuth?: boolean;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const token = options.skipAuth ? null : await getAuthToken();
  const { data, params, timeout = 10000, ...fetchInit } = options;

  let baseUrl = config.apiUrl;
  if (baseUrl.endsWith("/") && endpoint.startsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  } else if (!baseUrl.endsWith("/") && !endpoint.startsWith("/")) {
    baseUrl = baseUrl + "/";
  }

  if (baseUrl.endsWith("/api") && endpoint.startsWith("/api")) {
    baseUrl = baseUrl.slice(0, -4);
  }

  let url = `${baseUrl}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const method = fetchInit.method || (data ? "POST" : "GET");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    (headers as any)["Authorization"] = `Bearer ${token.trim()}`;
  }

  if (fetchInit.headers) {
    Object.assign(headers, fetchInit.headers);
  }

  const body = data ? JSON.stringify(cleanRequestData(data)) : undefined;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchInit,
      method,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch {
        // Silently fail json parse
      }
      throw new ApiError(endpoint, response.status, errorMessage);
    }

    return (await response.json()) as T;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new Error("Tempo de conexão esgotado (timeout)");
    }
    throw error;
  }
}
