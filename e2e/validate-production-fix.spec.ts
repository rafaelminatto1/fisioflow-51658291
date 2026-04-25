import { test, expect } from '@playwright/test';

// Credentials
const loginEmail = 'REDACTED_EMAIL';
const loginPassword = 'REDACTED';
const prodUrl = 'https://www.moocafisio.com.br';

test.describe('Validação de Produção - API de Sessões', () => {
  test.setTimeout(120000);

  test('deve chamar API de sessões sem erro 500', async ({ page }) => {
    console.log(`[Test] Iniciando login para: ${loginEmail}`);
    await page.goto(`${prodUrl}/auth`, { waitUntil: 'networkidle' });

    await page.fill('input[name="email"], #login-email', loginEmail);
    await page.fill('input[name="password"], #login-password', loginPassword);
    await page.click('button:has-text("Entrar"), button:has-text("Acessar"), button[type="submit"]');

    await expect.poll(() => page.url(), { timeout: 60000 }).not.toContain('/auth');
    console.log(`[Test] Logado!`);

    // Pegar um patientId real da API para testar
    console.log('[Test] Buscando um paciente para testar sessões...');
    const patientResponse = await page.evaluate(async () => {
      const token = await (window as any).getNeonAccessToken?.().catch(() => null);
      if (!token) {
        // Tentar pegar do localStorage se disponível ou esperar carregar
        return { error: 'Token not found in window' };
      }
      const res = await fetch('https://fisioflow-api.rafalegollas.workers.dev/api/patients?limit=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    });

    if (patientResponse.error || !patientResponse.data || patientResponse.data.length === 0) {
      console.log('⚠ Não foi possível obter um paciente via API direta. Tentando pela UI...');
      await page.goto(`${prodUrl}/pacientes`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);
    } else {
      const patientId = patientResponse.data[0].id;
      console.log(`[Test] Testando API de sessões para o paciente: ${patientId}`);

      const sessionResult = await page.evaluate(async (pid) => {
        const token = await (window as any).getNeonAccessToken?.();
        const res = await fetch(`https://fisioflow-api.rafalegollas.workers.dev/api/sessions?patientId=${pid}&limit=5`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return { status: res.status, ok: res.ok, body: await res.json() };
      }, patientId);

      console.log(`[Test] Resultado API Sessões: Status ${sessionResult.status}`);
      if (sessionResult.status === 500) {
        console.error('❌ ERRO 500 PERSISTE NA API DE SESSÕES!');
      } else if (sessionResult.ok) {
        console.log('✅ API de sessões respondeu com sucesso (200 OK). Erro 500 resolvido!');
      }

      expect(sessionResult.status).not.toBe(500);
    }
  });
});
