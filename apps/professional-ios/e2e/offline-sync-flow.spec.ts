/**
 * Testes E2E para Fluxo de Sincronização Offline
 *
 * Testa o funcionamento da aplicação em modo offline e a sincronização
 * de dados ao reconectar, incluindo:
 * - Detecção de estado offline
 * - Operações offline (CRUD)
 * - Sincronização automática ao reconectar
 * - Resolução de conflitos
 * - Indicadores de sincronização
 * - Fila de operações pendentes
 */

import { test, expect, Page } from '@playwright/test';
import { login, TEST_CREDENTIALS } from './fixtures/auth';
import { createPatient, TEST_PATIENT } from './fixtures/patients';
import {
  navigateTo,
  goToPatients,
  expectToast,
  waitForScreenLoad,
} from './helpers/navigation';

/**
 * Simula modo offline
 */
async function setOfflineMode(page: Page): Promise<void> {
  await page.context().setOffline(true);

  // Aguardar indicador de offline
  await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
}

/**
 * Simula modo online
 */
async function setOnlineMode(page: Page): Promise<void> {
  await page.context().setOffline(false);

  // Aguardar indicador de online
  await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
}

/**
 * Obtém status de sincronização
 */
async function getSyncStatus(page: Page): Promise<{
  pendingOperations: number;
  lastSyncTime: string | null;
  isSyncing: boolean;
}> {
  return page.evaluate(() => {
    const element = document.querySelector('[data-testid="sync-status"]');
    if (!element) {
      return { pendingOperations: 0, lastSyncTime: null, isSyncing: false };
    }
    return JSON.parse(element.getAttribute('data-status') || '{}');
  });
}

/**
 * Aguarda sincronização completar
 */
async function waitForSync(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="sync-complete"]', { timeout: 30000 });
}

