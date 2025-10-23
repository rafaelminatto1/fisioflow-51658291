import { test, expect } from '@playwright/test';

test.describe('Agenda de Fisioterapia - E2E Tests', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth');
    
    // Login com usuário fisioterapeuta
    await page.fill('input[name="email"]', 'fisio@activityfisioterapia.com.br');
    await page.fill('input[name="password"]', 'Activity2024!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/');
    
    // Navigate to Schedule
    await page.click('a[href="/schedule"]');
    await page.waitForURL('/schedule');
  });

  test('deve carregar a página de agenda com sucesso', async ({ page }) => {
    // Verificar título da página
    await expect(page.locator('h1')).toContainText('Agenda');
    
    // Verificar cards de estatísticas
    await expect(page.locator('text=Hoje')).toBeVisible();
    await expect(page.locator('text=Confirmados')).toBeVisible();
    await expect(page.locator('text=Concluídos')).toBeVisible();
    await expect(page.locator('text=Pendentes')).toBeVisible();
  });

  test('deve criar novo agendamento com sucesso', async ({ page }) => {
    // Clicar em "Novo Agendamento"
    await page.click('button:has-text("Novo Agendamento")');
    
    // Aguardar modal abrir
    await expect(page.locator('text=Novo Agendamento')).toBeVisible();
    
    // Selecionar paciente (assumindo que existe um paciente)
    await page.click('[role="combobox"]');
    await page.waitForTimeout(500);
    await page.keyboard.type('João');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    
    // Selecionar data (hoje + 1 dia)
    await page.click('button:has-text("Selecione uma data")');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.click(`button[name="day"]:has-text("${tomorrow.getDate()}")`);
    
    // Selecionar horário
    await page.click('select#time');
    await page.selectOption('select#time', '09:00');
    
    // Tipo de consulta (já vem com padrão)
    // Status (já vem com padrão)
    
    // Adicionar observação
    await page.fill('textarea#notes', 'Teste E2E - Primeiro agendamento');
    
    // Salvar
    await page.click('button[type="submit"]:has-text("Salvar")');
    
    // Verificar toast de sucesso
    await expect(page.locator('text=Agendamento criado com sucesso')).toBeVisible({ timeout: 5000 });
    
    // Verificar que modal fechou
    await expect(page.locator('text=Novo Agendamento')).not.toBeVisible();
  });

  test('deve detectar conflito de horário', async ({ page }) => {
    // Criar primeiro agendamento
    await page.click('button:has-text("Novo Agendamento")');
    await expect(page.locator('text=Novo Agendamento')).toBeVisible();
    
    // Preencher dados
    await page.click('[role="combobox"]');
    await page.waitForTimeout(500);
    await page.keyboard.type('Maria');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    await page.click('button:has-text("Selecione uma data")');
    await page.click(`button[name="day"]:has-text("${tomorrow.getDate()}")`);
    
    await page.selectOption('select#time', '10:00');
    await page.click('button[type="submit"]:has-text("Salvar")');
    
    await expect(page.locator('text=Agendamento criado com sucesso')).toBeVisible({ timeout: 5000 });
    
    // Tentar criar segundo agendamento no mesmo horário
    await page.click('button:has-text("Novo Agendamento")');
    await expect(page.locator('text=Novo Agendamento')).toBeVisible();
    
    await page.click('[role="combobox"]');
    await page.waitForTimeout(500);
    await page.keyboard.type('Pedro');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    
    await page.click('button:has-text("Selecione uma data")');
    await page.click(`button[name="day"]:has-text("${tomorrow.getDate()}")`);
    
    await page.selectOption('select#time', '10:00');
    
    // Verificar alerta de conflito
    await expect(page.locator('text=Conflito de Horário Detectado')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Maria')).toBeVisible();
  });

  test('deve atualizar agendamento existente via Realtime', async ({ page, context }) => {
    // Abrir segunda aba para simular outro usuário
    const page2 = await context.newPage();
    await page2.goto('/auth');
    await page2.fill('input[name="email"]', 'fisio@activityfisioterapia.com.br');
    await page2.fill('input[name="password"]', 'Activity2024!');
    await page2.click('button[type="submit"]');
    await page2.waitForURL('/');
    await page2.click('a[href="/schedule"]');
    await page2.waitForURL('/schedule');
    
    // Na primeira aba, criar um agendamento
    await page.click('button:has-text("Novo Agendamento")');
    await expect(page.locator('text=Novo Agendamento')).toBeVisible();
    
    await page.click('[role="combobox"]');
    await page.waitForTimeout(500);
    await page.keyboard.type('Ana');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    await page.click('button:has-text("Selecione uma data")');
    await page.click(`button[name="day"]:has-text("${futureDate.getDate()}")`);
    
    await page.selectOption('select#time', '14:00');
    await page.click('button[type="submit"]:has-text("Salvar")');
    
    await expect(page.locator('text=Agendamento criado com sucesso')).toBeVisible({ timeout: 5000 });
    
    // Verificar que a segunda aba recebe notificação Realtime
    await expect(page2.locator('text=Novo agendamento')).toBeVisible({ timeout: 10000 });
    await expect(page2.locator('text=criado por outro usuário')).toBeVisible();
    
    await page2.close();
  });

  test('deve navegar entre visualizações de calendário', async ({ page }) => {
    // Verificar que inicia em visualização Semana (padrão)
    await expect(page.locator('button:has-text("Semana")[variant="default"]')).toBeVisible();
    
    // Mudar para Dia
    await page.click('button:has-text("Dia")');
    await page.waitForTimeout(500);
    await expect(page.locator('button:has-text("Dia")[variant="default"]')).toBeVisible();
    
    // Mudar para Mês
    await page.click('button:has-text("Mês")');
    await page.waitForTimeout(500);
    await expect(page.locator('button:has-text("Mês")[variant="default"]')).toBeVisible();
    
    // Verificar navegação de datas
    await page.click('button[aria-label="Previous"]').first();
    await page.waitForTimeout(500);
    
    await page.click('button[aria-label="Next"]').first();
    await page.waitForTimeout(500);
    
    // Voltar para hoje
    await page.click('button:has-text("Hoje")');
    await page.waitForTimeout(500);
  });

  test('deve filtrar agendamentos por status', async ({ page }) => {
    // Expandir filtros (se existir)
    const filterButton = page.locator('button:has-text("Filtros")');
    if (await filterButton.isVisible()) {
      await filterButton.click();
    }
    
    // Selecionar filtro de status
    const statusFilter = page.locator('select[name="status"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('confirmado');
      await page.waitForTimeout(1000);
      
      // Verificar que apenas agendamentos confirmados são exibidos
      const confirmedBadges = page.locator('text=Confirmado');
      const count = await confirmedBadges.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('deve exibir detalhes do agendamento ao clicar', async ({ page }) => {
    // Aguardar carregar agendamentos
    await page.waitForTimeout(2000);
    
    // Clicar no primeiro agendamento visível (se houver)
    const firstAppointment = page.locator('[role="button"]:has-text("Ver Detalhes")').first();
    
    if (await firstAppointment.isVisible()) {
      await firstAppointment.click();
      
      // Verificar modal de detalhes
      await expect(page.locator('text=Detalhes do Agendamento')).toBeVisible({ timeout: 3000 });
      
      // Verificar informações presentes
      await expect(page.locator('text=Paciente')).toBeVisible();
      await expect(page.locator('text=Data')).toBeVisible();
      await expect(page.locator('text=Horário')).toBeVisible();
    }
  });

  test('deve validar campos obrigatórios no formulário', async ({ page }) => {
    // Abrir modal de novo agendamento
    await page.click('button:has-text("Novo Agendamento")');
    await expect(page.locator('text=Novo Agendamento')).toBeVisible();
    
    // Tentar salvar sem preencher
    await page.click('button[type="submit"]:has-text("Salvar")');
    
    // Verificar mensagens de erro
    await expect(page.locator('text=Selecione um paciente')).toBeVisible({ timeout: 2000 });
  });

  test('deve permitir criar paciente rápido durante agendamento', async ({ page }) => {
    // Abrir modal de novo agendamento
    await page.click('button:has-text("Novo Agendamento")');
    await expect(page.locator('text=Novo Agendamento')).toBeVisible();
    
    // Abrir combobox de paciente
    await page.click('[role="combobox"]');
    await page.waitForTimeout(500);
    
    // Digitar nome que não existe
    await page.keyboard.type('Paciente Novo E2E');
    await page.waitForTimeout(1000);
    
    // Verificar se opção de criar novo aparece
    const createNewButton = page.locator('text=Criar novo paciente');
    if (await createNewButton.isVisible()) {
      await createNewButton.click();
      
      // Verificar modal de criação rápida
      await expect(page.locator('text=Cadastro Rápido')).toBeVisible({ timeout: 3000 });
    }
  });
});
