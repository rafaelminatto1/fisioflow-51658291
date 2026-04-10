import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();
const mockSend = vi.fn();
const mockGetSignedUrl = vi.fn();

vi.mock('../../lib/db', () => ({
  createPool: vi.fn(() => ({ query: mockQuery })),
}));

vi.mock('../../lib/auth', () => ({
  requireAuth: vi.fn(async (c: any, next: any) => {
    c.set('user', {
      uid: 'user-media-001',
      organizationId: 'org-test-001',
      role: 'admin',
      email: 'media@example.com',
    });
    await next();
  }),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'uuid-fixed-123'),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function S3Client() {
    return { send: mockSend };
  }),
  PutObjectCommand: vi.fn(function PutObjectCommand(input) {
    return { input };
  }),
  DeleteObjectCommand: vi.fn(function DeleteObjectCommand(input) {
    return { input };
  }),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn((...args) => mockGetSignedUrl(...args)),
}));

async function buildApp() {
  const { Hono } = await import('hono');
  const { mediaRoutes } = await import('../media');
  const app = new Hono<any>();
  app.route('/api/media', mediaRoutes);
  return app;
}

function makeRequest(method: string, path: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer fake-token',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const BASE_ENV = {
  HYPERDRIVE: {},
  ALLOWED_ORIGINS: '*',
  ENVIRONMENT: 'development',
  R2_ACCOUNT_ID: 'acc-test',
  R2_ACCESS_KEY_ID: 'key-test',
  R2_SECRET_ACCESS_KEY: 'secret-test',
  R2_PUBLIC_URL: 'https://media.example.com',
} as const;

describe('media routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSignedUrl.mockResolvedValue('https://signed.example.com/upload');
  });

  it('POST /api/media/upload-url rejects unsupported content types', async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest('POST', '/api/media/upload-url', {
        contentType: 'application/zip',
        folder: 'patient-exams',
      }),
      BASE_ENV as any,
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: 'Tipo de arquivo não suportado',
    });
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it('POST /api/media/upload-url accepts application/pdf', async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest('POST', '/api/media/upload-url', {
        contentType: 'application/pdf',
        folder: 'patient-exams',
      }),
      BASE_ENV as any,
    );

    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.key).toContain('.pdf');
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('POST /api/media/upload-url sanitizes folder and returns signed upload metadata', async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest('POST', '/api/media/upload-url', {
        contentType: 'image/png',
        folder: '../patient-exams/unsafe path',
      }),
      BASE_ENV as any,
    );

    expect(res.status).toBe(200);
    const json = await res.json() as any;

    expect(json.data.uploadUrl).toBe('https://signed.example.com/upload');
    expect(json.data.key).toContain('/user-media-001/');
    expect(json.data.key).toMatch(/^patient-examsunsafepath\/\d{4}-\d{2}-\d{2}\/user-media-001\/uuid-fixed-123\.png$/);
    expect(json.data.publicUrl).toBe(`https://media.example.com/${json.data.key}`);
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('DELETE /api/media/:key blocks deletion for files owned by another user', async () => {
    const app = await buildApp();
    const res = await app.fetch(
      makeRequest(
        'DELETE',
        '/api/media/patient-exams/2026-04-05/user-other-001/file.png',
      ),
      BASE_ENV as any,
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({
      error: 'Acesso negado para remover este arquivo',
    });
    expect(mockSend).not.toHaveBeenCalled();
  });
});