test.describe('Fluxo de Sincronização Offline', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await login(page, TEST_CREDENTIALS.professional);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Detecção de Estado Offline', () => {
    test('deve detectar quando está offline', async () => {
      await setOfflineMode(page);

      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-indicator"]')).toContainText('Você está offline');
    });

    test('deve detectar quando volta online', async () => {
      await setOfflineMode(page);
      await setOnlineMode(page);

      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });

    test('deve mostrar banner de modo offline', async () => {
      await setOfflineMode(page);

      const offlineBanner = page.locator('[data-testid="offline-banner"]');
      await expect(offlineBanner).toBeVisible();
      await expect(offlineBanner).toContainText('Modo offline ativado');
    });
  });

  test.describe('Operações Offline - Pacientes', () => {
    test('deve criar paciente offline', async () => {
      await setOfflineMode(page);
      await goToPatients(page);

      // Criar paciente
      const patientName = `Paciente Offline ${Date.now()}`;
      const patientId = await createPatient(page, {
        ...TEST_PATIENT,
        name: patientName,
      });

      await expectToast(page, 'Paciente salvo localmente');

      // Paciente deve aparecer na lista
      await expect(page.locator(`[data-testid="patient-card"][data-name="${patientName}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="patient-card"][data-sync-status="pending"]`)).toBeVisible();
    });

    test('deve editar paciente offline', async () => {
      await goToPatients(page);
      const patientId = await createPatient(page, TEST_PATIENT);

      await setOfflineMode(page);

      // Editar paciente
      await page.click(`[data-testid="patient-card-${patientId}"]`);
      await page.click('[data-testid="edit-patient-button"]');

      const newName = `${TEST_PATIENT.name} (Editado Offline)`;
      await page.fill('[data-testid="patient-name"]', newName);
      await page.click('[data-testid="save-patient-button"]');

      await expectToast(page, 'Paciente atualizado localmente');
    });

    test('deve deletar paciente offline', async () => {
      await goToPatients(page);
      const patientId = await createPatient(page, TEST_PATIENT);

      await setOfflineMode(page);

      await page.click(`[data-testid="patient-card-${patientId}"]`);
      await page.click('[data-testid="delete-patient-button"]');
      await page.click('[data-testid="confirm-delete-button"]');

      await expectToast(page, 'Paciente marcado para exclusão');

      // Deve mostrar indicador de exclusão pendente
      await expect(page.locator(`[data-testid="patient-card-${patientId}"][data-deletion-pending="true"]`)).toBeVisible();
    });
  });

  test.describe('Sincronização Automática', () => {
    test('deve sincronizar automaticamente ao voltar online', async () => {
      await setOfflineMode(page);
      await goToPatients(page);

      // Criar paciente offline
      const patientName = `Paciente Sync ${Date.now()}`;
      await createPatient(page, { ...TEST_PATIENT, name: patientName });

      const syncStatus = await getSyncStatus(page);
      expect(syncStatus.pendingOperations).toBeGreaterThan(0);

      // Voltar online
      await setOnlineMode(page);

      // Aguardar sincronização
      await waitForSync(page);

      // Verificar que operações foram sincronizadas
      const newStatus = await getSyncStatus(page);
      expect(newStatus.pendingOperations).toBe(0);
      expect(newStatus.isSyncing).toBe(false);

      await expect(page.locator(`[data-testid="patient-card"][data-sync-status="synced"]`)).toBeVisible();
    });

    test('deve mostrar indicador de sincronização em andamento', async () => {
      await setOfflineMode(page);
      await goToPatients(page);

      // Criar múltiplos pacientes offline
      for (let i = 0; i < 5; i++) {
        await createPatient(page, {
          ...TEST_PATIENT,
          name: `Paciente ${i} Offline`,
        });
      }

      // Voltar online
      await setOnlineMode(page);

      // Verificar indicador de sincronização
      await expect(page.locator('[data-testid="syncing-indicator"]')).toBeVisible();
    });
  });

  test.describe('Resolução de Conflitos', () => {
    test('deve detectar conflito de sincronização', async () => {
      // Criar paciente online
      await goToPatients(page);
      const patientId = await createPatient(page, TEST_PATIENT);

      // Simular edição no servidor
      // (Em um cenário real, isso seria feito via API ou manipulação direta do backend)

      await setOfflineMode(page);

      // Editar mesmo paciente offline
      await page.click(`[data-testid="patient-card-${patientId}"]`);
      await page.click('[data-testid="edit-patient-button"]');

      await page.fill('[data-testid="patient-name"]', 'Nome Editado Offline');
      await page.click('[data-testid="save-patient-button"]');

      // Voltar online
      await setOnlineMode(page);

      // Deve detectar conflito
      await expect(page.locator('[data-testid="conflict-detected"]')).toBeVisible();
    });

    test('deve permitir resolução manual de conflitos', async () => {
      await setOfflineMode(page);
      await goToPatients(page);
      const patientId = await createPatient(page, TEST_PATIENT);

      // Editar offline
      await page.click(`[data-testid="patient-card-${patientId}"]`);
      await page.click('[data-testid="edit-patient-button"]');
      await page.fill('[data-testid="patient-name"]', 'Versão Offline');
      await page.click('[data-testid="save-patient-button"]');

      // Voltar online e resolver conflito
      await setOnlineMode(page);

      // Abrir modal de conflito
      await page.click('[data-testid="resolve-conflict-button"]');

      // Escolher versão (offline neste caso)
      await page.click('[data-testid="choose-offline-version"]');

      await expectToast(page, 'Conflito resolvido');
    });

    test('deve usar última versão por padrão', async () => {
      // Testar estratégia de "last write wins"
      await setOfflineMode(page);
      await goToPatients(page);
      const patientId = await createPatient(page, TEST_PATIENT);

      // Editar offline
      await page.click(`[data-testid="patient-card-${patientId}"]`);
      await page.click('[data-testid="edit-patient-button"]');
      await page.fill('[data-testid="patient-name"]', 'Versão Mais Recente');
      await page.click('[data-testid="save-patient-button"]');

      await setOnlineMode(page);

      // Sincronizar automaticamente com última versão
      await waitForSync(page);

      const patientName = await page.textContent(`[data-testid="patient-card-${patientId}"] [data-testid="patient-name"]`);
      expect(patientName).toContain('Mais Recente');
    });
  });

  test.describe('Fila de Operações Pendentes', () => {
    test('deve mostrar fila de operações pendentes', async () => {
      await setOfflineMode(page);
      await goToPatients(page);

      // Criar operações
      await createPatient(page, { ...TEST_PATIENT, name: 'Paciente 1' });
      await createPatient(page, { ...TEST_PATIENT, name: 'Paciente 2' });
      await createPatient(page, { ...TEST_PATIENT, name: 'Paciente 3' });

      // Abrir painel de operações
      await page.click('[data-testid="pending-operations-button"]');

      await expect(page.locator('[data-testid="operations-queue"]')).toBeVisible();

      const operationItems = page.locator('[data-testid="operation-item"]');
      const count = await operationItems.count();

      expect(count).toBe(3);
    });

    test('deve permitir cancelar operação pendente', async () => {
      await setOfflineMode(page);
      await goToPatients(page);

      await createPatient(page, { ...TEST_PATIENT, name: 'Paciente Cancelado' });

      // Abrir fila
      await page.click('[data-testid="pending-operations-button"]');

      // Cancelar primeira operação
      await page.click('[data-testid="cancel-operation-button"]');

      await expectToast(page, 'Operação cancelada');
    });

    test('deve mostrar status de cada operação', async () => {
      await setOfflineMode(page);
      await goToPatients(page);

      await createPatient(page, { ...TEST_PATIENT, name: 'Paciente Teste' });

      await page.click('[data-testid="pending-operations-button"]');

      const operationItem = page.locator('[data-testid="operation-item"]').first();

      await expect(operationItem.locator('[data-testid="operation-type"]')).toBeVisible();
      await expect(operationItem.locator('[data-testid="operation-timestamp"]')).toBeVisible();
    });
  });

  test.describe('Indicadores de Sincronização', () => {
    test('deve mostrar hora da última sincronização', async () => {
      await goToPatients(page);

      const lastSync = await page.textContent('[data-testid="last-sync-time"]');
      expect(lastSync).not.toBe('');
    });

    test('deve atualizar hora após sincronização', async () => {
      await setOfflineMode(page);
      await goToPatients(page);
      await createPatient(page, TEST_PATIENT);

      const syncBefore = await page.textContent('[data-testid="last-sync-time"]');

      await setOnlineMode(page);
      await waitForSync(page);

      const syncAfter = await page.textContent('[data-testid="last-sync-time"]');

      expect(syncAfter).not.toBe(syncBefore);
    });

    test('deve mostrar contagem de operações pendentes', async () => {
      await setOfflineMode(page);
      await goToPatients(page);

      await createPatient(page, TEST_PATIENT);
      await createPatient(page, { ...TEST_PATIENT, name: 'Outro' });

      const pendingCount = await page.textContent('[data-testid="pending-operations-count"]');
      expect(pendingCount).toContain('2');
    });
  });

  test.describe('Sincronização Manual', () => {
    test('deve permitir sincronização manual', async () => {
      await setOfflineMode(page);
      await goToPatients(page);
      await createPatient(page, TEST_PATIENT);

      await setOnlineMode(page);

      // Clicar no botão de sincronizar manual
      await page.click('[data-testid="manual-sync-button"]');

      await expect(page.locator('[data-testid="syncing-indicator"]')).toBeVisible();

      await waitForSync(page);

      await expectToast(page, 'Sincronização concluída');
    });

    test('deve mostrar progresso da sincronização', async () => {
      await setOfflineMode(page);
      await goToPatients(page);

      // Criar várias operações
      for (let i = 0; i < 10; i++) {
        await createPatient(page, { ...TEST_PATIENT, name: `Paciente ${i}` });
      }

      await setOnlineMode(page);
      await page.click('[data-testid="manual-sync-button"]');

      // Verificar barra de progresso
      await expect(page.locator('[data-testid="sync-progress-bar"]')).toBeVisible();
    });
  });

  test.describe('Cache Offline', () => {
    test('deve carregar dados do cache quando offline', async () => {
      // Carregar dados online
      await goToPatients(page);
      await createPatient(page, TEST_PATIENT);

      // Ir offline
      await setOfflineMode(page);

      // Recarregar página
      await page.reload();

      // Dados devem estar disponíveis do cache
      await expect(page.locator('[data-testid="patient-card"]')).toBeVisible();
    });

    test('deve mostrar aviso de dados desatualizados', async () => {
      await goToPatients(page);
      await createPatient(page, TEST_PATIENT);

      // Simular dados antigos
      await page.evaluate(() => {
        localStorage.setItem('cache-last-sync', String(Date.now() - 24 * 60 * 60 * 1000));
      });

      await setOfflineMode(page);

      await expect(page.locator('[data-testid="stale-data-warning"]')).toBeVisible();
    });
  });

  test.describe('Persistência de Dados', () => {
    test('deve manter dados offline entre sessões', async () => {
      await setOfflineMode(page);
      await goToPatients(page);

      const patientName = `Paciente Persistente ${Date.now()}`;
      await createPatient(page, { ...TEST_PATIENT, name: patientName });

      // Fechar e reabrir
      await page.close();

      const newPage = await page.context().newPage();
      await login(newPage, TEST_CREDENTIALS.professional);
      await setOfflineMode(newPage);
      await goToPatients(newPage);

      await expect(newPage.locator(`[data-testid="patient-card"][data-name="${patientName}"]`)).toBeVisible();
    });
  });

  test.describe('Acessibilidade em Modo Offline', () => {
    test('deve anunciar estado offline para leitores de tela', async () => {
      await setOfflineMode(page);

      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      await expect(offlineIndicator).toHaveAttribute('role', 'status');
      await expect(offlineIndicator).toHaveAttribute('aria-live', 'polite');
    });
  });
});
