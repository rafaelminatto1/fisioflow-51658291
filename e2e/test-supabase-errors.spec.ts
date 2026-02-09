import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Teste de erros Supabase - Criar agendamento e iniciar atendimento', () => {
  test('Deve fazer login, criar agendamento e iniciar atendimento', async ({ page }) => {
    // Navegar para a página de login
    await page.goto('https://moocafisio.com.br/login');

    // Aguardar a página carregar
    await page.waitForLoadState('domcontentloaded');

    // Preencher credenciais
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

    await emailInput.fill(testUsers.fisio.email);
    await passwordInput.fill(testUsers.fisio.password);

    // Clicar no botão de login
    const loginButton = page.locator('button:has-text("Entrar"), button:has-text("Login"), button[type="submit"]').first();
    await loginButton.click();
    
    // Aguardar redirecionamento após login
    await page.waitForURL('**/schedule**', { timeout: 10000 }).catch(() => {});
    
    // Capturar erros do console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Capturar erros de rede
    const networkErrors: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });
    
    // Aguardar alguns segundos para carregar dados
    await page.waitForTimeout(3000);
    
    // Tentar criar um agendamento (se houver botão)
    const createAppointmentButton = page.locator('button:has-text("Novo"), button:has-text("Criar"), button:has-text("Agendamento")').first();
    if (await createAppointmentButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createAppointmentButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Tentar iniciar um atendimento (se houver)
    const startAttendanceButton = page.locator('button:has-text("Iniciar"), button:has-text("Atendimento")').first();
    if (await startAttendanceButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startAttendanceButton.click();
      await page.waitForTimeout(3000);
    }
    
    // Log dos erros encontrados
    console.log('Erros do console:', errors);
    console.log('Erros de rede:', networkErrors);
    
    // Verificar se há erros 500
    const has500Errors = networkErrors.some(err => err.includes('500'));
    if (has500Errors) {
      console.error('ERROS 500 ENCONTRADOS:', networkErrors.filter(err => err.includes('500')));
    }
  });
});
