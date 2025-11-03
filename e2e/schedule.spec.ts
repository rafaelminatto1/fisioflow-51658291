import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Agenda - CRUD Completo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(eventos|dashboard|schedule)/);
    
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');
  });

  test('deve exibir agenda corretamente', async ({ page }) => {
    await expect(page.locator('h1:has-text("Agenda")')).toBeVisible();
    await expect(page.locator('button:has-text("Novo Agendamento")')).toBeVisible();
  });

  test('deve criar novo agendamento', async ({ page }) => {
    await page.click('button:has-text("Novo Agendamento")');
    await page.waitForTimeout(500);
    
    // Selecionar paciente
    await page.click('[role="combobox"]:has-text("Selecione o paciente")');
    await page.waitForTimeout(300);
    await page.click('[role="option"]').first();
    
    // Preencher data e hora
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    await page.fill('input[type="date"]', dateStr);
    await page.fill('input[type="time"]', '10:00');
    
    // Selecionar tipo
    await page.click('[role="combobox"]:has-text("Tipo de atendimento")');
    await page.click('[role="option"]:has-text("Fisioterapia")');
    
    // Salvar
    await page.click('button[type="submit"]:has-text("Criar")');
    
    // Verificar sucesso
    await expect(page.locator('text=/sucesso|criado/i')).toBeVisible({ timeout: 5000 });
  });

  test('deve alternar entre visualizações', async ({ page }) => {
    // Visualização lista
    await page.click('button:has-text("Lista")');
    await page.waitForTimeout(300);
    
    // Visualização dia
    await page.click('button:has-text("Dia")');
    await page.waitForTimeout(300);
    
    // Visualização semana
    await page.click('button:has-text("Semana")');
    await page.waitForTimeout(300);
    
    // Visualização mês
    await page.click('button:has-text("Mês")');
    await page.waitForTimeout(300);
  });

  test('deve filtrar agendamentos por status', async ({ page }) => {
    await page.click('[role="combobox"]:has-text("Status")');
    await page.click('[role="option"]:has-text("Confirmado")');
    await page.waitForTimeout(500);
  });

  test('deve buscar agendamentos', async ({ page }) => {
    await page.fill('input[placeholder*="Buscar"]', 'Maria');
    await page.waitForTimeout(500);
  });

  test('deve criar dados de teste', async ({ page }) => {
    await page.click('button:has-text("Criar Dados de Teste")');
    
    // Aguardar toast de sucesso
    await expect(page.locator('text=/criados|sucesso/i')).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir estatísticas do dia', async ({ page }) => {
    await expect(page.locator('text=Hoje')).toBeVisible();
    await expect(page.locator('text=Confirmados')).toBeVisible();
    await expect(page.locator('text=Concluídos')).toBeVisible();
    await expect(page.locator('text=Pendentes')).toBeVisible();
  });
});
