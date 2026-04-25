/**
 * @fisioflow/shared-api/src/client.ts
 * Unified, Type-safe API Client for FisioFlow
 */

import { ApiError } from "./index";

export interface ClientConfig {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

export class FisioFlowClient {
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.config.getToken();
    const url = `${this.config.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error: ApiError = {
        error: (json as any).error || "API Error",
        message: (json as any).message || `HTTP ${response.status}`,
        code: (json as any).code,
        details: (json as any).details,
      };
      throw error;
    }

    // Extract data if nested in ApiResponse
    if (json && typeof json === "object" && "data" in json) {
      return (json as any).data as T;
    }

    return json as T;
  }

  get<T>(endpoint: string, params?: Record<string, string>) {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    return this.request<T>(url, { method: "GET" });
  }

  post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}
