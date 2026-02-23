/**
 * Testes E2E para Fluxo de Agendamento
 *
 * Testa o fluxo completo de gerenciamento de agendamentos incluindo:
 * - Criação de agendamento
 * - Visualização de calendário (dia/semana/mês)
 * - Edição de agendamento
 * - Cancelamento de agendamento
 * - Alteração de status
 * - Visualização rápida (quick view)
 * - Pagamento
 * - Drag and drop de agendamentos
 */

import { test, expect, Page } from '@playwright/test';
import { login, TEST_CREDENTIALS } from './fixtures/auth';
import { createPatient } from './fixtures/patients';
import {
  navigateTo,
  goToAgenda,
  expectToast,
  waitForScreenLoad,
} from './helpers/navigation';

/**
 * Dados de agendamento de teste
 */
const TEST_APPOINTMENT = {
  type: 'consulta' as const,
  date: '2026-02-24',
  time: '14:00',
  duration: 60,
  room: 'Sala 1',
  notes: 'Consulta de acompanhamento',
  price: 150,
} as const;

/**
 * Cria um novo agendamento
 */
async function createAppointment(page: Page, patientName: string, data = TEST_APPOINTMENT): Promise<string> {
  await page.click('[data-testid="add-appointment-button"]');

  // Selecionar paciente
  await page.click('[data-testid="patient-select"]');
  await page.fill('[data-testid="patient-search-input"]', patientName);
  await page.click(`[data-testid="patient-option-${patientName}"]`);

  // Selecionar tipo
  await page.click('[data-testid="appointment-type-select"]');
  await page.click(`[data-testid="type-${data.type}"]`);

  // Selecionar data
  await page.fill('[data-testid="appointment-date"]', data.date);

  // Selecionar horário
  await page.click('[data-testid="appointment-time"]');
  await page.click(`[data-testid="time-${data.time.replace(':', '-')}"]`);

  // Preencher campos opcionais
  if (data.room) {
    await page.fill('[data-testid="appointment-room"]', data.room);
  }

  if (data.notes) {
    await page.fill('[data-testid="appointment-notes"]', data.notes);
  }

  if (data.price) {
    await page.fill('[data-testid="appointment-price"]', data.price.toString());
  }

  // Salvar
  await page.click('[data-testid="save-appointment-button"]');

  await expectToast(page, 'Agendamento criado com sucesso');

  // Obter ID do agendamento
  const appointmentId = await getAppointmentIdFromPage(page);
  return appointmentId;
}

/**
 * Navega para detalhes do agendamento
 */
async function goToAppointmentDetails(page: Page, appointmentId: string): Promise<void> {
  await navigateTo(page, `/agenda/${appointmentId}`);
  await waitForScreenLoad(page, 'appointment-details');
}

/**
 * Abre quick view do agendamento
 */
async function openQuickView(page: Page, appointmentId: string): Promise<void> {
  await page.click(`[data-testid="appointment-card-${appointmentId}"]`);
  await expect(page.locator('[data-testid="appointment-quick-view"]')).toBeVisible();
}

/**
 * Fecha quick view
 */
async function closeQuickView(page: Page): Promise<void> {
  await page.click('[data-testid="close-quick-view"]');
  await expect(page.locator('[data-testid="appointment-quick-view"]')).not.toBeVisible();
}

/**
 * Altera status do agendamento
 */
async function changeAppointmentStatus(page: Page, status: string): Promise<void> {
  await page.click('[data-testid="appointment-status-button"]');
  await page.click(`[data-testid="status-${status}"]`);

  await expectToast(page, 'Status atualizado com sucesso');
}

/**
 * Obtém ID do agendamento da página atual
 */
async function getAppointmentIdFromPage(page: Page): Promise<string> {
  const url = page.url();
  const match = url.match(/agenda\/([a-f0-9-]+)/i);
  if (match) {
    return match[1];
  }

  const element = await page.getAttribute('[data-testid="appointment-card"]', 'data-appointment-id');
  if (element) {
    return element;
  }

  throw new Error('Could not find appointment ID');
}

