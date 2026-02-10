/**
 * FisioFlow - Critical E2E Tests
 *
 * Testes críticos de ponta a ponta que verificam os fluxos principais do sistema.
 * Estes testes devem ser executados antes de cada release.
 *
 * Execute com: npm run test:e2e:e2e/critical-flows.spec.ts
 */

import { test, expect } from '@playwright/test';
import { testUsers } from '../fixtures/test-data';

test.describe('Fluxos Críticos do FisioFlow', () => {
  // Autenticação
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|eventos|schedule)/);
  });

  /**
   * TESTE 1: Agendamento Completo
   * Verifica o fluxo de criação de um agendamento
   */
  test('CRÍTICO: Agendamento - Fluxo completo de criação', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

    // Clicar no botão de novo agendamento
    await page.click('button:has-text("Novo Agendamento")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Selecionar paciente
    await page.click('[data-testid="patient-select"]');
    await page.fill('[data-testid="patient-search"]', 'João Silva');
    await page.click('text=João Silva');

    // Selecionar profissional
    await page.click('[data-testid="therapist-select"]');
    await page.click('text=Dr. Teste');

    // Definir data e hora
    await page.click('input[type="date"]');
    await page.fill('input[type="date"]', new Date().toISOString().split('T')[0]);
    await page.click('input[type="time"]');
    await page.fill('input[type="time"]', '10:00');

    // Selecionar tipo de atendimento
    await page.click('[data-testid="appointment-type"]');
    await page.click('text=Avaliação Inicial');

    // Confirmar agendamento
    await page.click('button:has-text("Confirmar")');
    await expect(page.locator('text=Agendamento criado com sucesso')).toBeVisible();

    // Verificar se aparece na agenda
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=João Silva')).toBeVisible();
    await expect(page.locator('text=10:00')).toBeVisible();
  });

  /**
   * TESTE 2: Evolução Clínica (SOAP)
   * Verifica o fluxo de registro de evolução
   */
  test('CRÍTICO: Evolução Clínica - Registro SOAP completo', async ({ page }) => {
    // Navegar para um paciente
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Buscar paciente
    await page.fill('input[placeholder*="Buscar"]', 'João Silva');
    await page.click('text=João Silva');

    // Abrir aba de evoluções
    await page.click('button:has-text("Evoluções")');
    await page.waitForLoadState('networkidle');

    // Clicar em nova evolução
    await page.click('button:has-text("Nova Evolução")');
    await expect(page.locator('[data-testid="soap-form"]')).toBeVisible();

    // Preencher SOAP
    await page.fill('[data-testid="soap-subjective"]', 'Paciente relata melhora na dor lombar');
    await page.fill('[data-testid="soap-objective"]', 'Força muscular aumentada em 1 grau');
    await page.fill('[data-testid="soap-assessment"]', 'Lombalgia mecânica em evolução favorável');
    await page.fill('[data-testid="soap-plan"]', 'Continuar exercícios de fortalecimento');

    // Salvar evolução
    await page.click('button:has-text("Salvar Evolução")');
    await expect(page.locator('text=Evolução salva com sucesso')).toBeVisible();

    // Verificar se aparece na lista
    await expect(page.locator('text=Lombalgia mecânica')).toBeVisible();
  });

  /**
   * TESTE 3: Cadastro de Paciente
   * Verifica o fluxo de criação de novo paciente
   */
  test('CRÍTICO: Pacientes - Cadastro completo', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    // Novo paciente
    await page.click('button:has-text("Novo Paciente")');
    await expect(page.locator('[data-testid="patient-form"]')).toBeVisible();

    // Dados pessoais
    await page.fill('[data-testid="patient-name"]', 'Paciente Teste E2E');
    await page.fill('[data-testid="patient-email"]', `teste-${Date.now()}@example.com`);
    await page.fill('[data-testid="patient-phone"]', '11999999999');
    await page.fill('[data-testid="patient-cpf"]', '12345678900');

    // Data de nascimento
    await page.fill('input[data-testid="patient-birthdate"]', '1990-01-01');

    // Endereço
    await page.click('button:has-text("Adicionar Endereço")');
    await page.fill('[data-testid="address-cep"]', '01310-100');
    await page.fill('[data-testid="address-street"]', 'Av. Paulista');
    await page.fill('[data-testid="address-number"]', '1000');

    // Salvar
    await page.click('button:has-text("Salvar Paciente")');
    await expect(page.locator('text=Paciente criado com sucesso')).toBeVisible();

    // Verificar se aparece na lista
    await expect(page.locator('text=Paciente Teste E2E')).toBeVisible();
  });

  /**
   * TESTE 4: Prescrição de Exercícios
   * Verifica o fluxo de prescrição de exercícios
   */
  test('CRÍTICO: Exercícios - Prescrição para paciente', async ({ page }) => {
    // Navegar para um paciente
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    await page.click('text=João Silva');
    await page.click('button:has-text("Tratamento")');
    await page.click('button:has-text("Adicionar Exercício")');

    // Buscar exercício
    await page.fill('[data-testid="exercise-search"]', 'Alongamento');
    await page.click('text=Alongamento de Isquiotibiais');

    // Configurar parâmetros
    await page.fill('[data-testid="exercise-reps"]', '3');
    await page.fill('[data-testid="exercise-sets"]', '10');
    await page.fill('[data-testid="exercise-hold"]', '30');

    // Adicionar à prescrição
    await page.click('button:has-text("Adicionar")');

    // Salvar prescrição
    await page.click('button:has-text("Salvar Prescrição")');
    await expect(page.locator('text=Prescrição salva')).toBeVisible();
  });

  /**
   * TESTE 5: Telemedicina
   * Verifica o início de uma sessão de telemedicina
   */
  test('CRÍTICO: Telemedicina - Início de sessão', async ({ page }) => {
    await page.goto('/schedule');
    await page.waitForLoadState('networkidle');

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
  test('CRÍTICO: Relatórios - Geração de PDF', async ({ page }) => {
    await page.goto('/patients');
    await page.waitForLoadState('networkidle');

    await page.click('text=João Silva');
    await page.click('button:has-text("Relatórios")');
    await page.click('button:has-text("Gerar PDF")');

    // Verificar se inicia download ou preview
    await expect(page.locator('[data-testid="report-preview"]')).toBeVisible();
  });

  /**
   * TESTE 7: Busca Global
   * Verifica funcionalidade de busca
   */
  test('CRÍTICO: Busca - Busca global de pacientes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Usar busca global
    await page.keyboard.press('Cmd+K');
    await expect(page.locator('[data-testid="global-search"]')).toBeVisible();

    await page.fill('[data-testid="global-search-input"]', 'João Silva');
    await expect(page.locator('text=João Silva')).toBeVisible();

    // Enter deve navegar para o paciente
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/patients\/.+/);
  });

  /**
   * TESTE 8: Perfil e Configurações
   * Verifica atualização de perfil
   */
  test('CRÍTICO: Configurações - Atualização de perfil', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Perfil');
    await page.waitForLoadState('networkidle');

    // Atualizar nome
    await page.fill('[data-testid="profile-name"]', 'Dr. Teste Atualizado');
    await page.click('button:has-text("Salvar")');

    await expect(page.locator('text=Perfil atualizado')).toBeVisible();

    // Verificar se atualizou no menu
    await page.click('[data-testid="user-menu"]');
    await expect(page.locator('text=Dr. Teste Atualizado')).toBeVisible();
  });
});

test.describe('Fluxos Críticos - Mobile', () => {
  /**
   * TESTE 9: Mobile Responsiveness
   * Verifica funcionalidades críticas em mobile
   */
  test('CRÍTICO: Mobile - Agendamento responsivo', async ({ page }) => {
    // Simular viewport mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/auth');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|eventos|schedule)/);

    // Menu mobile deve estar visível
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Abrir agenda
    await page.click('[data-testid="mobile-menu"]');
    await page.click('text=Agenda');
    await page.waitForLoadState('networkidle');

    // View mobile deve mostrar lista visual
    await expect(page.locator('[data-testid="mobile-schedule-list"]')).toBeVisible();
  });
});

test.describe('Fluxos Críticos - Performance', () => {
  /**
   * TESTE 10: Performance - Carregamento de dashboard
   */
  test('CRÍTICO: Performance - Dashboard carrega em tempo aceitável', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Dashboard deve carregar em menos de 3 segundos
    expect(loadTime).toBeLessThan(3000);

    // Elementos críticos devem estar visíveis
    await expect(page.locator('[data-testid="stats-cards"]')).toBeVisible();
    await expect(page.locator('[data-testid="today-schedule"]')).toBeVisible();
  });
});
