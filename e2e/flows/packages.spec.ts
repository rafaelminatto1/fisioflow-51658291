import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.STAGING_TEST_USER_EMAIL || 'test@moocafisio.com.br';
const TEST_PASS = process.env.STAGING_TEST_USER_PASSWORD || '123456';

test.describe('FisioFlow E2E - Gestão de Pacotes de Tratamento', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill(TEST_EMAIL);
    await page.getByPlaceholder(/senha/i).fill(TEST_PASS);
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page.getByText(/Dashboard/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('Deve conseguir criar e atribuir um pacote a um paciente', async ({ page }) => {
    // Navega para Pacientes -> Seleciona paciente
    await page.getByRole('button', { name: /Pacientes/i }).click();
    await page.locator('table tr').nth(1).click();
    
    // Aba de Pacotes / Financeiro do Paciente
    await page.getByRole('tab', { name: /Pacotes/i }).click();
    await page.getByRole('button', { name: /Novo Pacote/i }).click();

    // Preenche dados do pacote
    await page.getByLabel(/Nome do Pacote/i).fill('Pacote 10 Sessões RPG (E2E)');
    await page.getByLabel(/Quantidade/i).fill('10');
    await page.getByLabel(/Valor Total/i).fill('1200,00');
    
    await page.getByRole('button', { name: /Criar Pacote/i }).click();

    // Verifica se salvou com sucesso
    await expect(page.getByText(/Pacote criado com sucesso/i)).toBeVisible();
    
    // Verifica se o saldo aparece como 10
    await expect(page.getByText('10 restantes')).toBeVisible();
  });
});
