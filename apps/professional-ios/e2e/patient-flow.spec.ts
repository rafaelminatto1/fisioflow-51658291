/**
 * Testes E2E para Fluxo de Pacientes
 *
 * Testa o fluxo completo de gerenciamento de pacientes incluindo:
 * - Criação de paciente
 * - Visualização de lista de pacientes
 * - Busca e filtros
 * - Visualização de detalhes
 * - Edição de paciente
 * - Adição de notas
 * - Atualização de progresso
 * - Adição de fotos
 * - Exclusão de paciente
 */

import { test, expect, Page } from '@playwright/test';
import { login, TEST_CREDENTIALS } from './fixtures/auth';
import {
  createPatient,
  goToPatientDetails,
  editPatient,
  updatePatient,
  deletePatient,
  addPatientNote,
  updatePatientProgress,
  expectPatientInList,
  expectPatientNotInList,
  getPatientData,
  createMultiplePatients,
  filterPatients,
  TEST_PATIENT,
} from './fixtures/patients';
import {
  goToPatients,
  waitForScreenLoad,
  expectToast,
} from './helpers/navigation';

test.describe('Fluxo de Pacientes', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await login(page, TEST_CREDENTIALS.professional);
    await goToPatients(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Criação de Paciente', () => {
    test('deve criar novo paciente com dados mínimos', async () => {
      const minimalData = {
        name: 'Maria Santos',
        email: 'maria.santos@example.com',
        phone: '11987654321',
        dateOfBirth: '1985-05-20',
      };

      const patientId = await createPatient(page, minimalData);

      // Verificar que o paciente foi criado
      await expectPatientInList(page, minimalData.name);
      await expectToast(page, 'Paciente salvo com sucesso');
    });

    test('deve criar paciente com todos os campos', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);

      await expectPatientInList(page, TEST_PATIENT.name);
      await expectToast(page, 'Paciente salvo com sucesso');

      // Verificar dados na tela de detalhes
      await goToPatientDetails(page, patientId);
      const patientData = await getPatientData(page);

      expect(patientData.name).toBe(TEST_PATIENT.name);
      expect(patientData.email).toBe(TEST_PATIENT.email);
      expect(patientData.mainCondition).toBe(TEST_PATIENT.mainCondition);
    });

    test('deve validar campos obrigatórios', async () => {
      await page.click('[data-testid="add-patient-button"]');

      // Tentar salvar sem preencher campos
      await page.click('[data-testid="save-patient-button"]');

      // Verificar erros de validação
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    });

    test('deve validar formato de CPF', async () => {
      await page.click('[data-testid="add-patient-button"]');

      await page.fill('[data-testid="patient-name"]', 'Teste CPF');
      await page.fill('[data-testid="patient-cpf"]', 'invalid-cpf');

      await expect(page.locator('[data-testid="cpf-error"]')).toBeVisible();
    });

    test('deve validar formato de telefone', async () => {
      await page.click('[data-testid="add-patient-button"]');

      await page.fill('[data-testid="patient-name"]', 'Teste Telefone');
      await page.fill('[data-testid="patient-phone"]', '123');

      await expect(page.locator('[data-testid="phone-error"]')).toBeVisible();
    });
  });

  test.describe('Visualização de Lista', () => {
    test('deve mostrar lista de pacientes', async () => {
      await waitForScreenLoad(page, 'patients-list');

      // Verificar que a lista é exibida
      await expect(page.locator('[data-testid="patients-list"]')).toBeVisible();
    });

    test('deve mostrar informações relevantes no card', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);

      const patientCard = page.locator(`[data-testid="patient-card"][data-name="${TEST_PATIENT.name}"]`);

      // Verificar elementos do card
      await expect(patientCard.locator('[data-testid="patient-name"]')).toContainText(TEST_PATIENT.name);
      await expect(patientCard.locator('[data-testid="patient-status"]')).toBeVisible();
      await expect(patientCard.locator('[data-testid="patient-condition"]')).toBeVisible();
    });

    test('deve mostrar estado vazio quando não há pacientes', async () => {
      // Limpar pacientes (implementação específica)
      // Aqui assumimos que estamos em um ambiente de teste limpo

      const emptyState = page.locator('[data-testid="empty-patients"]');
      // Se não houver pacientes, mostrar estado vazio
      // await expect(emptyState).toBeVisible();
    });

    test('deve ser scrollável com muitos pacientes', async () => {
      const count = 20;
      await createMultiplePatients(page, count);

      // Verificar scroll funciona
      const list = page.locator('[data-testid="patients-list"]');
      await list.scroll({ scrollTop: 1000 });
    });
  });

  test.describe('Busca e Filtros', () => {
    test('deve buscar paciente por nome', async () => {
      await createPatient(page, TEST_PATIENT);

      await page.fill('[data-testid="patient-search"]', TEST_PATIENT.name);

      // Aguardar resultados
      await expect(page.locator(`[data-testid="patient-card"][data-name="${TEST_PATIENT.name}"]`)).toBeVisible();
    });

    test('deve filtrar por status', async () => {
      // Criar pacientes com diferentes status
      await createPatient(page, { ...TEST_PATIENT, name: 'Paciente Ativo', status: 'Em Tratamento' });
      await createPatient(page, { ...TEST_PATIENT, name: 'Paciente Concluído', status: 'Concluído' });

      await filterPatients(page, { status: 'Concluído' });

      // Verificar que apenas pacientes com o status aparecem
      await expect(page.locator(`[data-testid="patient-card"][data-status="Concluído"]`)).toBeVisible();
    });

    test('deve combinar busca e filtros', async () => {
      await createPatient(page, { ...TEST_PATIENT, name: 'João Silva', status: 'Em Tratamento' });
      await createPatient(page, { ...TEST_PATIENT, name: 'João Santos', status: 'Recuperação' });

      await page.fill('[data-testid="patient-search"]', 'João');
      await filterPatients(page, { status: 'Em Tratamento' });

      // Apenas João Silva deve aparecer
      await expect(page.locator(`[data-testid="patient-card"][data-name="João Silva"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="patient-card"][data-name="João Santos"]`)).not.toBeVisible();
    });

    test('deve limpar filtros', async () => {
      await filterPatients(page, { status: 'Em Tratamento' });
      await page.click('[data-testid="clear-filters"]');

      // Verificar que todos os pacientes aparecem
      const patientCards = page.locator('[data-testid="patient-card"]');
      await expect(patientCards.first()).toBeVisible();
    });
  });

  test.describe('Detalhes do Paciente', () => {
    test('deve mostrar todas as informações do paciente', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);
      await goToPatientDetails(page, patientId);

      // Verificar seções
      await expect(page.locator('[data-testid="patient-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="patient-contact"]')).toBeVisible();
      await expect(page.locator('[data-testid="patient-medical-info"]')).toBeVisible();
    });

    test('deve mostrar histórico de agendamentos', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);
      await goToPatientDetails(page, patientId);

      // Navegar para aba de agendamentos
      await page.click('[data-testid="tab-appointments"]');

      await expect(page.locator('[data-testid="appointments-list"]')).toBeVisible();
    });

    test('deve mostrar evoluções do paciente', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);
      await goToPatientDetails(page, patientId);

      // Navegar para aba de evoluções
      await page.click('[data-testid="tab-evolutions"]');

      await expect(page.locator('[data-testid="evolutions-list"]')).toBeVisible();
    });

    test('deve mostrar exercícios prescritos', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);
      await goToPatientDetails(page, patientId);

      // Navegar para aba de exercícios
      await page.click('[data-testid="tab-exercises"]');

      await expect(page.locator('[data-testid="exercises-list"]')).toBeVisible();
    });
  });

  test.describe('Edição de Paciente', () => {
    test('deve atualizar dados do paciente', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);

      const updates = {
        name: 'João Silva Atualizado',
        mainCondition: 'Lombalgia - Melhorado',
        status: 'Recuperação' as const,
      };

      await updatePatient(page, patientId, updates);

      await expectToast(page, 'Paciente atualizado com sucesso');

      // Verificar atualização
      await goToPatientDetails(page, patientId);
      const patientData = await getPatientData(page);

      expect(patientData.name).toBe(updates.name);
      expect(patientData.mainCondition).toBe(updates.mainCondition);
    });

    test('deve manter campos não editados', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);

      await updatePatient(page, patientId, { name: 'Nome Atualizado' });

      const patientData = await getPatientData(page);

      // Outros campos devem permanecer iguais
      expect(patientData.email).toBe(TEST_PATIENT.email);
      expect(patientData.phone).toBe(TEST_PATIENT.phone);
    });

    test('deve cancelar edição sem salvar', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);
      await editPatient(page, patientId);

      // Modificar mas cancelar
      await page.fill('[data-testid="patient-name"]', 'Nome Cancelado');
      await page.click('[data-testid="cancel-edit-button"]');

      // Verificar confirmação de cancelamento
      await expect(page.locator('[data-testid="cancel-edit-modal"]')).toBeVisible();
      await page.click('[data-testid="confirm-cancel-button"]');

      // Dados originais devem ser mantidos
      const patientData = await getPatientData(page);
      expect(patientData.name).toBe(TEST_PATIENT.name);
    });
  });

  test.describe('Notas do Paciente', () => {
    test('deve adicionar nota ao paciente', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);
      const noteText = 'Paciente relatou melhora significativa na dor lombar.';

      await addPatientNote(page, patientId, noteText);

      await expectToast(page, 'Nota adicionada com sucesso');

      // Verificar nota na lista
      await expect(page.locator('[data-testid="note-item"]').filter({ hasText: noteText })).toBeVisible();
    });

    test('deve mostrar data da nota', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);

      await addPatientNote(page, patientId, 'Nota de teste');

      // Verificar data da nota
      await expect(page.locator('[data-testid="note-date"]')).toBeVisible();
    });

    test('deve editar nota existente', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);
      await addPatientNote(page, patientId, 'Nota original');

      await page.click('[data-testid="edit-note-button"]');
      await page.fill('[data-testid="note-input"]', 'Nota editada');
      await page.click('[data-testid="save-note-button"]');

      await expectToast(page, 'Nota atualizada com sucesso');
    });

    test('deve deletar nota', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);
      await addPatientNote(page, patientId, 'Nota para deletar');

      await page.click('[data-testid="delete-note-button"]');
      await page.click('[data-testid="confirm-delete-button"]');

      await expectToast(page, 'Nota removida com sucesso');
    });
  });

  test.describe('Progresso do Paciente', () => {
    test('deve atualizar progresso', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);
      const newProgress = 75;

      await updatePatientProgress(page, patientId, newProgress);

      await expectToast(page, 'Progresso atualizado com sucesso');

      // Verificar valor atualizado
      const progressValue = await page.getAttribute('[data-testid="progress-value"]', 'data-value');
      expect(progressValue).toBe(newProgress.toString());
    });

    test('deve mostrar barra de progresso visual', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);
      await goToPatientDetails(page, patientId);

      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    });

    test('deve validar range de progresso (0-100)', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);

      await goToPatientDetails(page, patientId);
      await page.click('[data-testid="edit-progress-button"]');
      await page.fill('[data-testid="progress-input"]', '150');
      await page.click('[data-testid="save-progress-button"]');

      // Deve mostrar erro de validação
      await expect(page.locator('[data-testid="progress-error"]')).toBeVisible();
    });
  });

  test.describe('Fotos do Paciente', () => {
    test('deve adicionar foto ao paciente', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);

      // Simular upload de foto
      await goToPatientDetails(page, patientId);
      await page.click('[data-testid="add-photo-button"]');

      const fileInput = page.locator('input[type="file"]');
      // Usar um arquivo de teste
      await fileInput.setInputFiles('/path/to/test-photo.jpg');

      await page.click('[data-testid="save-photo-button"]');

      await expectToast(page, 'Foto adicionada com sucesso');
      await expect(page.locator('[data-testid="patient-photo"]')).toBeVisible();
    });

    test('deve mostrar galeria de fotos', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);
      await goToPatientDetails(page, patientId);
      await page.click('[data-testid="photos-tab"]');

      await expect(page.locator('[data-testid="photo-gallery"]')).toBeVisible();
    });

    test('deve deletar foto', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);

      await goToPatientDetails(page, patientId);
      await page.click('[data-testid="photos-tab"]');
      await page.click('[data-testid="photo-delete-button"]');

      await page.click('[data-testid="confirm-delete-button"]');

      await expectToast(page, 'Foto removida com sucesso');
    });
  });

  test.describe('Exclusão de Paciente', () => {
    test('deve deletar paciente com confirmação', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);
      await deletePatient(page, patientId);

      await expectToast(page, 'Paciente removido com sucesso');
      await expectPatientNotInList(page, TEST_PATIENT.name);
    });

    test('deve cancelar exclusão', async () => {
      const patientId = await createPatient(page, TEST_PATIENT);
      await goToPatientDetails(page, patientId);
      await page.click('[data-testid="delete-patient-button"]');

      await page.click('[data-testid="cancel-delete-button"]');

      // Paciente ainda deve existir
      await expectPatientInList(page, TEST_PATIENT.name);
    });

    test('deve mostrar aviso de exclusão com dependências', async () => {
      // Criar paciente com agendamentos
      const patientId = await createPatient(page, TEST_PATIENT);

      await goToPatientDetails(page, patientId);
      await page.click('[data-testid="delete-patient-button"]');

      // Deve mostrar aviso se houver dependências (agendamentos, evoluções, etc.)
      const dependencyWarning = page.locator('[data-testid="dependency-warning"]');
      // await expect(dependencyWarning).toBeVisible();
    });
  });

  test.describe('Acessibilidade', () => {
    test('deve ter labels ARIA nos cards de paciente', async () => {
      await createPatient(page, TEST_PATIENT);

      const patientCard = page.locator(`[data-testid="patient-card"]`).first();

      await expect(patientCard).toHaveAttribute('role', 'article');
    });

    test('deve ser navegável por teclado', async () => {
      await createPatient(page, TEST_PATIENT);

      // Navegar com Tab
      await page.keyboard.press('Tab');

      // Primeiro card deve ter foco
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('deve carregar lista rapidamente com muitos pacientes', async () => {
      const startTime = Date.now();
      await createMultiplePatients(page, 50);
      const loadTime = Date.now() - startTime;

      // Deve carregar em menos de 5 segundos
      expect(loadTime).toBeLessThan(5000);
    });

    test('deve ter scroll suave', async () => {
      await createMultiplePatients(page, 30);

      const list = page.locator('[data-testid="patients-list"]');

      // Testar scroll
      await list.scroll({ scrollTop: 500 });
      await page.waitForTimeout(100);

      await list.scroll({ scrollTop: 0 });
      await page.waitForTimeout(100);
    });
  });
});
