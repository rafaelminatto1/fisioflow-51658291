import { expect, test, type Locator, type Page } from '@playwright/test';

const APPOINTMENT_ID = 'e2e-appointment-optimistic-1';
const PATIENT_ID = 'e2e-patient-optimistic-1';
const APPOINTMENT_DATE = '2026-03-12';
const ORIGINAL_TIME = '09:00';
const TARGET_TIME = '09:30';
const APPOINTMENT_DURATION = 60;
const PATIENT_NAME = 'Paciente Teste E2E';
const TEST_ORIGIN = new URL(process.env.BASE_URL || 'http://localhost:4173').origin;

type AppointmentRow = {
  id: string;
  patient_id: string;
  patient_name: string;
  therapist_id: string;
  therapist_name: string;
  organization_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  duration_minutes: number;
  status: string;
  type: string;
  created_at: string;
  updated_at: string;
  notes?: string | null;
};

function addMinutes(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(2026, 2, 12, hours, minutes, 0, 0);
  date.setMinutes(date.getMinutes() + minutesToAdd);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function createJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: 'e2e-user-optimistic',
    email: 'e2e@fisioflow.test',
  })).toString('base64url');
  return `${header}.${payload}.signature`;
}

function buildAppointment(time: string): AppointmentRow {
  const now = new Date().toISOString();
  return {
    id: APPOINTMENT_ID,
    patient_id: PATIENT_ID,
    patient_name: PATIENT_NAME,
    therapist_id: 'e2e-therapist-1',
    therapist_name: 'Dr. Teste Atualizado',
    organization_id: '00000000-0000-0000-0000-000000000001',
    date: APPOINTMENT_DATE,
    start_time: time,
    end_time: addMinutes(time, APPOINTMENT_DURATION),
    duration: APPOINTMENT_DURATION,
    duration_minutes: APPOINTMENT_DURATION,
    status: 'agendado',
    type: 'Fisioterapia',
    created_at: now,
    updated_at: now,
    notes: null,
  };
}

async function waitForVisibleSchedule(page: Page) {
  await expect(page.locator('[data-testid="main-layout"]').first()).toBeVisible({ timeout: 30000 });
}

async function dragAppointment(page: Page, source: Locator, target: Locator) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Nao foi possivel medir o card ou o slot para o drag-and-drop.');
  }

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2 + 12, { steps: 8 });
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 24 });
  await page.mouse.up();
}

async function confirmVisibleRescheduleDialog(page: Page) {
  const dialog = page.locator('[role="alertdialog"]:visible').filter({ hasText: 'Confirmar Reagendamento' }).last();
  await expect(dialog).toBeVisible({ timeout: 10000 });

  const confirmButton = dialog
    .locator('button:visible')
    .filter({ hasText: /Confirmar Reagendamento|Confirmar/i })
    .last();

  await confirmButton.click({ timeout: 10000 });
}

async function openAgendaUntilAppointmentIsVisible(page: Page, appointmentId: string, date: string): Promise<Locator> {
  const sourceCard = page.locator(`[data-appointment-popover-anchor="${appointmentId}"]:visible`).first();
  const agendaUrl = `/agenda?view=week&date=${date}&e2e=agenda-optimistic&t=${Date.now()}`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto(agendaUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });

    await waitForVisibleSchedule(page);
    await page.waitForResponse(
      (response) =>
        response.url().includes('/api/appointments?') &&
        response.request().method() === 'GET' &&
        response.status() === 200,
      { timeout: 15000 },
    ).catch(() => null);

    if (await sourceCard.isVisible({ timeout: 12000 }).catch(() => false)) {
      return sourceCard;
    }
  }

  return sourceCard;
}

