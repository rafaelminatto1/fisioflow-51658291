/**
 * Testes E2E para Fluxo de Evolução do Paciente
 *
 * Testa o fluxo completo de gerenciamento de evoluções incluindo:
 * - Criação de evolução
 * - Visualização de histórico de evoluções
 * - Edição de evolução
 * - Adição de fotos à evolução
 * - Adição de vídeos
 * - Adição de exercícios prescritos
 * - Geração de relatório
 * - Exportação de PDF
 */

import { test, expect, Page } from '@playwright/test';
import { login, TEST_CREDENTIALS } from './fixtures/auth';
import { createPatient } from './fixtures/patients';
import {
  navigateTo,
  expectToast,
  waitForScreenLoad,
} from './helpers/navigation';

/**
 * Dados de evolução de teste
 */
const TEST_EVOLUTION = {
  date: '2026-02-23',
  subjective: 'Paciente relata diminuição da dor na região lombar.',
  objective: 'Exame físico mostra melhora na mobilidade da coluna.',
  assessment: 'Diagnóstico: Lombalgia mecânica em fase de recuperação.',
  plan: 'Continuar exercícios de fortalecimento core. Reavaliar em 15 dias.',
} as const;

/**
 * Navega para a tela de evoluções do paciente
 */
async function goToEvolutions(page: Page, patientId: string): Promise<void> {
  await navigateTo(page, `/patients/${patientId}/evolutions`);
  await waitForScreenLoad(page, 'evolutions-list');
}

/**
 * Cria uma nova evolução
 */
async function createEvolution(page: Page, patientId: string, data = TEST_EVOLUTION): Promise<string> {
  await goToEvolutions(page, patientId);
  await page.click('[data-testid="add-evolution-button"]');

  // Preencher campos
  if (data.date) {
    await page.fill('[data-testid="evolution-date"]', data.date);
  }

  if (data.subjective) {
    await page.fill('[data-testid="evolution-subjective"]', data.subjective);
  }

  if (data.objective) {
    await page.fill('[data-testid="evolution-objective"]', data.objective);
  }

  if (data.assessment) {
    await page.fill('[data-testid="evolution-assessment"]', data.assessment);
  }

  if (data.plan) {
    await page.fill('[data-testid="evolution-plan"]', data.plan);
  }

  await page.click('[data-testid="save-evolution-button"]');

  await expectToast(page, 'Evolução registrada com sucesso');

  const evolutionId = await getEvolutionIdFromPage(page);
  return evolutionId;
}

/**
 * Navega para detalhes da evolução
 */
async function goToEvolutionDetails(page: Page, evolutionId: string): Promise<void> {
  await page.click(`[data-testid="evolution-card-${evolutionId}"]`);
  await waitForScreenLoad(page, 'evolution-details');
}

/**
 * Obtém ID da evolução da página atual
 */
async function getEvolutionIdFromPage(page: Page): Promise<string> {
  const element = await page.getAttribute('[data-testid="evolution-card"]', 'data-evolution-id');
  if (element) {
    return element;
  }

  const url = page.url();
  const match = url.match(/evolutions\/([a-f0-9-]+)/i);
  if (match) {
    return match[1];
  }

  throw new Error('Could not find evolution ID');
}

/**
 * Adiciona foto à evolução
 */
async function addPhotoToEvolution(page: Page, evolutionId: string, photoPath: string): Promise<void> {
  await goToEvolutionDetails(page, evolutionId);
  await page.click('[data-testid="add-photo-button"]');

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(photoPath);

  await page.click('[data-testid="save-photo-button"]');

  await expectToast(page, 'Foto adicionada');
}

/**
 * Adiciona exercício à evolução
 */
