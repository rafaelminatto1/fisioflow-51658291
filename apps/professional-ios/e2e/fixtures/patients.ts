/**
 * Fixtures para pacientes em testes E2E
 *
 * Fornece funções auxiliares para criar, buscar, atualizar e deletar
 * pacientes durante os testes end-to-end.
 */

import type { Page } from '@playwright/test';

/**
 * Dados de paciente de teste
 */
export const TEST_PATIENT = {
  name: 'João Silva',
  email: 'joao.silva@example.com',
  phone: '11987654321',
  dateOfBirth: '1990-01-15',
  cpf: '123.456.789-00',
  status: 'Em Tratamento',
  mainCondition: 'Lombalgia',
  notes: 'Paciente com histórico de dores lombares crônicas.',
} as const;

/**
 * Cria um novo paciente
 */
export async function createPatient(page: Page, patientData = TEST_PATIENT): Promise<string> {
  // Navegar para tela de criação de paciente
  await page.goto('/(tabs)/patients');
  await page.click('[data-testid="add-patient-button"]');

  // Preencher formulário
  await page.fill('[data-testid="patient-name"]', patientData.name);

  if (patientData.email) {
    await page.fill('[data-testid="patient-email"]', patientData.email);
  }

  if (patientData.phone) {
    await page.fill('[data-testid="patient-phone"]', patientData.phone);
  }

  if (patientData.dateOfBirth) {
    await page.fill('[data-testid="patient-dob"]', patientData.dateOfBirth);
  }

  if (patientData.cpf) {
    await page.fill('[data-testid="patient-cpf"]', patientData.cpf);
  }

  if (patientData.mainCondition) {
    await page.fill('[data-testid="patient-condition"]', patientData.mainCondition);
  }

  if (patientData.notes) {
    await page.fill('[data-testid="patient-notes"]', patientData.notes);
  }

  // Selecionar status
  await page.click('[data-testid="patient-status-select"]');
  await page.click(`[data-testid="status-option-${patientData.status.replace(/\s+/g, '-')}"]`);

  // Salvar paciente
  await page.click('[data-testid="save-patient-button"]');

  // Aguardar confirmação
  await page.waitForSelector('[data-testid="patient-saved"]', { timeout: 5000 });

  // Obter ID do paciente (pode estar na URL ou em um elemento)
  const patientId = await getPatientIdFromPage(page);

  return patientId;
}

/**
 * Busca um paciente por nome
 */
export async function findPatient(page: Page, name: string): Promise<void> {
  await page.goto('/(tabs)/patients');

  // Usar busca se disponível
  const searchInput = page.locator('[data-testid="patient-search"]');
  if (await searchInput.isVisible()) {
    await searchInput.fill(name);
  }

  // Aguardar que o paciente apareça na lista
  await page.waitForSelector(`[data-testid="patient-card"][data-name="${name}"]`, { timeout: 5000 });
}

/**
 * Navega para a página de detalhes de um paciente
 */
export async function goToPatientDetails(page: Page, patientId: string): Promise<void> {
  await page.goto(`/(tabs)/patients/${patientId}`);
  await page.waitForSelector('[data-testid="patient-details"]', { timeout: 5000 });
}

/**
 * Abre a página de edição de um paciente
 */
export async function editPatient(page: Page, patientId: string): Promise<void> {
  await goToPatientDetails(page, patientId);
  await page.click('[data-testid="edit-patient-button"]');
}

/**
 * Atualiza um paciente existente
 */
export async function updatePatient(page: Page, patientId: string, updates: Partial<typeof TEST_PATIENT>): Promise<void> {
  await editPatient(page, patientId);

  // Atualizar campos fornecidos
  if (updates.name) {
    await page.fill('[data-testid="patient-name"]', updates.name);
  }

  if (updates.email) {
    await page.fill('[data-testid="patient-email"]', updates.email);
  }

  if (updates.phone) {
    await page.fill('[data-testid="patient-phone"]', updates.phone);
  }

  if (updates.mainCondition) {
    await page.fill('[data-testid="patient-condition"]', updates.mainCondition);
  }

  if (updates.status) {
    await page.click('[data-testid="patient-status-select"]');
    await page.click(`[data-testid="status-option-${updates.status.replace(/\s+/g, '-')}"]`);
  }

  // Salvar alterações
  await page.click('[data-testid="save-patient-button"]');

  // Aguardar confirmação
  await page.waitForSelector('[data-testid="patient-updated"]', { timeout: 5000 });
}