async function installAgendaOptimisticMocks(page: Page) {
  const jwt = createJwt();
  const staleAppointment = buildAppointment(ORIGINAL_TIME);
  const updatedAppointment = buildAppointment(TARGET_TIME);
  const updatedPayloads: Array<Record<string, unknown>> = [];
  let appointmentsListCalls = 0;
  const corsHeaders = {
    'access-control-allow-origin': TEST_ORIGIN,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'Authorization, Content-Type',
    vary: 'Origin',
  };

  await page.route('**/neondb/auth/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method().toUpperCase();

    if (method === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...corsHeaders,
          'access-control-expose-headers': 'set-auth-jwt',
        },
        body: '',
      });
      return;
    }

    if (url.includes('/get-session')) {
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders,
          'content-type': 'application/json',
          'access-control-expose-headers': 'set-auth-jwt',
          'set-auth-jwt': jwt,
        },
        body: JSON.stringify({
          user: {
            id: 'e2e-user-optimistic',
            email: 'e2e@fisioflow.test',
            name: 'Dr. Teste Atualizado',
            role: 'admin',
            organization_id: '00000000-0000-0000-0000-000000000001',
          },
          session: {
            token: jwt,
          },
        }),
      });
      return;
    }

    if (url.includes('/sign-out')) {
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders,
          'content-type': 'application/json',
        },
        body: '{}',
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json',
      },
      body: '{}',
    });
  });

  await page.route('**/api/appointments/last-updated*', async (route) => {
    if (route.request().method().toUpperCase() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders, body: '' });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          updated_at: new Date().toISOString(),
        },
      }),
    });
  });

  await page.route('**/api/appointments?**', async (route) => {
    if (route.request().method().toUpperCase() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders, body: '' });
      return;
    }

    appointmentsListCalls += 1;
    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        data: [staleAppointment],
      }),
    });
  });

  await page.route(`**/api/appointments/${APPOINTMENT_ID}`, async (route) => {
    const method = route.request().method().toUpperCase();

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders, body: '' });
      return;
    }

    if (method === 'PUT') {
      const body = route.request().postDataJSON() as Record<string, unknown> | null;
      updatedPayloads.push(body || {});
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          data: updatedAppointment,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        data: staleAppointment,
      }),
    });
  });

  await page.route('**/api/scheduling/capacity-config**', async (route) => {
    if (route.request().method().toUpperCase() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders, body: '' });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/scheduling/settings/business-hours**', async (route) => {
    if (route.request().method().toUpperCase() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders, body: '' });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route('**/api/scheduling/settings/blocked-times**', async (route) => {
    if (route.request().method().toUpperCase() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders, body: '' });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ data: [] }),
    });
  });

  const fulfillEmptyCollection = async (route: Parameters<Parameters<Page['route']>[1]>[0]) => {
    if (route.request().method().toUpperCase() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders, body: '' });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ data: [] }),
    });
  };

  await page.route('**/api/notifications**', fulfillEmptyCollection);
  await page.route('**/api/organization-members**', fulfillEmptyCollection);
  await page.route('**/api/audit-logs**', fulfillEmptyCollection);

  return {
    updatedPayloads,
    getAppointmentsListCalls: () => appointmentsListCalls,
  };
}

test.describe('Agenda - Reagendamento otimista', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.setTimeout(90000);

  test('move o card imediatamente apos o sucesso do reagendamento mesmo com a lista ainda stale', async ({ page }, testInfo) => {
    const mocks = await installAgendaOptimisticMocks(page);

    const sourceCard = await openAgendaUntilAppointmentIsVisible(page, APPOINTMENT_ID, APPOINTMENT_DATE);
    await expect(sourceCard).toBeVisible({ timeout: 30000 });
    await sourceCard.scrollIntoViewIfNeeded();

    const targetSlot = page.locator(`[data-testid="time-slot-${APPOINTMENT_DATE}-${TARGET_TIME}"]:visible`).first();
    await expect(targetSlot).toBeVisible({ timeout: 30000 });
    await targetSlot.scrollIntoViewIfNeeded();

    const originalBox = await sourceCard.boundingBox();
    expect(originalBox, 'Nao foi possivel medir a posicao original do card.').not.toBeNull();

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/appointments/${APPOINTMENT_ID}`) &&
        response.request().method() === 'PUT' &&
        response.status() === 200,
      { timeout: 15000 },
    );

    await dragAppointment(page, sourceCard, targetSlot);
    await confirmVisibleRescheduleDialog(page);

    const updateResponse = await updateResponsePromise;
    const updateBody = await updateResponse.json();
    const returnedAppointment = updateBody?.data as AppointmentRow | undefined;

    await expect(
      page.getByText(`Atendimento de ${PATIENT_NAME}`, { exact: false }),
    ).toBeVisible({ timeout: 10000 });

    await expect.poll(async () => {
      const currentBox = await sourceCard.boundingBox();
      if (!originalBox || !currentBox) return false;
      return Math.abs(currentBox.y - originalBox.y) > 8 || Math.abs(currentBox.x - originalBox.x) > 8;
    }, {
      timeout: 10000,
    }).toBe(true);

    const movedBox = await sourceCard.boundingBox();
    expect(movedBox, 'Nao foi possivel medir a posicao do card apos o reagendamento.').not.toBeNull();

    const movedImmediately = !!originalBox && !!movedBox &&
      (Math.abs(movedBox.y - originalBox.y) > 8 || Math.abs(movedBox.x - originalBox.x) > 8);

    expect(returnedAppointment?.start_time || returnedAppointment?.duration_minutes).toBeTruthy();
    expect(returnedAppointment?.start_time).toBe(TARGET_TIME);
    expect(movedImmediately, 'O card nao mudou de posicao imediatamente apos o sucesso do reagendamento.').toBe(true);
    expect(mocks.getAppointmentsListCalls()).toBeGreaterThan(0);
    expect(mocks.updatedPayloads).toHaveLength(1);
    expect(String(mocks.updatedPayloads[0]?.start_time || mocks.updatedPayloads[0]?.appointment_time || '')).toContain(TARGET_TIME);

    await testInfo.attach('agenda-optimistic-reschedule-summary', {
      body: JSON.stringify({
        appointmentId: APPOINTMENT_ID,
        date: APPOINTMENT_DATE,
        originalTime: ORIGINAL_TIME,
        targetTime: TARGET_TIME,
        listCalls: mocks.getAppointmentsListCalls(),
        updatePayload: mocks.updatedPayloads[0] ?? null,
        movedImmediately,
      }, null, 2),
      contentType: 'application/json',
    });
  });
});
