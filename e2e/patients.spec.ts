import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Pacientes - CRUD Completo', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(eventos|dashboard|schedule)/);
    
    // Navegar para página de pacientes
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');
  });

  test('deve exibir lista de pacientes', async ({ page }) => {
    await expect(page.locator('h1:has-text("Pacientes")')).toBeVisible();
    await expect(page.locator('button:has-text("Novo Paciente")')).toBeVisible();
  });

  test('deve criar novo paciente', async ({ page }) => {
    await page.click('button:has-text("Novo Paciente")');
    
    // Preencher formulário
    await page.fill('input[name="name"]', 'Paciente Teste E2E');
    await page.fill('input[name="email"]', 'teste.e2e@example.com');
    await page.fill('input[name="phone"]', '11987654321');
    await page.fill('input[type="date"]', '1990-01-15');
    
    // Selecionar gênero
    await page.click('[role="combobox"]:has-text("Selecione o gênero")');
    await page.click('[role="option"]:has-text("Masculino")');
    
    // Preencher condição
    await page.fill('input[name="mainCondition"]', 'Lombalgia');
    
    // Salvar
    await page.click('button[type="submit"]:has-text("Cadastrar")');
    
    // Verificar toast de sucesso
    await expect(page.locator('text=/sucesso|criado/i')).toBeVisible({ timeout: 5000 });
    
    // Verificar que paciente aparece na lista
    await expect(page.locator('text=Paciente Teste E2E')).toBeVisible();
  });

  test('deve buscar pacientes', async ({ page }) => {
    // Buscar por nome
    await page.fill('input[placeholder*="Buscar"]', 'Maria');
    await page.waitForTimeout(500);
    
    const resultados = page.locator('[data-testid="patient-card"], .group');
    await expect(resultados.first()).toBeVisible();
  });

  test('deve filtrar pacientes por status', async ({ page }) => {
    await page.click('[role="combobox"]:has-text("Filtrar por status")');
    await page.click('[role="option"]:has-text("Em Tratamento")');
    await page.waitForTimeout(500);
    
    // Verificar que apenas pacientes com status correto aparecem
    const badges = page.locator('text=/Em Tratamento/i');
    await expect(badges.first()).toBeVisible();
  });

  test('deve visualizar detalhes do paciente', async ({ page }) => {
    // Clicar no primeiro botão "Ver Detalhes"
    await page.click('button:has-text("Ver Detalhes")').first();
    
    // Verificar que modal/página de detalhes abre
    await expect(page.locator('text=/Informações do Paciente|Detalhes/i')).toBeVisible({ timeout: 3000 });
  });

  test('deve editar paciente', async ({ page }) => {
    // Clicar em editar
    await page.click('button:has-text("Editar")').first();
    await page.waitForTimeout(500);
    
    // Mudar nome
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill('Nome Editado E2E');
    
    // Salvar
    await page.click('button[type="submit"]:has-text(/Salvar|Atualizar/)');
    
    // Verificar sucesso
    await expect(page.locator('text=/sucesso|atualizado/i')).toBeVisible({ timeout: 5000 });
  });

  test('deve exportar lista de pacientes', async ({ page }) => {
    // Clicar em exportar
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Exportar")')
    ]);
    
    expect(download).toBeTruthy();
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('deve limpar filtros', async ({ page }) => {
    // Aplicar filtros
    await page.fill('input[placeholder*="Buscar"]', 'teste');
    await page.click('[role="combobox"]:has-text("Filtrar por status")');
    await page.click('[role="option"]:has-text("Inicial")');
    
    // Limpar filtros
    await page.click('button:has-text("Limpar filtros")');
    
    // Verificar que filtros foram limpos
    await expect(page.locator('input[placeholder*="Buscar"]')).toHaveValue('');
  });
});
