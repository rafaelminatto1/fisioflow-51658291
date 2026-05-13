import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.STAGING_TEST_USER_EMAIL || 'test@moocafisio.com.br';
const TEST_PASS = process.env.STAGING_TEST_USER_PASSWORD || '123456';

test.describe('FisioFlow E2E - Faturamento & NFS-e', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill(TEST_EMAIL);
    await page.getByPlaceholder(/senha/i).fill(TEST_PASS);
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page.getByText(/Dashboard/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('Deve conseguir emitir uma Nota Fiscal de Serviço (NFS-e)', async ({ page }) => {
    // Navega para o Financeiro Hub -> Aba NFS-e
    await page.getByRole('button', { name: /Financeiro/i }).click();
    await page.getByRole('tab', { name: /NFS-e/i }).click();
    
    // Clica em Nova Nota
    await page.getByRole('button', { name: /Emitir Nota/i }).click();

    // Preenche os dados da nota
    await page.getByLabel(/Paciente/i).fill('Paciente E2E NFS-e');
    await page.getByLabel(/Valor/i).fill('150,00');
    await page.getByLabel(/Descrição/i).fill('Sessão de Fisioterapia Ortopédica (Teste E2E)');
    
    // Emite
    await page.getByRole('button', { name: /Emitir NFS-e/i }).click();

    // Verifica se a nota aparece como Em Processamento ou Autorizada
    await expect(page.getByText(/Nota gerada com sucesso/i)).toBeVisible();
  });
});
