// Setup para testes de Edge Functions
import { beforeEach, vi } from 'vitest';

// Mock global do Deno
globalThis.Deno = {
  env: {
    get: vi.fn((key: string) => {
      const env: Record<string, string> = {
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      };
      return env[key] || undefined;
    }),
  },
} as any;

// Mock do Request
globalThis.Request = class Request {
  url: string;
  method: string;
  headers: Headers;
  body: any;

  constructor(input: string | Request, init?: RequestInit) {
    if (typeof input === 'string') {
      this.url = input;
    } else {
      this.url = input.url;
    }
    this.method = init?.method || 'GET';
    this.headers = new Headers(init?.headers);
    this.body = init?.body;
  }

  async json() {
    return this.body ? JSON.parse(this.body) : {};
  }

  async text() {
    return this.body || '';
  }
} as any;

// Mock do Response
globalThis.Response = class Response {
  status: number;
  statusText: string;
  headers: Headers;
  body: any;

  constructor(body?: any, init?: ResponseInit) {
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.headers = new Headers(init?.headers);
    this.body = body;
  }

  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
  }

  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
  }
} as any;

beforeEach(() => {
  vi.clearAllMocks();
});