test.describe('Fluxo de Agendamento', () => {
  let page: Page;
  let patientName: string;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await login(page, TEST_CREDENTIALS.professional);

    // Criar paciente para usar nos testes
    patientName = `Paciente Teste ${Date.now()}`;
    await navigateTo(page, '/(tabs)/patients');
    await createPatient(page, {
      name: patientName,
      email: 'test@example.com',
      phone: '11987654321',
      dateOfBirth: '1990-01-01',
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Criação de Agendamento', () => {
    test('deve criar agendamento com dados básicos', async () => {
      await goToAgenda(page);

      const basicAppointment = {
        type: 'consulta' as const,
        date: '2026-02-24',
        time: '10:00',
      };

      const appointmentId = await createAppointment(page, patientName, basicAppointment);

      // Verificar que agendamento aparece no calendário
      await expect(page.locator(`[data-testid="appointment-card-${appointmentId}"]`)).toBeVisible();
    });

    test('deve criar agendamento com todos os campos', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName, TEST_APPOINTMENT);

      // Abrir detalhes
      await goToAppointmentDetails(page, appointmentId);

      // Verificar campos
      await expect(page.locator('[data-testid="appointment-patient"]')).toContainText(patientName);
      await expect(page.locator('[data-testid="appointment-type"]')).toContainText('consulta');
      await expect(page.locator('[data-testid="appointment-room"]')).toContainText(TEST_APPOINTMENT.room);
    });

    test('deve validar campos obrigatórios', async () => {
      await goToAgenda(page);
      await page.click('[data-testid="add-appointment-button"]');

      // Tentar salvar sem preencher
      await page.click('[data-testid="save-appointment-button"]');

      // Verificar erros
      await expect(page.locator('[data-testid="patient-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="date-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="time-error"]')).toBeVisible();
    });

    test('deve validar horário de funcionamento', async () => {
      await goToAgenda(page);
      await page.click('[data-testid="add-appointment-button"]');

      // Tentar selecionar horário fora do funcionamento
      await page.click('[data-testid="appointment-time"]');
      await page.click('[data-testid="time-06:00"]'); // Antes de abrir

      await expect(page.locator('[data-testid="time-error"]')).toContainText('horário de funcionamento');
    });
  });

  test.describe('Visualização de Calendário', () => {
    test('deve mostrar visualização de dia', async () => {
      await goToAgenda(page);

      // Trocar para visualização diária
      await page.click('[data-testid="view-day"]');

      await expect(page.locator('[data-testid="day-view"]')).toBeVisible();
    });

    test('deve mostrar visualização de semana', async () => {
      await goToAgenda(page);

      // Trocar para visualização semanal
      await page.click('[data-testid="view-week"]');

      await expect(page.locator('[data-testid="week-view"]')).toBeVisible();
    });

    test('deve mostrar visualização de mês', async () => {
      await goToAgenda(page);

      // Trocar para visualização mensal
      await page.click('[data-testid="view-month"]');

      await expect(page.locator('[data-testid="month-view"]')).toBeVisible();
    });

    test('deve navegar para dia anterior/próximo', async () => {
      await goToAgenda(page);

      const currentDate = await page.textContent('[data-testid="current-date"]');

      // Navegar para próximo dia
      await page.click('[data-testid="next-day"]');
      const nextDate = await page.textContent('[data-testid="current-date"]');

      expect(nextDate).not.toBe(currentDate);
    });

    test('deve navegar para hoje', async () => {
      await goToAgenda(page);

      // Navegar para outra data
      await page.click('[data-testid="next-day"]');

      // Voltar para hoje
      await page.click('[data-testid="go-to-today"]');

      const todayIndicator = await page.textContent('[data-testid="today-indicator"]');
      expect(todayIndicator).toBe('Hoje');
    });
  });

  test.describe('Quick View', () => {
    test('deve abrir quick view ao clicar no agendamento', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName);

      await openQuickView(page, appointmentId);

      // Verificar informações no quick view
      await expect(page.locator('[data-testid="quick-view-patient"]')).toContainText(patientName);
      await expect(page.locator('[data-testid="quick-view-time"]')).toBeVisible();
    });

    test('deve permitir ações do quick view', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName);

      await openQuickView(page, appointmentId);

      // Verificar botões de ação
      await expect(page.locator('[data-testid="quick-view-edit"]')).toBeVisible();
      await expect(page.locator('[data-testid="quick-view-cancel"]')).toBeVisible();
      await expect(page.locator('[data-testid="quick-view-status"]')).toBeVisible();
    });

    test('deve fechar quick view ao clicar fora', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName);

      await openQuickView(page, appointmentId);

      // Clicar fora do modal
      await page.click('[data-testid="quick-view-backdrop"]');

      await expect(page.locator('[data-testid="appointment-quick-view"]')).not.toBeVisible();
    });
  });

  test.describe('Edição de Agendamento', () => {
    test('deve atualizar dados do agendamento', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName);

      await goToAppointmentDetails(page, appointmentId);
      await page.click('[data-testid="edit-appointment-button"]');

      // Alterar horário
      await page.click('[data-testid="appointment-time"]');
      await page.click('[data-testid="time-15:00"]');

      await page.click('[data-testid="save-appointment-button"]');

      await expectToast(page, 'Agendamento atualizado com sucesso');

      // Verificar atualização
      await openQuickView(page, appointmentId);
      await expect(page.locator('[data-testid="quick-view-time"]')).toContainText('15:00');
    });

    test('deve alterar tipo de agendamento', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName, { ...TEST_APPOINTMENT, type: 'consulta' });

      await goToAppointmentDetails(page, appointmentId);
      await page.click('[data-testid="edit-appointment-button"]');

      await page.click('[data-testid="appointment-type-select"]');
      await page.click('[data-testid="type-avaliação"]');

      await page.click('[data-testid="save-appointment-button"]');

      await expectToast(page, 'Agendamento atualizado com sucesso');

      // Verificar novo tipo
      await openQuickView(page, appointmentId);
      await expect(page.locator('[data-testid="quick-view-type"]')).toContainText('avaliação');
    });
  });

  test.describe('Status do Agendamento', () => {
    test('deve alterar status para confirmado', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName);

      await openQuickView(page, appointmentId);
      await changeAppointmentStatus(page, 'confirmado');

      // Verificar indicador visual de status
      const statusBadge = page.locator(`[data-testid="appointment-card-${appointmentId}"] [data-testid="status-badge"]`);
      await expect(statusBadge).toHaveAttribute('data-status', 'confirmado');
    });

    test('deve marcar como em andamento', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName);

      await openQuickView(page, appointmentId);
      await changeAppointmentStatus(page, 'em_andamento');

      const statusBadge = page.locator(`[data-testid="appointment-card-${appointmentId}"] [data-testid="status-badge"]`);
      await expect(statusBadge).toHaveAttribute('data-status', 'em_andamento');
    });

    test('deve marcar como concluído', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName);

      await openQuickView(page, appointmentId);
      await changeAppointmentStatus(page, 'concluido');

      const statusBadge = page.locator(`[data-testid="appointment-card-${appointmentId}"] [data-testid="status-badge"]`);
      await expect(statusBadge).toHaveAttribute('data-status', 'concluido');
    });

    test('deve cancelar agendamento', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName);

      await openQuickView(page, appointmentId);
      await changeAppointmentStatus(page, 'cancelado');

      // Verificar aparência diferente de cancelado
      const appointmentCard = page.locator(`[data-testid="appointment-card-${appointmentId}"]`);
      await expect(appointmentCard).toHaveClass(/cancelled/);
    });
  });

  test.describe('Pagamento', () => {
    test('deve marcar agendamento como pago', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName, TEST_APPOINTMENT);

      await openQuickView(page, appointmentId);
      await page.click('[data-testid="mark-as-paid-button"]');

      await expectToast(page, 'Pagamento confirmado');

      // Verificar indicador de pagamento
      const paymentIndicator = page.locator(`[data-testid="appointment-card-${appointmentId}"] [data-testid="payment-status"]`);
      await expect(paymentIndicator).toContainText('pago');
    });

    test('deve mostrar valor do agendamento', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName, TEST_APPOINTMENT);

      await openQuickView(page, appointmentId);

      await expect(page.locator('[data-testid="quick-view-price"]')).toContainText('R$ 150,00');
    });
  });

  test.describe('Drag and Drop', () => {
    test('deve mover agendamento para outro horário', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName, { ...TEST_APPOINTMENT, time: '10:00' });

      // Trocar para visualização semanal para facilitar drag and drop
      await page.click('[data-testid="view-week"]');

      // Fazer drag and drop
      const appointmentCard = page.locator(`[data-testid="appointment-card-${appointmentId}"]`);
      const targetSlot = page.locator('[data-testid="time-slot-14:00"]');

      await appointmentCard.dragTo(targetSlot);

      await expectToast(page, 'Horário atualizado com sucesso');

      // Verificar novo horário
      await openQuickView(page, appointmentId);
      await expect(page.locator('[data-testid="quick-view-time"]')).toContainText('14:00');
    });

    test('deve mover agendamento para outro dia', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName, { ...TEST_APPOINTMENT, date: '2026-02-24' });

      await page.click('[data-testid="view-week"]');

      const appointmentCard = page.locator(`[data-testid="appointment-card-${appointmentId}"]`);
      const targetDay = page.locator('[data-testid="day-2026-02-25"]');

      await appointmentCard.dragTo(targetDay);

      await expectToast(page, 'Data atualizada com sucesso');
    });

    test('deve prevenir conflito de horário', async () => {
      await goToAgenda(page);

      // Criar agendamento às 10:00
      await createAppointment(page, patientName, { ...TEST_APPOINTMENT, time: '10:00' });

      // Tentar criar outro no mesmo horário
      await page.click('[data-testid="add-appointment-button"]');
      await page.fill('[data-testid="patient-search-input"]', patientName);
      await page.click(`[data-testid="patient-option-${patientName}"]`);

      await page.click('[data-testid="appointment-time"]');
      await page.click('[data-testid="time-10:00"]');

      await expect(page.locator('[data-testid="conflict-warning"]')).toBeVisible();
    });
  });

  test.describe('Notas e Observações', () => {
    test('deve adicionar nota ao agendamento', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName);

      await goToAppointmentDetails(page, appointmentId);
      await page.click('[data-testid="add-note-button"]');

      await page.fill('[data-testid="note-input"]', 'Paciente chegou 5 minutos adiantado.');
      await page.click('[data-testid="save-note-button"]');

      await expectToast(page, 'Nota adicionada');

      await expect(page.locator('[data-testid="appointment-note"]')).toContainText('5 minutos adiantado');
    });
  });

  test.describe('Exclusão', () => {
    test('deve deletar agendamento com confirmação', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName);

      await openQuickView(page, appointmentId);
      await page.click('[data-testid="quick-view-cancel"]');

      // Confirmar
      await page.click('[data-testid="confirm-delete-button"]');

      await expectToast(page, 'Agendamento cancelado');

      // Verificar que não aparece mais
      await expect(page.locator(`[data-testid="appointment-card-${appointmentId}"]`)).not.toBeVisible();
    });
  });

  test.describe('Acessibilidade', () => {
    test('deve ter labels ARIA nos cards', async () => {
      await goToAgenda(page);
      const appointmentId = await createAppointment(page, patientName);

      const appointmentCard = page.locator(`[data-testid="appointment-card-${appointmentId}"]`);
      await expect(appointmentCard).toHaveAttribute('role', 'button');
    });
  });
});