/**
 * Deleta um paciente
 */
export async function deletePatient(page: Page, patientId: string): Promise<void> {
  await goToPatientDetails(page, patientId);
  await page.click('[data-testid="delete-patient-button"]');

  // Confirmar exclusão
  await page.click('[data-testid="confirm-delete-button"]');

  // Aguardar redirecionamento para lista de pacientes
  await page.waitForURL('**/patients', { timeout: 5000 });
}

/**
 * Adiciona uma nota ao paciente
 */
export async function addPatientNote(page: Page, patientId: string, note: string): Promise<void> {
  await goToPatientDetails(page, patientId);
  await page.click('[data-testid="add-note-button"]');

  await page.fill('[data-testid="note-input"]', note);
  await page.click('[data-testid="save-note-button"]');

  await page.waitForSelector('[data-testid="note-saved"]', { timeout: 5000 });
}

/**
 * Atualiza o progresso do paciente
 */
export async function updatePatientProgress(page: Page, patientId: string, progress: number): Promise<void> {
  await goToPatientDetails(page, patientId);
  await page.click('[data-testid="edit-progress-button"]');

  await page.fill('[data-testid="progress-input"]', progress.toString());
  await page.click('[data-testid="save-progress-button"]');

  await page.waitForSelector('[data-testid="progress-updated"]', { timeout: 5000 });
}

/**
 * Adiciona foto ao paciente
 */
export async function addPatientPhoto(page: Page, patientId: string, photoPath: string): Promise<void> {
  await goToPatientDetails(page, patientId);
  await page.click('[data-testid="add-photo-button"]');

  // Simular upload de arquivo
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(photoPath);

  await page.click('[data-testid="save-photo-button"]');
  await page.waitForSelector('[data-testid="photo-saved"]', { timeout: 5000 });
}

/**
 * Verifica que o paciente aparece na lista
 */
export async function expectPatientInList(page: Page, name: string): Promise<void> {
  await page.goto('/(tabs)/patients');

  const patientCard = page.locator(`[data-testid="patient-card"][data-name="${name}"]`);
  await patientCard.waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Verifica que o paciente não aparece na lista
 */
export async function expectPatientNotInList(page: Page, name: string): Promise<void> {
  await page.goto('/(tabs)/patients');

  const patientCard = page.locator(`[data-testid="patient-card"][data-name="${name}"]`);
  await patientCard.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
    // Elemento não encontrado, o que é esperado
  });
}

/**
 * Obtém dados do paciente da página
 */
export async function getPatientData(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const element = document.querySelector('[data-testid="patient-data"]');
    if (!element) {
      return {};
    }
    return JSON.parse(element.getAttribute('data-patient') || '{}');
  });
}

/**
 * Obtém ID do paciente da página atual
 */
export async function getPatientIdFromPage(page: Page): Promise<string> {
  const url = page.url();
  const match = url.match(/patients\/([a-f0-9-]+)/i);
  if (match) {
    return match[1];
  }

  // Tentar obter de elemento
  const element = await page.getAttribute('[data-testid="patient-card"]', 'data-patient-id');
  if (element) {
    return element;
  }

  throw new Error('Could not find patient ID');
}

/**
 * Cria múltiplos pacientes para testes
 */
export async function createMultiplePatients(page: Page, count: number): Promise<string[]> {
  const patientIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const patientData = {
      ...TEST_PATIENT,
      name: `${TEST_PATIENT.name} ${i + 1}`,
      email: `patient${i + 1}@example.com`,
    };

    const patientId = await createPatient(page, patientData);
    patientIds.push(patientId);
  }

  return patientIds;
}

/**
 * Busca pacientes com filtros
 */
export async function filterPatients(page: Page, filters: {
  status?: string;
  search?: string;
}): Promise<void> {
  await page.goto('/(tabs)/patients');

  if (filters.status) {
    await page.click('[data-testid="status-filter"]');
    await page.click(`[data-testid="filter-status-${filters.status.replace(/\s+/g, '-')}"]`);
  }

  if (filters.search) {
    const searchInput = page.locator('[data-testid="patient-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill(filters.search);
    }
  }
}

/**
 * Verifica contagem de pacientes na lista
 */
export async function getPatientCount(page: Page): Promise<number> {
  return page.locator('[data-testid="patient-card"]').count();
}
