import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';
import { getSharedBearer } from './helpers/neon-auth';
import { ensureScheduleSettingsReady } from './helpers/schedule-settings';

type CapacityConfigRow = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

const DAY_OPTIONS = [
  { key: 'monday', label: 'Segunda', value: 1 },
  { key: 'tuesday', label: 'Terça', value: 2 },
  { key: 'wednesday', label: 'Quarta', value: 3 },
  { key: 'thursday', label: 'Quinta', value: 4 },
  { key: 'friday', label: 'Sexta', value: 5 },
] as const;

const TIME_WINDOWS = [
  { start: '05:00', end: '05:30' },
  { start: '05:30', end: '06:00' },
  { start: '21:00', end: '21:30' },
  { start: '21:30', end: '22:00' },
  { start: '22:00', end: '22:30' },
  { start: '22:30', end: '23:00' },
] as const;

const LOGIN_EMAIL = process.env.E2E_LOGIN_EMAIL || testUsers.admin.email;
const LOGIN_PASSWORD = process.env.E2E_LOGIN_PASSWORD || testUsers.admin.password;
const WORKERS_API_URL = (process.env.VITE_WORKERS_API_URL || 'https://fisioflow-api.rafalegollas.workers.dev').replace(/\/$/, '');

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);

  return aStart < bEnd && bStart < aEnd;
}

async function fetchCapacityConfigs(): Promise<CapacityConfigRow[]> {
  const bearer = await getSharedBearer(LOGIN_EMAIL, LOGIN_PASSWORD);
  const response = await fetch(`${WORKERS_API_URL}/api/scheduling/capacity-config`, {
    headers: {
      Authorization: bearer,
      'Content-Type': 'application/json',
    },
  });

  const payload = await response.json().catch(() => ({}));
  return Array.isArray(payload?.data) ? payload.data : [];
}

async function deleteCapacityConfigs(ids: string[]) {
  const bearer = await getSharedBearer(LOGIN_EMAIL, LOGIN_PASSWORD);
  const results = [];

  for (const id of ids) {
    const response = await fetch(`${WORKERS_API_URL}/api/scheduling/capacity-config/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: bearer,
        'Content-Type': 'application/json',
      },
    });

    results.push({
      id,
      status: response.status,
      body: await response.text().catch(() => ''),
    });
  }

  return results;
}

async function setControlledInputValue(locator: import('@playwright/test').Locator, value: string) {
  await locator.evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(input, nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

function findAvailableSlot(configs: CapacityConfigRow[]) {
  for (const day of DAY_OPTIONS) {
    const configsForDay = configs.filter((config) => Number(config.day_of_week) === day.value);
    for (const window of TIME_WINDOWS) {
      const hasConflict = configsForDay.some((config) =>
        overlaps(config.start_time, config.end_time, window.start, window.end),
      );

      if (!hasConflict) {
        return {
          dayKey: day.key,
          dayValue: day.value,
          start: window.start,
          end: window.end,
        };
      }
    }
  }

  throw new Error('Não encontrei uma janela livre para validar a criação de capacidade.');
}

test.describe('Configurações da Agenda - Capacidade', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await ensureScheduleSettingsReady(page);
  });

  test('deve salvar configuração de capacidade sem erro de permissão', async ({ page }, testInfo) => {
    testInfo.setTimeout(60000);
    const capacityResponses: string[] = [];

    page.on('response', (response) => {
      if (!response.url().includes('/api/scheduling/capacity-config')) {
        return;
      }

      if (response.status() >= 400) {
        capacityResponses.push(`${response.request().method()} ${response.status()} ${response.url()}`);
      }
    });

    const existingConfigs = await fetchCapacityConfigs();
    const existingIds = new Set(existingConfigs.map((config) => config.id));
    const slot = findAvailableSlot(existingConfigs);
    let createdIds: string[] = [];

    const capacityTab = page.getByRole('tab', { name: /Capacidade/i });
    await capacityTab.waitFor({ state: 'visible', timeout: 15000 });
    await capacityTab.click();
    await expect(page.getByText('Capacidade da Agenda')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Adicionar Configuração/i }).click();
    await expect(page.locator(`#day-${slot.dayKey}`)).toBeVisible({ timeout: 10000 });
    await page.locator(`#day-${slot.dayKey}`).click();

    const timeInputs = page.locator('input[type="time"]');
    await setControlledInputValue(timeInputs.nth(0), slot.start);
    await setControlledInputValue(timeInputs.nth(1), slot.end);

    const submitButton = page.getByRole('button', { name: /Adicionar Configuração/i }).last();
    await expect(submitButton).toBeEnabled({ timeout: 10000 });

    try {
      const [createResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes('/api/scheduling/capacity-config') &&
            response.request().method() === 'POST',
          { timeout: 30000 },
        ),
        submitButton.click(),
      ]);
      expect(createResponse.status()).toBeLessThan(400);

      const createPayload = await createResponse.json().catch(() => ({}));
      createdIds = Array.isArray(createPayload?.data)
        ? createPayload.data.map((item: CapacityConfigRow) => item.id).filter(Boolean)
        : [];

      if (createdIds.length === 0) {
        const refreshedConfigs = await fetchCapacityConfigs();
        createdIds = refreshedConfigs
          .filter((config) =>
            !existingIds.has(config.id) &&
            Number(config.day_of_week) === slot.dayValue &&
            config.start_time === slot.start &&
            config.end_time === slot.end,
          )
          .map((config) => config.id);
      }

      await expect(page.getByRole('button', { name: /Configuração adicionada!/i })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/Erro ao salvar|Missing or insufficient permissions|permission/i)).toHaveCount(0);
      expect(capacityResponses).toEqual([]);
      expect(createdIds.length).toBeGreaterThan(0);
    } finally {
      if (createdIds.length > 0) {
        const cleanupResults = await deleteCapacityConfigs(createdIds);
        expect(cleanupResults.every((result) => result.status < 400)).toBe(true);
      }
    }
  });
});
