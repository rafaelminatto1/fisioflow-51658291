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

app.get('/', (c) => c.text('Jules PR Bot is alive! 🦾'));

app.post('/webhook', async (c) => {
  const signature = c.req.header('x-hub-signature-256');
  const payload = await c.req.json();
  const event = c.req.header('x-github-event');

  // TODO: Implement HMAC validation using WEBHOOK_SECRET
  // For now, let's proceed with the logic if token is present
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
      // 1. Fetch the diff
      const { data: diff } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number,
        mediaType: { format: 'diff' },
      });

      if (typeof diff !== 'string') throw new Error('Could not fetch diff');

      // 2. Parse and Analyze
      const summary = await jules.summarizeChanges(diff);
      const chunks = parseDiff(diff);
      
      let reviewBody = `## 🦾 Jules PR Review\n\n### 📊 Summary\n${summary}\n\n`;
      reviewBody += `### 🔍 Detailed Analysis\n`;

      for (const chunk of chunks.slice(0, 10)) { // Limit to 10 files to avoid context blowout
        if (chunk.file.includes('lock') || chunk.file.includes('json')) continue;
        
        const review = await jules.reviewFile(chunk.file, chunk.content);
        reviewBody += `#### 📝 ${chunk.file}\n${review}\n\n`;
      }

      // 3. Post a comment
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
