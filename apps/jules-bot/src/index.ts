import { Hono } from 'hono';
import { Octokit } from 'octokit';
import { JulesAI, parseDiff } from '@fisioflow/jules';

type Env = {
  GITHUB_TOKEN: string;
  GEMINI_API_KEY: string;
  WEBHOOK_SECRET: string;
  DATABASE_URL: string;
};

const app = new Hono<{ Bindings: Env }>();

/** Verifica assinatura HMAC-SHA256 do GitHub webhook */
async function verifyGitHubSignature(
  secret: string,
  body: string,
  signature: string | undefined,
): Promise<boolean> {
  if (!signature || !signature.startsWith('sha256=')) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expectedHex = 'sha256=' + Array.from(new Uint8Array(expected))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  // Comparação em tempo constante para evitar timing attacks
  if (expectedHex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    diff |= expectedHex.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

app.get('/', (c) => c.text('Jules PR Bot is alive! 🦾'));

app.post('/webhook', async (c) => {
  const signature = c.req.header('x-hub-signature-256');
  const rawBody = await c.req.text();

  // Validar HMAC antes de qualquer processamento
  if (!c.env.WEBHOOK_SECRET) {
    return c.json({ error: 'WEBHOOK_SECRET não configurado' }, 500);
  }
  const valid = await verifyGitHubSignature(c.env.WEBHOOK_SECRET, rawBody, signature);
  if (!valid) {
    return c.json({ error: 'Assinatura inválida' }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Payload inválido' }, 400);
  }

  const event = c.req.header('x-github-event');

  if (!c.env.GITHUB_TOKEN) {
    return c.json({ error: 'Config missing' }, 500);
  }

  if (event === 'pull_request' && (payload.action === 'opened' || payload.action === 'synchronize')) {
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const pull_number = payload.pull_request.number;

    const octokit = new Octokit({ auth: c.env.GITHUB_TOKEN });
    const jules = new JulesAI(c.env.GEMINI_API_KEY);

    try {
      const { data: diff } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number,
        mediaType: { format: 'diff' },
      });

      if (typeof diff !== 'string') throw new Error('Could not fetch diff');

      const summary = await jules.summarizeChanges(diff);
      const chunks = parseDiff(diff);

      let reviewBody = `## 🦾 Jules PR Review\n\n### 📊 Summary\n${summary}\n\n`;
      reviewBody += `### 🔍 Detailed Analysis\n`;

      for (const chunk of chunks.slice(0, 10)) {
        if (chunk.file.includes('lock') || chunk.file.includes('json')) continue;
        const review = await jules.reviewFile(chunk.file, chunk.content);
        reviewBody += `#### 📝 ${chunk.file}\n${review}\n\n`;
      }

      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: reviewBody,
      });

      return c.json({ status: 'Review posted' });
    } catch (error: any) {
      console.error(error);
      return c.json({ error: error.message }, 500);
    }
  }

  return c.json({ status: 'Ignored' });
});

export default app;
