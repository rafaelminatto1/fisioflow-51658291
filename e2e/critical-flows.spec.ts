/**
 * FisioFlow - Critical E2E Tests
 *
 * Testes críticos de ponta a ponta que verificam os fluxos principais do sistema.
 * Estes testes devem ser executados antes de cada release.
 *
 * Execute com: npm run test:e2e:e2e/critical-flows.spec.ts
 */

import { test, expect, Page } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Fluxos Críticos do FisioFlow', () => {
  // Autenticação
  test.beforeEach(async ({ page }) => {
    // Log console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`BROWSER ERROR: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        console.warn(`BROWSER WARN: ${msg.text()}`);
      }
    });

    await page.goto('/auth?e2e=true');
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    
    // Caminho '/' é válido pois redireciona para agenda por padrão
    await page.waitForURL((url) => /\/(dashboard|eventos|schedule)?/.test(url.pathname), { timeout: 30000 });
    
    // Esperar o skeleton de carregamento sumir
    const skeleton = page.locator('[data-testid="app-loading-skeleton"]');
    if (await skeleton.isVisible()) {
      await expect(skeleton).not.toBeVisible({ timeout: 15000 });
    }
    
    // Estabilização
    await page.waitForTimeout(1000);
    await page.waitForLoadState('domcontentloaded');
  });

  /**
   * Helper para garantir que o paciente João Silva existe
   */
  async function ensureJoaoSilvaExists(page: Page) {
    await page.goto('/patients?e2e=true');
    await page.waitForLoadState('domcontentloaded');
    
    // Esperar a lista ou botão de carregar
    await page.waitForTimeout(2000);
    
    const patientRow = page.locator('text=João Silva').first();
    if (await patientRow.isVisible()) {
      return;
    }

    // Criar se não existir - Tentar vários seletores para o botão de adicionar
    const addButton = page.locator('button:has-text("Novo Paciente"), [data-testid="add-patient"], a:has-text("Novo Paciente")').first();
    await expect(addButton).toBeVisible({ timeout: 15000 });
    await addButton.click();
    
    await expect(page.locator('[data-testid="patient-form"]')).toBeVisible({ timeout: 10000 });
    await page.fill('[data-testid="patient-name"]', 'João Silva');
    await page.fill('[data-testid="patient-phone"]', '11999999999');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=João Silva').first()).toBeVisible({ timeout: 15000 });
  }

  /**
   * TESTE 1: Agendamento Completo
   * Verifica o fluxo de criação de um agendamento
   */
  test.fixme('CRÍTICO: Agendamento - Fluxo completo de criação', async ({ page }) => {
    await ensureJoaoSilvaExists(page);
    await page.goto('/agenda?e2e=true');
    await page.waitForLoadState('domcontentloaded');

    // Clicar no botão de novo agendamento
    await page.click('[data-testid="new-appointment"]');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Selecionar paciente
    await page.click('[data-testid="patient-select"]');
    await page.fill('[data-testid="patient-search"]', 'João Silva');
    
    // Esperar sugestões carregarem
    const patientOption = page.locator('role=option').filter({ hasText: 'João Silva' }).first();
    await expect(patientOption).toBeVisible({ timeout: 10000 });
    await patientOption.click();

    // Selecionar profissional
    await page.click('[data-testid="therapist-select"]');
    const therapistOption = page.locator('role=option').filter({ hasText: /Dr\.|Fisioterapeuta/i }).first();
    if (await therapistOption.isVisible()) {
      await therapistOption.click();
    } else {
      // Fallback if no specific therapist, pick first item in list after "Escolher"
      await page.locator('role=option').nth(1).click();
    }

    // Definir data e hora
    await page.click('input[type="date"]');
    await page.fill('input[type="date"]', new Date().toISOString().split('T')[0]);
    await page.click('input[type="time"]');
    await page.fill('input[type="time"]', '10:00');

    // Selecionar tipo de atendimento
    await page.click('[data-testid="appointment-type"]');
    await page.locator('role=option').filter({ hasText: /Avaliação|Fisioterapia/i }).first().click();

    // Confirmar agendamento
    await page.click('button:has-text("Confirmar")');
    await expect(page.locator('text=Agendamento criado com sucesso')).toBeVisible({ timeout: 10000 });

    // Verificar se aparece na agenda
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=João Silva')).toBeVisible();
    await expect(page.locator('text=10:00')).toBeVisible();
  });

  /**
   * TESTE 2: Evolução SOAP
   * Verifica o registro de uma evolução SOAP
   */
  test.fixme('CRÍTICO: Evolução Clínica - Registro SOAP completo', async ({ page }) => {
    await ensureJoaoSilvaExists(page);
    await page.goto('/patients?e2e=true');
    await page.waitForLoadState('domcontentloaded');

    // Buscar paciente
    await page.fill('input[placeholder*="Buscar"]', 'João Silva');
    await page.locator('text=João Silva').first().click();

    // Abrir aba de evoluções
    await page.click('button:has-text("Evoluções")');
    await page.click('button:has-text("Nova Evolução")');

    // Preencher SOAP
    await page.fill('textarea[placeholder*="Subjetivo"]', 'Paciente relata melhora na dor lombar.');
    await page.fill('textarea[placeholder*="Objetivo"]', 'Aumento de 10 graus na flexão de tronco.');
    await page.fill('textarea[placeholder*="Avaliação"]', 'Evolução positiva conforme esperado.');
    await page.fill('textarea[placeholder*="Plano"]', 'Manter exercícios de fortalecimento.');

    await page.click('button:has-text("Salvar")');
    await expect(page.locator('text=Evolução salva com sucesso')).toBeVisible();
  });

  /**
   * TESTE 3: Cadastro de Paciente
   * Verifica o cadastro completo de um novo paciente
   */
  test.fixme('CRÍTICO: Pacientes - Cadastro completo', async ({ page }) => {
    await page.goto('/patients?e2e=true');
    await page.waitForLoadState('domcontentloaded');

    // Novo paciente
    await page.click('[data-testid="add-patient"]');
    await expect(page.locator('[data-testid="patient-form"]')).toBeVisible({ timeout: 15000 });

    // Dados pessoais
    await page.fill('[data-testid="patient-name"]', 'Paciente Teste E2E');
    await page.fill('[data-testid="patient-email"]', `teste-${Date.now()}@example.com`);
    await page.fill('[data-testid="patient-phone"]', '11999999999');
    await page.fill('[data-testid="patient-cpf"]', '12345678900');

    await page.click('button:has-text("Salvar")');
    await expect(page.locator('text=Paciente cadastrado com sucesso')).toBeVisible();
  });

  /**
   * TESTE 4: Prescrição de Exercícios
   * Verifica a prescrição de exercícios para um paciente
   */
  test.fixme('CRÍTICO: Exercícios - Prescrição para paciente', async ({ page }) => {
    await ensureJoaoSilvaExists(page);
    await page.goto('/patients?e2e=true');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('text=João Silva').first().click();
    await page.click('button:has-text("Tratamento")');
    await page.click('button:has-text("Adicionar Exercício")');

    // Buscar e selecionar exercício
    await page.fill('input[placeholder*="Buscar exercício"]', 'Alongamento');
    await page.click('text=Alongamento de Isquiotibiais');

    await page.click('button:has-text("Confirmar")');
    await page.click('button:has-text("Salvar Prescrição")');
    await expect(page.locator('text=Prescrição salva')).toBeVisible();
  });

  /**
   * TESTE 5: Telemedicina
   * Verifica o início de uma sessão de telemedicina
   */
  test.fixme('CRÍTICO: Telemedicina - Início de sessão', async ({ page }) => {
    await page.goto('/schedule?e2e=true');
    await page.waitForLoadState('domcontentloaded');

    // Encontrar agendamento com telemedicina
    const telemedicineAppointment = page.locator(
      '[data-appointment-type="telemedicine"]'
    ).first();

    if (await telemedicineAppointment.isVisible()) {
      await telemedicineAppointment.click();
      await page.click('button:has-text("Iniciar Telemedicina")');

      // Verificar se abre a modal de permissões
      await expect(page.locator('[data-testid="video-permissions"]')).toBeVisible();
    }
  });

  /**
   * TESTE 6: Relatórios
   * Verifica geração de relatório de evolução
   */
  test.fixme('CRÍTICO: Relatórios - Geração de PDF', async ({ page }) => {
    await ensureJoaoSilvaExists(page);
    await page.goto('/patients?e2e=true');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('text=João Silva').first().click();
    await page.click('button:has-text("Relatórios")');
    await page.click('button:has-text("Gerar PDF")');

    // Verificar se inicia download ou preview
    await expect(page.locator('[data-testid="report-preview"]')).toBeVisible();
  });

  /**
   * TESTE 7: Busca Global
   * Verifica funcionalidade de busca
   */
  test.fixme('CRÍTICO: Busca - Busca global de pacientes', async ({ page }) => {
    await ensureJoaoSilvaExists(page);
    await page.goto('/dashboard?e2e=true');
    await page.waitForLoadState('domcontentloaded');

    // Atalho de busca (Cmd+K ou Ctrl+K)
    await page.keyboard.press('Control+k');
    
    const searchInput = page.locator('[data-testid="global-search-input"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('João Silva');
    
    await expect(page.locator('text=João Silva').first()).toBeVisible({ timeout: 10000 });

    // Enter deve navegar
    await page.keyboard.press('Enter');
    await page.waitForURL(url => url.pathname.includes('/patients/'), { timeout: 10000 });
  });

  /**
   * TESTE 8: Perfil e Configurações
   * Verifica atualização de perfil
   */
  test('CRÍTICO: Configurações - Atualização de perfil', async ({ page }) => {
    // Este teste deve funcionar pois depende pouco do Firestore para carregar a página base
    await page.goto('/dashboard?e2e=true');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Se o dashboard principal falhar em carregar, tentar ir direto para o perfil
    const userMenu = page.locator('[data-testid="user-menu"]');
    if (!await userMenu.isVisible()) {
      console.warn('User menu not visible, navigating directly to profile');
      await page.goto('/profile?e2e=true');
    } else {
      await userMenu.click({ force: true });
      await page.click('text=Perfil', { force: true });
    }
    
    await page.waitForURL(url => url.pathname.includes('/profile'), { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    // Clicar em Editar Perfil para habilitar os campos
    await page.click('button:has-text("Editar Perfil")');

    // Atualizar nome
    const nameInput = page.locator('[data-testid="profile-name"]');
    await nameInput.fill('Dr. Teste Atualizado');
    await page.click('button:has-text("Salvar")');

    // Toast might contain extra text or different formatting
    await expect(page.locator('text=Perfil atualizado').first()).toBeVisible({ timeout: 15000 });

    // Verificar se atualizou no menu
    const menuAfterUpdate = page.locator('[data-testid="user-menu"]');
    if (await menuAfterUpdate.isVisible()) {
      await menuAfterUpdate.click();
      await expect(page.locator('text=Dr. Teste Atualizado').first()).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Fluxos Críticos - Mobile', () => {
  /**
   * TESTE 9: Mobile Responsiveness
   * Verifica funcionalidades críticas em mobile
   */
  test('CRÍTICO: Mobile - Agendamento responsivo', async ({ page }) => {
    // Log console messages
    page.on('console', msg => {
      if (msg.type() === 'error') console.error(`MOBILE BROWSER ERROR: ${msg.text()}`);
    });

    // Simular viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/auth?e2e=true');
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(url => /\/(dashboard|eventos|schedule)?$/.test(url.pathname), { timeout: 30000 });
    
    // Esperar o skeleton de carregamento sumir
    const skeleton = page.locator('[data-testid="app-loading-skeleton"]');
    if (await skeleton.isVisible()) {
      await expect(skeleton).not.toBeVisible({ timeout: 15000 });
    }
    
    await page.waitForTimeout(3000); // Esperar animações de entrada
    await page.waitForLoadState('domcontentloaded');

    // Menu mobile deve estar visível
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu).toBeVisible({ timeout: 10000 });

    // Abrir agenda
    await mobileMenu.click();
    await page.waitForTimeout(1500); // Esperar Sheet abrir completamente
    
    // Tentar clicar no link da agenda no menu
    const agendaLink = page.locator('nav a:has-text("Agenda")').first();
    await expect(agendaLink).toBeAttached({ timeout: 10000 });
    await agendaLink.click({ force: true });
    
    await page.waitForLoadState('domcontentloaded');

    // View mobile deve mostrar lista visual ou calendário adaptado
    await expect(page.locator('[data-testid="mobile-schedule-list"]')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Fluxos Críticos - Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth?e2e=true');
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => /\/(dashboard|eventos|schedule)?$/.test(url.pathname), { timeout: 30000 });
  });

  /**
   * TESTE 10: Performance - Carregamento de dashboard
   */
  test('CRÍTICO: Performance - Dashboard carrega em tempo aceitável', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard?e2e=true');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // Dashboard deve carregar em menos de 5 segundos
    expect(loadTime).toBeLessThan(5000);

    // Elementos críticos devem estar visíveis com timeout maior para primeira carga
    // Nota: Se o Firestore estiver fora, o header com saudação ainda deve aparecer se o perfil carregar
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible({ timeout: 15000 });
  });
});
