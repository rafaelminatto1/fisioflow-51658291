/**
 * Helpers de navegação para testes E2E
 *
 * Fornece funções auxiliares para navegação na aplicação durante os testes.
 */

import type { Page } from '@playwright/test';

/**
 * Rotas principais da aplicação
 */
export const ROUTES = {
  login: '/(auth)/login',
  register: '/(auth)/register',
  forgotPassword: '/(auth)/forgot-password',
  home: '/(tabs)/home',
  patients: '/(tabs)/patients',
  agenda: '/(tabs)/agenda',
  exercises: '/(tabs)/exercises',
  reports: '/(drawer)/reports',
  movementAnalysis: '/(drawer)/movement-analysis',
  settings: '/(drawer)/settings',
  profile: '/(drawer)/profile',
} as const;

/**
 * Navega para uma rota específica
 */
export async function navigateTo(page: Page, route: string): Promise<void> {
  await page.goto(route);
  await page.waitForLoadState('networkidle');
}

/**
 * Navega para a aba de pacientes
 */
export async function goToPatients(page: Page): Promise<void> {
  await navigateTo(page, ROUTES.patients);
  await expectTabActive(page, 'patients');
}

/**
 * Navega para a aba de agenda
 */
export async function goToAgenda(page: Page): Promise<void> {
  await navigateTo(page, ROUTES.agenda);
  await expectTabActive(page, 'agenda');
}

/**
 * Navega para a aba de exercícios
 */
export async function goToExercises(page: Page): Promise<void> {
  await navigateTo(page, ROUTES.exercises);
  await expectTabActive(page, 'exercises');
}

/**
 * Navega para a aba home
 */
export async function goToHome(page: Page): Promise<void> {
  await navigateTo(page, ROUTES.home);
  await expectTabActive(page, 'home');
}

/**
 * Abre o menu drawer
 */
export async function openDrawer(page: Page): Promise<void> {
  await page.click('[data-testid="drawer-toggle"]');
  await page.waitForSelector('[data-testid="drawer-menu"]', { state: 'visible', timeout: 3000 });
}

/**
 * Fecha o menu drawer
 */
export async function closeDrawer(page: Page): Promise<void> {
  await page.click('[data-testid="drawer-backdrop"]');
  await page.waitForSelector('[data-testid="drawer-menu"]', { state: 'hidden', timeout: 3000 });
}

/**
 * Navega via drawer para uma rota
 */
export async function navigateViaDrawer(page: Page, route: string): Promise<void> {
  await openDrawer(page);
  await page.click(`[data-testid="drawer-item-${route}"]`);
  await page.waitForURL(`**/${route}**`);
}

/**
 * Volta para a tela anterior
 */
export async function goBack(page: Page): Promise<void> {
  await page.goBack();
  await page.waitForLoadState('networkidle');
}

/**
 * Verifica que uma aba está ativa
 */
export async function expectTabActive(page: Page, tabName: string): Promise<void> {
  const activeTab = page.locator(`[data-testid="tab-${tabName}"][data-active="true"]`);
  await activeTab.waitFor({ state: 'visible', timeout: 3000 });
}

/**
 * Verifica a rota atual
 */
export async function getCurrentRoute(page: Page): Promise<string> {
  return page.evaluate(() => window.location.pathname);
}

/**
 * Aguarda carregamento da tela
 */
export async function waitForScreenLoad(page: Page, screenTestId: string): Promise<void> {
  await page.waitForSelector(`[data-testid="${screenTestId}"]`, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Aguarda que um elemento seja visível
 */
export async function waitForVisible(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
}

/**
 * Aguarda que um elemento seja clicável
 */
export async function waitForClickable(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout: 5000 });
  await element.waitFor({ state: 'attached', timeout: 5000 });
}

/**
 * Verifica presença de um toast de notificação
 */
export async function expectToast(page: Page, message: string): Promise<void> {
  const toast = page.locator('[data-testid="toast"]').filter({ hasText: message });
  await toast.waitFor({ state: 'visible', timeout: 3000 });
}

/**
 * Verifica que não há erros na tela
 */
export async function expectNoErrors(page: Page): Promise<void> {
  const errorElements = page.locator('[data-testid*="error"]');
  const count = await errorElements.count();
  expect(count).toBe(0);
}

/**
 * Aguarda navegação completar
 */
export async function waitForNavigation(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Recarrega a página atual
 */
export async function refreshPage(page: Page): Promise<void> {
  await page.reload();
  await waitForNavigation(page);
}

/**
 * Navega para detalhes de um paciente pelo ID
 */
export async function goToPatientDetails(page: Page, patientId: string): Promise<void> {
  await navigateTo(page, `/patients/${patientId}`);
  await waitForScreenLoad(page, 'patient-details');
}

/**
 * Navega para criação de novo agendamento
 */
export async function goToNewAppointment(page: Page): Promise<void> {
  await navigateTo(page, '/agenda/new');
  await waitForScreenLoad(page, 'appointment-form');
}

/**
 * Navega para edição de agendamento
 */
export async function goToEditAppointment(page: Page, appointmentId: string): Promise<void> {
  await navigateTo(page, `/agenda/${appointmentId}/edit`);
  await waitForScreenLoad(page, 'appointment-form');
}

/**
 * Abre menu de opções
 */
export async function openOptions(page: Page, selector: string): Promise<void> {
  await page.click(selector);
  const menu = page.locator('[data-testid="options-menu"]');
  await menu.waitFor({ state: 'visible', timeout: 3000 });
}

/**
 * Seleciona opção de um menu
 */
export async function selectOption(page: Page, optionValue: string): Promise<void> {
  await page.click(`[data-testid="option-${optionValue}"]`);
}

/**
 * Verifica URL atual
 */
export async function expectUrl(page: Page, expectedPattern: string): Promise<void> {
  const url = page.url();
  expect(url).toMatch(expectedPattern);
}

/**
 * Verifica que está na tela de login
 */
export async function expectOnLogin(page: Page): Promise<void> {
  await expectUrl(page, '/login');
  await waitForScreenLoad(page, 'login-screen');
}

/**
 * Verifica que está autenticado
 */
export async function expectAuthenticated(page: Page): Promise<void> {
  const indicator = page.locator('[data-testid="authenticated-indicator"]');
  await indicator.waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Verifica que não está autenticado
 */
export async function expectNotAuthenticated(page: Page): Promise<void> {
  const indicator = page.locator('[data-testid="authenticated-indicator"]');
  await expect(indicator).not.toBeVisible();
}

/**
 * Fecha modais abertos
 */
export async function closeModals(page: Page): Promise<void> {
  const modals = page.locator('[data-testid="modal"]');
  const count = await modals.count();

  for (let i = 0; i < count; i++) {
    const closeButton = page.locator('[data-testid="modal-close-button"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }
}

/**
 * Limpa filtros ativos
 */
export async function clearFilters(page: Page): Promise<void> {
  const clearButton = page.locator('[data-testid="clear-filters"]');
  if (await clearButton.isVisible()) {
    await clearButton.click();
  }
}
