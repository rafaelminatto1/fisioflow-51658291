import { test, expect } from '@playwright/test';

test('Smoke Test: Full Flow Verification', async ({ page }) => {
  // 1. Login
  await page.goto('https://fisioflow.web.app/auth');
  await page.fill('input[name="email"]', 'rafael.minatto@yahoo.com.br');
  await page.fill('input[name="password"]', 'Yukari30@');
  await page.click('button[type="submit"]');

  // Aguardar redirecionamento para a agenda
  await page.waitForURL('**/', { timeout: 30000 });
  console.log('✓ Login realizado com sucesso');

  // 2. Verificar Sidebar de Gamificação (Recém implementada)
  const sidebarGamification = page.locator('text=Nível');
  await expect(sidebarGamification).toBeVisible();
  console.log('✓ Sidebar de Gamificação visível');

  // 3. Verificar CRUD Pacientes (API V2 Postgres)
  await page.goto('https://fisioflow.web.app/patients');
  await page.waitForSelector('[data-testid="patients-page"]', { timeout: 20000 });
  const patientCards = page.locator('.group.flex.flex-col.gap-3');
  await expect(patientCards.first()).toBeVisible();
  console.log('✓ Lista de Pacientes (API V2) carregada');

  // 4. Verificar CRUD Exercícios (API V2 Postgres com Fallback)
  await page.goto('https://fisioflow.web.app/exercises');
  await page.waitForSelector('text=Biblioteca', { timeout: 20000 });
  const exerciseBadge = page.locator('.badge').first();
  await expect(exerciseBadge).toBeVisible();
  console.log('✓ Biblioteca de Exercícios (API V2) carregada');

  // 5. Verificar Inteligência Artificial (Smart Summary)
  // Navegar para o perfil do primeiro paciente
  await page.goto('https://fisioflow.web.app/patients');
  await patientCards.first().click();
  await page.waitForURL('**/patients/*', { timeout: 20000 });
  
  // Clicar na aba Analytics & IA
  await page.click('text=Analytics & IA');
  const smartSummary = page.locator('text=Resumo Inteligente');
  await expect(smartSummary).toBeVisible();
  console.log('✓ Componente de IA Smart Summary presente no perfil');

  // 6. Verificar Relatórios PDF
  const reportGen = page.locator('text=Relatório para Médico');
  await expect(reportGen).toBeVisible();
  console.log('✓ Gerador de Relatórios Profissionais presente');
});