async function addExerciseToEvolution(page: Page, evolutionId: string, exerciseName: string): Promise<void> {
  await goToEvolutionDetails(page, evolutionId);
  await page.click('[data-testid="add-exercise-button"]');

  await page.fill('[data-testid="exercise-search"]', exerciseName);
  await page.click(`[data-testid="exercise-option-${exerciseName}"]`);

  await page.fill('[data-testid="exercise-reps"]', '3');
  await page.fill('[data-testid="exercise-sets"]', '10');
  await page.fill('[data-testid="exercise-rest"]', '60');

  await page.click('[data-testid="save-exercise-button"]');

  await expectToast(page, 'Exercício adicionado');
}

test.describe('Fluxo de Evolução do Paciente', () => {
  let page: Page;
  let patientId: string;
  let patientName: string;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await login(page, TEST_CREDENTIALS.professional);

    // Criar paciente
    patientName = `Paciente Evolução ${Date.now()}`;
    await navigateTo(page, '/(tabs)/patients');
    patientId = await createPatient(page, {
      name: patientName,
      email: 'evolution@example.com',
      phone: '11987654321',
      dateOfBirth: '1990-01-01',
      mainCondition: 'Lombalgia',
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Criação de Evolução', () => {
    test('deve criar evolução com dados básicos', async () => {
      const evolutionId = await createEvolution(page, patientId);

      await expect(page.locator(`[data-testid="evolution-card-${evolutionId}"]`)).toBeVisible();
    });

    test('deve criar evolução com campos SOAP completos', async () => {
      const evolutionId = await createEvolution(page, patientId, TEST_EVOLUTION);

      await goToEvolutionDetails(page, evolutionId);

      await expect(page.locator('[data-testid="evolution-subjective"]')).toContainText(TEST_EVOLUTION.subjective);
      await expect(page.locator('[data-testid="evolution-objective"]')).toContainText(TEST_EVOLUTION.objective);
      await expect(page.locator('[data-testid="evolution-assessment"]')).toContainText(TEST_EVOLUTION.assessment);
      await expect(page.locator('[data-testid="evolution-plan"]')).toContainText(TEST_EVOLUTION.plan);
    });

    test('deve validar campos obrigatórios', async () => {
      await goToEvolutions(page, patientId);
      await page.click('[data-testid="add-evolution-button"]');

      // Tentar salvar sem preencher
      await page.click('[data-testid="save-evolution-button"]');

      // Verificar erros
      await expect(page.locator('[data-testid="subjective-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="objective-error"]')).toBeVisible();
    });

    test('deve pré-preencher data atual', async () => {
      await goToEvolutions(page, patientId);
      await page.click('[data-testid="add-evolution-button"]');

      const dateValue = await page.inputValue('[data-testid="evolution-date"]');

      // Deve ser a data de hoje
      const today = new Date().toISOString().split('T')[0];
      expect(dateValue).toBe(today);
    });
  });

  test.describe('Visualização de Histórico', () => {
    test('deve mostrar lista de evoluções ordenada por data', async () => {
      // Criar evoluções em datas diferentes
      await createEvolution(page, patientId, { ...TEST_EVOLUTION, date: '2026-02-20' });
      await createEvolution(page, patientId, { ...TEST_EVOLUTION, date: '2026-02-22' });
      await createEvolution(page, patientId, { ...TEST_EVOLUTION, date: '2026-02-18' });

      await goToEvolutions(page, patientId);

      // Verificar ordenação (mais recente primeiro)
      const evolutionCards = page.locator('[data-testid="evolution-card"]');
      const count = await evolutionCards.count();

      expect(count).toBeGreaterThan(0);

      const firstDate = await evolutionCards.first().getAttribute('data-date');
      const lastDate = await evolutionCards.last().getAttribute('data-date');

      // Primeiro deve ser mais recente que o último
      expect(firstDate).toBeGreaterThan(lastDate);
    });

    test('deve mostrar resumo na lista', async () => {
      const evolutionId = await createEvolution(page, patientId);

      const evolutionCard = page.locator(`[data-testid="evolution-card-${evolutionId}"]`);

      await expect(evolutionCard.locator('[data-testid="evolution-date"]')).toBeVisible();
      await expect(evolutionCard.locator('[data-testid="evolution-summary"]')).toBeVisible();
    });
  });

  test.describe('Edição de Evolução', () => {
    test('deve atualizar dados da evolução', async () => {
      const evolutionId = await createEvolution(page, patientId);

      await goToEvolutionDetails(page, evolutionId);
      await page.click('[data-testid="edit-evolution-button"]');

      // Alterar campo
      await page.fill('[data-testid="evolution-subjective"]', 'Texto atualizado');

      await page.click('[data-testid="save-evolution-button"]');

      await expectToast(page, 'Evolução atualizada com sucesso');

      await expect(page.locator('[data-testid="evolution-subjective"]')).toContainText('atualizado');
    });

    test('deve cancelar edição sem salvar', async () => {
      const evolutionId = await createEvolution(page, patientId);
      const originalText = TEST_EVOLUTION.subjective;

      await goToEvolutionDetails(page, evolutionId);
      await page.click('[data-testid="edit-evolution-button"]');

      await page.fill('[data-testid="evolution-subjective"]', 'Texto cancelado');
      await page.click('[data-testid="cancel-edit-button"]');

      // Texto original deve ser mantido
      await expect(page.locator('[data-testid="evolution-subjective"]')).toContainText(originalText);
    });
  });

  test.describe('Fotos e Mídia', () => {
    test('deve adicionar foto à evolução', async () => {
      const evolutionId = await createEvolution(page, patientId);

      await addPhotoToEvolution(page, evolutionId, '/path/to/test-photo.jpg');

      await expect(page.locator('[data-testid="evolution-photo"]')).toBeVisible();
    });

    test('deve mostrar galeria de fotos', async () => {
      const evolutionId = await createEvolution(page, patientId);

      await goToEvolutionDetails(page, evolutionId);
      await page.click('[data-testid="add-photo-button"]');

      // Adicionar múltiplas fotos
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(['/path/to/photo1.jpg', '/path/to/photo2.jpg']);

      await page.click('[data-testid="save-photo-button"]');

      await expect(page.locator('[data-testid="photo-gallery"]')).toBeVisible();
      const photos = page.locator('[data-testid="evolution-photo"]');
      expect(await photos.count()).toBeGreaterThan(1);
    });

    test('deve deletar foto', async () => {
      const evolutionId = await createEvolution(page, patientId);
      await addPhotoToEvolution(page, evolutionId, '/path/to/test-photo.jpg');

      await page.click('[data-testid="delete-photo-button"]');
      await page.click('[data-testid="confirm-delete-button"]');

      await expectToast(page, 'Foto removida');
    });
  });

  test.describe('Exercícios', () => {
    test('deve adicionar exercício prescrito', async () => {
      const evolutionId = await createEvolution(page, patientId);

      await addExerciseToEvolution(page, evolutionId, 'Prancha Abdominal');

      await expect(page.locator('[data-testid="exercise-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="exercise-card"]')).toContainText('Prancha Abdominal');
    });

    test('deve mostrar parâmetros do exercício', async () => {
      const evolutionId = await createEvolution(page, patientId);
      await addExerciseToEvolution(page, evolutionId, 'Agachamento');

      const exerciseCard = page.locator('[data-testid="exercise-card"]');

      await expect(exerciseCard.locator('[data-testid="exercise-sets"]')).toContainText('3');
      await expect(exerciseCard.locator('[data-testid="exercise-reps"]')).toContainText('10');
      await expect(exerciseCard.locator('[data-testid="exercise-rest"]')).toContainText('60s');
    });

    test('deve remover exercício', async () => {
      const evolutionId = await createEvolution(page, patientId);
      await addExerciseToEvolution(page, evolutionId, 'Agachamento');

      await page.click('[data-testid="remove-exercise-button"]');
      await page.click('[data-testid="confirm-remove-button"]');

      await expectToast(page, 'Exercício removido');
      await expect(page.locator('[data-testid="exercise-card"]')).not.toBeVisible();
    });
  });

  test.describe('Templates', () => {
    test('deve usar template de evolução', async () => {
      await goToEvolutions(page, patientId);
      await page.click('[data-testid="add-evolution-button"]');

      // Selecionar template
      await page.click('[data-testid="use-template-button"]');
      await page.click('[data-testid="template-avaliação-inicial"]');

      // Campos devem ser preenchidos
      const subjectiveValue = await page.inputValue('[data-testid="evolution-subjective"]');
      expect(subjectiveValue).not.toBe('');
    });

    test('deve salvar como template', async () => {
      const evolutionId = await createEvolution(page, patientId);

      await goToEvolutionDetails(page, evolutionId);
      await page.click('[data-testid="save-as-template-button"]');

      await page.fill('[data-testid="template-name"]', 'Template de Teste');
      await page.click('[data-testid="save-template-button"]');

      await expectToast(page, 'Template salvo com sucesso');
    });
  });

  test.describe('Relatórios e Exportação', () => {
    test('deve gerar relatório de evoluções', async () => {
      await goToEvolutions(page, patientId);
      await createEvolution(page, patientId);

      await page.click('[data-testid="generate-report-button"]');

      // Configurar período
      await page.fill('[data-testid="report-start-date"]', '2026-02-01');
      await page.fill('[data-testid="report-end-date"]', '2026-02-28');

      await page.click('[data-testid="generate-pdf-button"]');

      await expectToast(page, 'Relatório gerado com sucesso');
    });

    test('deve exportar PDF', async () => {
      const evolutionId = await createEvolution(page, patientId);

      await goToEvolutionDetails(page, evolutionId);
      await page.click('[data-testid="export-pdf-button"]');

      // Verificar download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="confirm-export-button"]');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/evolucao.*\.pdf/);
    });
  });

  test.describe('Busca e Filtros', () => {
    test('deve filtrar por período', async () => {
      await createEvolution(page, patientId, { ...TEST_EVOLUTION, date: '2026-02-10' });
      await createEvolution(page, patientId, { ...TEST_EVOLUTION, date: '2026-02-20' });

      await goToEvolutions(page, patientId);

      // Filtrar por período
      await page.click('[data-testid="filter-button"]');
      await page.fill('[data-testid="filter-start-date"]', '2026-02-15');
      await page.fill('[data-testid="filter-end-date"]', '2026-02-25');
      await page.click('[data-testid="apply-filter-button"]');

      // Apenas evoluções dentro do período devem aparecer
      const evolutionCards = page.locator('[data-testid="evolution-card"]');
      const count = await evolutionCards.count();

      expect(count).toBe(1);
    });

    test('deve buscar por conteúdo', async () => {
      await createEvolution(page, patientId, {
        ...TEST_EVOLUTION,
        subjective: 'Paciente relata melhora significativa.',
      });

      await goToEvolutions(page, patientId);

      await page.fill('[data-testid="search-evolutions"]', 'melhora');

      const evolutionCard = page.locator('[data-testid="evolution-card"]');
      await expect(evolutionCard).toBeVisible();
    });
  });

  test.describe('Integração com Agenda', () => {
    test('deve criar agendamento a partir da evolução', async () => {
      const evolutionId = await createEvolution(page, patientId);

      await goToEvolutionDetails(page, evolutionId);
      await page.click('[data-testid="create-appointment-button"]');

      // Preencher dados do agendamento
      await page.fill('[data-testid="appointment-date"]', '2026-03-01');
      await page.fill('[data-testid="appointment-time"]', '10:00');

      await page.click('[data-testid="save-appointment-button"]');

      await expectToast(page, 'Agendamento criado com sucesso');
    });
  });

  test.describe('Acessibilidade', () => {
    test('deve ter labels ARIA nos campos', async () => {
      await goToEvolutions(page, patientId);
      await page.click('[data-testid="add-evolution-button"]');

      const subjectiveInput = page.locator('[data-testid="evolution-subjective"]');
      await expect(subjectiveInput).toHaveAttribute('aria-label');
    });
  });
});
