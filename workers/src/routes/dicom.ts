import { Hono } from 'hono';
import { createPool } from '../lib/db';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

function buildDicomUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

async function fetchDicom(env: Env, path: string, init?: RequestInit) {
  if (!env.DICOM_BASE_URL) {
    return null;
  }

  const headers = new Headers(init?.headers || {});
  if (env.DICOM_AUTH_TOKEN) {
    headers.set(env.DICOM_AUTH_HEADER || 'Authorization', env.DICOM_AUTH_TOKEN);
  }

  return fetch(buildDicomUrl(env.DICOM_BASE_URL, path), {
    ...init,
    headers,
  });
}

async function jsonOrEmpty(response: Response | null) {
  if (!response) return [];
  if (!response.ok) throw new Error(`DICOM upstream ${response.status}`);
  return response.json().catch(() => []);
}

app.use('/studies/*', requireAuth);
app.use('/instances', requireAuth);

app.get('/studies', async (c) => {
  const params = new URLSearchParams(c.req.query());
  if (!params.has('limit')) params.set('limit', '20');
  const data = await jsonOrEmpty(await fetchDicom(c.env, `studies?${params.toString()}`, {
    headers: {
      Accept: 'application/dicom+json',
    },
  }));
  return c.json({ data });
});

app.get('/studies/:studyUid/series', async (c) => {
  const { studyUid } = c.req.param();
  const data = await jsonOrEmpty(await fetchDicom(c.env, `studies/${encodeURIComponent(studyUid)}/series`, {
    headers: {
      Accept: 'application/dicom+json',
    },
  }));
  return c.json({ data });
});

app.get('/studies/:studyUid/series/:seriesUid/instances', async (c) => {
  const { studyUid, seriesUid } = c.req.param();
  const data = await jsonOrEmpty(
    await fetchDicom(c.env, `studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances`, {
      headers: {
        Accept: 'application/dicom+json',
      },
    }),
  );
  return c.json({ data });
});

app.post('/instances', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { body?: string; fileName?: string };
  const upstream = await fetchDicom(c.env, 'instances', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/dicom',
      'x-file-name': body.fileName || 'upload.dcm',
    },
    body: body.body || '',
  });

  if (!upstream) {
    return c.json({ data: { uploaded: false, fallback: true } }, 202);
  }

  const data = await upstream.json().catch(() => ({}));
  return c.json({ data }, upstream.ok ? 201 : 502);
});

app.get('/wado', async (c) => {
  const path = String(c.req.query('path') ?? '').trim();
  if (!path) return c.json({ error: 'path é obrigatório' }, 400);

  const upstream = await fetchDicom(c.env, path, {
    headers: {
      Accept: 'application/octet-stream',
    },
  });

  if (!upstream) {
    return c.json({ error: 'DICOM upstream não configurado' }, 503);
  }

  if (!upstream.ok) {
    return c.json({ error: 'Falha ao buscar frame DICOM' }, upstream.status as 400 | 401 | 403 | 404 | 500 | 502 | 503);
  }

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/octet-stream');
  headers.set('Cache-Control', 'public, max-age=300');
  return new Response(upstream.body, { status: 200, headers });
});

app.get('/config', requireAuth, async (c) => {
  const pool = createPool(c.env);
  const user = c.get('user');
  const org = await pool.query('SELECT id FROM organizations WHERE id = $1 LIMIT 1', [user.organizationId]);
  return c.json({
    data: {
      enabled: Boolean(c.env.DICOM_BASE_URL),
      organizationId: org.rows[0]?.id ?? null,
    },
  });
});

export { app as dicomRoutes };
