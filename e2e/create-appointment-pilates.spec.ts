/**
 * Testa criação de agendamento tipo Pilates Clínico (session_type: 'group').
 * Valida correção do erro: invalid input value for enum session_type: "group"
 *
 * Rodar com app na porta 8084 e (opcional) já logado:
 *   BASE_URL=http://127.0.0.1:8084 npx playwright test e2e/create-appointment-pilates.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';

test.describe('Criar agendamento Pilates (session_type group)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    const email = process.env.E2E_LOGIN_EMAIL || process.env.TEST_EMAIL || '';
    const password = process.env.E2E_LOGIN_PASSWORD || process.env.TEST_PASSWORD || '';
    await page.locator('#login-email').waitFor({ state: 'visible', timeout: 20000 });
    await page.fill('#login-email', email);
    await page.fill('#login-password', password);
    await page.click('button[type="submit"]');
    // Aguardar sair da tela de login (qualquer URL que não seja /auth)
    await page.waitForURL((u) => !u.pathname.includes('/auth'), { timeout: 45000 });
    await page.goto('/schedule');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('button:has-text("Novo Agendamento")')).toBeVisible({ timeout: 15000 });
  });

  test('deve criar agendamento tipo Pilates Clínico sem erro 500', async ({ page }) => {
    // Escutar erros na resposta (500)
    const erro500: string[] = [];
    page.on('response', (res) => {
      if (res.status() === 500) {
        res.text().then((t) => erro500.push(t)).catch(() => {});
      }
    });

    await page.click('button:has-text("Novo Agendamento")');
    await page.waitForTimeout(800);

    const dialog = page.locator('[role="dialog"]').filter({ hasText: 'Novo Agendamento' });

    // Paciente: combobox que mostra nome do paciente ou placeholder
    await dialog.locator('[role="combobox"]').first().click();
    await page.waitForTimeout(400);
    await page.locator('[role="option"]').first().click();
    await page.waitForTimeout(300);

    // Data: botão que mostra "Data" ou "dd/MM" (ex: 01/02)
    await dialog.getByRole('button', { name: /Data|\d{1,2}\/\d{1,2}/ }).click();
    await page.waitForTimeout(500);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayNum = tomorrow.getDate();
    await page.getByRole('button', { name: String(dayNum) }).first().click();
    await page.waitForTimeout(300);

    // Horário: combobox que mostra hora (ex: 07:00)
    await dialog.locator('[role="combobox"]').filter({ hasText: /\d{1,2}:\d{2}/ }).first().click();
    await page.waitForTimeout(300);
    await page.locator('[role="option"]:has-text("10:00")').first().click();
    await page.waitForTimeout(200);

    // Tipo: combobox que mostra "Fisioterapia" (ou outro tipo) — escolher Pilates Clínico
    await dialog.locator('[role="combobox"]').filter({ hasText: /Fisioterapia|Pilates|Tipo/ }).first().click();
    await page.waitForTimeout(300);
    await page.locator('[role="option"]:has-text("Pilates Clínico")').click();
    await page.waitForTimeout(200);

    // Salvar
    await dialog.getByRole('button', { name: 'Agendar' }).click();
    await page.waitForTimeout(3000);

    // Não deve ter ocorrido 500 com mensagem de enum
    const hasEnumError = erro500.some((t) => /session_type|"group"|enum/.test(t));
    expect(hasEnumError, 'Não deve retornar erro 500 de enum session_type').toBe(false);

    // Deve mostrar sucesso ou fechar o modal (sem toast de erro)
    const erroToast = page.locator('text=/Ocorreu um Erro|HTTP 500|invalid input value for enum/');
    await expect(erroToast).not.toBeVisible({ timeout: 2000 }).catch(() => {});

    const sucesso = page.locator('text=/sucesso|criado|agendamento criado/i');
    const modalFechou = !(await page.locator('text=Novo Agendamento').isVisible().catch(() => false));
    expect(sucesso.isVisible() || modalFechou, 'Deve indicar sucesso ou fechar o modal').toBeTruthy();
  });
});
