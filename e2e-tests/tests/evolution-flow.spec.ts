import { test, expect } from '@playwright/test';

test.describe('Evolution Flow', () => {
  test('test evolution page loads directly', async ({ page }) => {
    // Try to access a specific appointment's evolution page
    await page.goto('https://fisioflow-migration.web.app/evolution/06ba8acc-c8b4-4c26-949f-6f94f85a3ed8');

    // Check if we need to login
    await page.waitForTimeout(2000);
    const hasEmailInput = await page.locator('input[type="email"]').count();
    if (hasEmailInput > 0) {
      await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
      await page.fill('input[type="password"]', 'Yukari30@');
      await page.click('button[type="submit"]');

      // Wait for navigation back to evolution page
      await page.waitForTimeout(5000);
    }

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Screenshot
    await page.screenshot({ path: 'test-results/direct-evolution.png', fullPage: true });

    // Check for errors
    const unauthorized = await page.getByText('Acesso não autorizado').count();
    console.log('Direct access - Unauthorized:', unauthorized > 0 ? 'YES' : 'NO');

    const loading = await page.getByText('Carregando').count();
    console.log('Still loading:', loading > 0 ? 'YES' : 'NO');

    // Check for page content
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);

    // Check for any text areas or form inputs (SOAP notes)
    const textAreas = await page.locator('textarea, [contenteditable="true"]').count();
    console.log('Text areas found:', textAreas);

    // Expect no unauthorized error
    expect(unauthorized).toBe(0);
  });

  test('test patients list shows data', async ({ page }) => {
    // Navigate to patients page (should redirect to login if not authenticated)
    await page.goto('https://fisioflow-migration.web.app/patients');

    // Check if we need to login
    await page.waitForTimeout(2000);
    const hasEmailInput = await page.locator('input[type="email"]').count();
    if (hasEmailInput > 0) {
      await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
      await page.fill('input[type="password"]', 'Yukari30@');
      await page.click('button[type="submit"]');

      // Wait for navigation
      await page.waitForTimeout(5000);
      await page.goto('https://fisioflow-migration.web.app/patients');
    }

    // Wait for patients to load
    await page.waitForTimeout(3000);

    // Check if patients are displayed
    const patientsCount = await page.locator('table tbody tr, [data-testid*="patient"]').count();
    console.log('Patients count:', patientsCount);

    // Take screenshot
    await page.screenshot({ path: 'test-results/patients-list.png', fullPage: true });

    // Expect some patients to be visible
    expect(patientsCount).toBeGreaterThan(0);
  });

  test('test agenda and iniciar button', async ({ page }) => {
    // Navigate to agenda
    await page.goto('https://fisioflow-migration.web.app/agenda');

    // Check if we need to login
    await page.waitForTimeout(2000);
    const hasEmailInput = await page.locator('input[type="email"]').count();
    if (hasEmailInput > 0) {
      await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
      await page.fill('input[type="password"]', 'Yukari30@');
      await page.click('button[type="submit"]');

      // Wait for navigation
      await page.waitForTimeout(5000);
      await page.goto('https://fisioflow-migration.web.app/agenda');
    }

    await page.waitForTimeout(3000);

    // Screenshot agenda
    await page.screenshot({ path: 'test-results/agenda.png', fullPage: true });

    // Look for "Iniciar" button
    const iniciarBtn = page.getByText(/Iniciar/i);
    const hasIniciar = await iniciarBtn.count();

    console.log('Iniciar buttons found:', hasIniciar);

    if (hasIniciar > 0) {
      await iniciarBtn.first().click();
      await page.waitForTimeout(3000);

      // Screenshot evolution page
      await page.screenshot({ path: 'test-results/after-iniciar.png', fullPage: true });

      // Check if we're on evolution page (not "Acesso não autorizado")
      const unauthorized = await page.getByText('Acesso não autorizado').count();
      console.log('Unauthorized error:', unauthorized > 0 ? 'YES' : 'NO');

      expect(unauthorized).toBe(0);
    } else {
      console.log('No "Iniciar" button found');
    }
  });

  test('full flow: login -> agenda -> new appointment -> start attendance -> fill evolution SOAP', async ({ page }) => {
    page.setDefaultNavigationTimeout(45000);
    page.setDefaultTimeout(20000);

    const baseURL = process.env.BASE_URL || 'http://localhost:8085';
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });

    // Login if on auth page
    await page.waitForTimeout(1500);
    const hasEmailInput = await page.locator('input[type="email"]').count();
    if (hasEmailInput > 0) {
      await page.getByPlaceholder(/nome@exemplo|email/i).fill('rafael.minatto@yahoo.com.br');
      await page.getByPlaceholder(/••••/).fill('Yukari30@');
      await page.getByRole('button', { name: /Entrar na Plataforma/i }).click();
      await page.waitForTimeout(3500);
    }

    await page.goto(baseURL + '/?view=week&date=' + new Date().toISOString().split('T')[0], { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.getByRole('button', { name: /Novo Agendamento/i }).click();
    await page.waitForTimeout(1000);

    await page.getByText(/Selecione o paciente/i).click();
    await page.waitForTimeout(600);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: /Agendar|Criar/i }).click();
    await page.waitForTimeout(2500);

    const card = page.getByRole('button', { name: /agendado/i }).first();
    await card.click();
    await page.waitForTimeout(800);

    await page.getByRole('button', { name: /Iniciar atendimento/i }).click();
    await page.waitForURL(/\/patient-evolution\//, { timeout: 15000 });
    await page.waitForTimeout(2000);

    const fillIfPresent = async (placeholderSubstr: string, value: string) => {
      const ta = page.getByPlaceholder(new RegExp(placeholderSubstr, 'i'));
      if (await ta.count() > 0) {
        await ta.first().fill(value);
        await page.waitForTimeout(300);
      }
    };

    await fillIfPresent('Queixas do paciente', 'Paciente relata melhora da dor lombar após últimas sessões. Refere desconforto leve ao acordar.');
    await fillIfPresent('Achados clínicos', 'ADM coluna preservada. Teste de elevação de perna 70° bilateral. Força 5/5 MMII.');
    await fillIfPresent('Análise clínica', 'Evolução favorável. Lombalgia mecânica em melhora. Manter conduta.');
    await fillIfPresent('Conduta, exercícios', 'Continuar cinesioterapia 2x/semana. Exercícios de core em casa. Reavaliação em 2 semanas.');

    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'test-results/evolution-filled.png', fullPage: true });

    const body = await page.locator('textarea').first().inputValue().catch(() => '');
    expect(body.length).toBeGreaterThan(0);
  });
});
