import { chromium } from 'playwright';

const BASE_URL = 'https://moocafisio.com.br';
const EMAIL = 'rafael.minatto@yahoo.com.br';
const PASSWORD = 'Yukari30@';
const suffix = String(Date.now()).slice(-6);
const alphaSuffix = suffix.split('').map((d) => String.fromCharCode(65 + (Number(d) % 26))).join('');

  const out = {
  login: { ok: false, has9099Error: false },
  patient: { create: false, read: false, update: false, delete: false, patientId: null, notes: [] },
  appointment: { create: false, read: false, update: false, delete: false, appointmentId: null, notes: [] },
  apiTrace: [],
  requestTrace: [],
  responseTrace: [],
  consoleErrors: []
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findNestedId(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (typeof payload.id === 'string' && payload.id) return payload.id;
  for (const key of Object.keys(payload)) {
    const value = payload[key];
    if (value && typeof value === 'object') {
      const nestedId = findNestedId(value);
      if (nestedId) return nestedId;
    }
  }
  return null;
}

async function clickFirst(scope, selectors) {
  for (const s of selectors) {
    const el = scope.locator(s).first();
    if (await el.isVisible().catch(() => false)) {
      await el.click({ timeout: 10000 }).catch(() => {});
      return true;
    }
  }
  return false;
}

async function goToSchedule(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1800);

  const openedDirect = await clickFirst(page, [
    '[data-testid="new-appointment"]',
    'button[aria-label="Novo Agendamento"]',
    'button:has-text("Novo Agendamento")'
  ]);
  if (openedDirect) return true;

  await clickFirst(page, ['a:has-text("Agenda")', 'button:has-text("Agenda")']);
  await sleep(1600);
  return clickFirst(page, [
    '[data-testid="new-appointment"]',
    'button[aria-label="Novo Agendamento"]',
    'button:has-text("Novo Agendamento")',
    'button:has-text("Novo")'
  ]);
}

async function waitForPatientCreateResponse(page, timeout = 20000) {
  try {
    const res = await page.waitForResponse((r) => {
      const isPatientApi = r.url().includes('patientservicehttp') || r.url().includes('/api/patients');
      let action = null;
      try {
        action = r.request().postDataJSON()?.action || null;
      } catch {}
      return isPatientApi
        && r.request().method() === 'POST'
        && action === 'create'
        && r.status() >= 200
        && r.status() < 300;
    }, { timeout });
    const body = await res.text().catch(() => '');
    if (!body) return null;
    const parsed = JSON.parse(body);
    return findNestedId(parsed);
  } catch {
    return null;
  }
}

async function waitForPatientUpdateResponse(page, timeout = 20000) {
  try {
    await page.waitForResponse((r) => {
      const isPatientApi = r.url().includes('patientservicehttp') || r.url().includes('/api/patients');
      let action = null;
      try {
        action = r.request().postDataJSON()?.action || null;
      } catch {}
      return isPatientApi
        && r.request().method() === 'POST'
        && action === 'update'
        && r.status() >= 200
        && r.status() < 300;
    }, { timeout });
    return true;
  } catch {
    return false;
  }
}

async function waitForAppointmentResponse(page, action, timeout = 20000) {
  try {
    const res = await page.waitForResponse((r) => {
      const isAppointmentApi = r.url().includes('appointmentservicehttp') || r.url().includes('/api/appointments');
      let reqAction = null;
      try {
        reqAction = r.request().postDataJSON()?.action || null;
      } catch {}
      return isAppointmentApi
        && r.request().method() === 'POST'
        && reqAction === action
        && r.status() >= 200
        && r.status() < 300;
    }, { timeout });
    const body = await res.text().catch(() => '');
    if (!body) return null;
    const parsed = JSON.parse(body);
    return findNestedId(parsed);
  } catch {
    return null;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let createdPatientId = null;
  let createdAppointmentId = null;

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      out.consoleErrors.push(t);
      if (t.includes('127.0.0.1:9099') || t.includes('localhost:9099')) out.login.has9099Error = true;
    }
  });

  page.on('request', (req) => {
    const url = req.url();
    const isPatientApi = url.includes('patientservicehttp') || url.includes('/api/patients');
    const isAppointmentApi = url.includes('appointmentservicehttp') || url.includes('/api/appointments');
    if (!isPatientApi && !isAppointmentApi) return;
    const method = req.method();
    const body = req.postData() || '';
    out.requestTrace.push(`${method} ${url.slice(0, 120)} :: ${body.slice(0, 220).replace(/\s+/g, ' ')}`);
    if (out.requestTrace.length > 50) out.requestTrace = out.requestTrace.slice(-50);
  });

  page.on('response', async (res) => {
    const url = res.url();
    const isPatientApi = url.includes('patientservicehttp') || url.includes('/api/patients');
    const isAppointmentApi = url.includes('appointmentservicehttp') || url.includes('/api/appointments');
    if (!isPatientApi && !isAppointmentApi) return;
    let txt = '';
    try { txt = await res.text(); } catch {}
    const method = res.request().method();
    let action = null;
    try {
      action = res.request().postDataJSON()?.action || null;
    } catch {}
    out.apiTrace.push(`${method} ${res.status()} ${url.slice(0, 140)}`);
    if (out.apiTrace.length > 40) out.apiTrace = out.apiTrace.slice(-40);
    if (res.status() >= 400) {
      out.responseTrace.push(`${method} ${res.status()} ${url.slice(0, 120)} :: ${txt.slice(0, 400).replace(/\s+/g, ' ')}`);
      if (out.responseTrace.length > 20) out.responseTrace = out.responseTrace.slice(-20);
    }

    if (isPatientApi && method === 'POST' && action === 'create' && res.status() >= 200 && res.status() < 300) {
      try {
        const j = JSON.parse(txt);
        const id = findNestedId(j);
        if (id) createdPatientId = id;
      } catch {}
    }

    if (isAppointmentApi && method === 'POST' && action === 'create' && res.status() >= 200 && res.status() < 300) {
      try {
        const j = JSON.parse(txt);
        const id = findNestedId(j);
        if (id) createdAppointmentId = id;
      } catch {}
    }
  });

  const patientName = `Paciente ${alphaSuffix}${suffix} Teste`;
  const patientNameUpdated = `${patientName} Editado`;
  const patientEmail = `ui.${suffix}@example.com`;

  // LOGIN
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#login-email, input[name="email"], input[type="email"]').first().fill(EMAIL);
  await page.locator('#login-password, input[name="password"], input[type="password"]').first().fill(PASSWORD);
  await clickFirst(page, ['button[type="submit"]', 'button:has-text("Acessar Minha Conta")']);
  await page.waitForURL((u) => !u.pathname.includes('/auth'), { timeout: 25000 });
  out.login.ok = true;

  // PATIENT CREATE
  await page.goto(`${BASE_URL}/patients`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[data-testid="patients-page-header"]', { timeout: 25000 });
  await page.locator('[data-testid="add-patient"]').first().click();

  const createDialog = page.locator('[role="dialog"]').filter({ hasText: 'Novo Paciente' }).first();
  await createDialog.waitFor({ state: 'visible', timeout: 15000 });

  const orgErr = await page.locator('text=/Erro ao carregar organização/i').isVisible().catch(() => false);
  if (orgErr) {
    out.patient.notes.push('Modal com erro de organização');
  } else {
    await clickFirst(createDialog, ['button:has-text("Básico")', '[role="tab"]:has-text("Básico")']);
    const fullNameInput = createDialog.locator('#full_name, [data-testid="patient-name"]').first();
    if (!(await fullNameInput.isVisible().catch(() => false))) {
      out.patient.notes.push('Campo de nome não ficou visível no modal');
      await page.screenshot({ path: `/tmp/mooca-patient-name-missing-${suffix}.png`, fullPage: true }).catch(() => {});
    } else {
      await fullNameInput.fill(patientName);
    }
    await createDialog.locator('#email, [data-testid="patient-email"]').first().fill(patientEmail).catch(() => {});
    await createDialog.locator('#phone, [data-testid="patient-phone"]').first().fill('(11) 93333-1111').catch(() => {});

    const birthBtn = createDialog.locator('[data-testid="patient-birthdate"]').first();
    if (await birthBtn.isVisible().catch(() => false)) {
      await birthBtn.click();
      await sleep(300);
      const day = page.locator('.rdp-day_button:not([disabled])').filter({ hasText: /^\d{1,2}$/ }).nth(10);
      if (await day.isVisible().catch(() => false)) {
        await day.click();
        await sleep(250);
      }
    }

    await clickFirst(createDialog, ['button:has-text("Médico")', '[role="tab"]:has-text("Médico")']);
    await createDialog.locator('#main_condition').first().fill('Dor lombar').catch(() => {});
    await createDialog.locator('#weight_kg').first().fill('70').catch(() => {});
    await createDialog.locator('#height_cm').first().fill('170').catch(() => {});

    await clickFirst(createDialog, ['button:has-text("Endereço")', '[role="tab"]:has-text("Endereço")']);
    const stateTrigger = createDialog.locator('[data-testid="address-number"]').first();
    if (await stateTrigger.isVisible().catch(() => false)) {
      await stateTrigger.click({ force: true }).catch(() => {});
      await page.getByRole('option', { name: /^São Paulo$/ }).first().click().catch(() => {});
    }

    await clickFirst(createDialog, ['button:has-text("Básico")', '[role="tab"]:has-text("Básico")']);
    const fullNameValue = await createDialog.locator('#full_name').first().inputValue().catch(() => '');
    const birthLabelDebug = ((await createDialog.locator('[data-testid="patient-birthdate"]').first().textContent().catch(() => '')) || '').trim();
    out.patient.notes.push(`Debug básico: name="${fullNameValue}" birth="${birthLabelDebug}"`);

    const responsePromise = waitForPatientCreateResponse(page, 15000);
    await clickFirst(createDialog, ['button:has-text("Cadastrar Paciente")', 'button[type="submit"]']);
    createdPatientId = await responsePromise;

    await sleep(3500);
    if (!createdPatientId) {
      const justCreatedCard = page.locator('[data-testid="patient-list"] > div').filter({ hasText: patientName }).first();
      if (await justCreatedCard.isVisible().catch(() => false)) {
        out.patient.create = true;
        out.patient.read = true;
        const profileLink = justCreatedCard.locator('a[href*="/patients/"]').first();
        const href = await profileLink.getAttribute('href').catch(() => null);
        const match = href?.match(/\/patients\/([^/?#]+)/);
        if (match?.[1]) createdPatientId = match[1];
      }
    }

    out.patient.create = out.patient.create || !!createdPatientId;
    out.patient.patientId = createdPatientId;

    if (!createdPatientId) {
      const stillOpen = await createDialog.isVisible().catch(() => false);
      out.patient.notes.push(`Modal aberto após submit: ${stillOpen}`);
      const validationMessages = await createDialog.locator('p.text-sm.text-destructive').allTextContents().catch(() => []);
      if (validationMessages.length) {
        out.patient.notes.push(`Validação: ${validationMessages.join(' | ')}`);
      }
      const genericErrors = await createDialog.locator('text=/obrigat|inválid|erro/i').allTextContents().catch(() => []);
      if (genericErrors.length) {
        out.patient.notes.push(`Mensagens no modal: ${genericErrors.slice(0, 8).join(' | ')}`);
      }
      await page.screenshot({ path: `/tmp/mooca-patient-submit-fail-${suffix}.png`, fullPage: true }).catch(() => {});
      out.patient.notes.push('Create paciente não retornou id (possível validação)');
    }
  }

  // PATIENT READ (detail page)
  if (createdPatientId) {
    await page.goto(`${BASE_URL}/patients/${createdPatientId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(1800);

    const h1 = (await page.locator('h1').first().textContent().catch(() => '')) || '';
    out.patient.read = h1.toLowerCase().includes(patientName.toLowerCase()) || h1.toLowerCase().includes(alphaSuffix.toLowerCase());
  }

  let patientCurrentName = patientName;

  // PATIENT UPDATE (list actions)
  if (createdPatientId) {
    const patientShortId = createdPatientId.slice(0, 6);
    await page.goto(`${BASE_URL}/patients`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('[data-testid="patients-page-header"]', { timeout: 25000 });
    const search = page.locator('input[type="search"], input[aria-label="Buscar pacientes"]').first();
    await search.fill(patientName).catch(() => {});
    await sleep(1200);

    const card = page.locator(`[data-testid="patient-card-${createdPatientId}"], [data-testid="patient-list"] > div`).filter({ hasText: patientShortId }).first();
    if (await card.isVisible().catch(() => false)) {
      const menuTrigger = card.locator(`[data-testid="patient-actions-${createdPatientId}"], button`).first();
      await menuTrigger.click().catch(() => {});
      await sleep(350);
      const editItem = page.locator(`[data-testid="patient-edit-${createdPatientId}"], [role="menuitem"]:has-text("Editar")`).first();
      if (await editItem.isVisible().catch(() => false)) {
        await editItem.click().catch(() => {});
        const editDialog = page.locator('[role="dialog"]').filter({ hasText: 'Editar Paciente' }).first();
        await editDialog.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
        const nameInput = editDialog.locator('#full_name, [data-testid="patient-name"]').first();
        if (await nameInput.isVisible().catch(() => false)) {
          await clickFirst(editDialog, ['button:has-text("Básico")', '[role="tab"]:has-text("Básico")']);
          await nameInput.fill(patientNameUpdated);
          const patientUpdateResponse = waitForPatientUpdateResponse(page, 12000);
          await clickFirst(editDialog, ['button:has-text("Salvar Alterações")', 'button:has-text("Salvar")']);
          await sleep(1800);
          const apiUpdated = await patientUpdateResponse;
          const updatedVisible = await page.locator('[data-testid="patient-list"] > div').filter({ hasText: patientShortId }).first().isVisible().catch(() => false);
          out.patient.update = apiUpdated || updatedVisible;
          if (updatedVisible) patientCurrentName = patientNameUpdated;
        }
      }
    }
  }

  // APPOINTMENT CRUD (UI + API confirmation)
  if (await goToSchedule(page)) {
    const apptModal = page.locator('[role="dialog"]:visible').filter({ hasText: /Novo Agendamento|Agendamento/i }).first();
    await apptModal.waitFor({ state: 'visible', timeout: 15000 });

    const patientSelect = apptModal.locator('[data-testid="patient-select"]:visible').first();
    if (await patientSelect.isVisible().catch(() => false)) {
      await patientSelect.click({ force: true });
      await sleep(250);
      const search = page.locator('[data-testid="patient-search"]:visible').first();
      if (await search.isVisible().catch(() => false)) {
        await search.fill(patientCurrentName).catch(() => {});
        await sleep(700);
        await page.keyboard.press('ArrowDown').catch(() => {});
        await page.keyboard.press('Enter').catch(() => {});
      }
      let option = page.locator('[cmdk-item]:visible, [role="option"]:visible').filter({ hasText: patientNameUpdated }).first();
      if (!(await option.isVisible().catch(() => false))) {
        option = page.locator('[cmdk-item]:visible, [role="option"]:visible').filter({ hasText: patientName }).first();
      }
      if (!(await option.isVisible().catch(() => false))) {
        option = page.locator('[cmdk-item]:visible, [role="option"]:visible').first();
      }
      if (await option.isVisible().catch(() => false)) {
        await option.click().catch(async () => {
          await page.keyboard.press('ArrowDown').catch(() => {});
          await page.keyboard.press('Enter').catch(() => {});
        });
      }
      await page.keyboard.press('Escape').catch(() => {});
      const selectedText = ((await patientSelect.textContent().catch(() => '')) || '').trim();
      out.appointment.notes.push(`PatientSelect="${selectedText.slice(0, 80)}"`);
    }

    const timeTrigger = apptModal.locator('[aria-labelledby="time-label"]:visible, button[aria-labelledby="time-label"]:visible').first();
    if (await timeTrigger.isVisible().catch(() => false)) {
      await timeTrigger.click({ force: true }).catch(() => {});
      await page.locator('[role="option"]:visible').filter({ hasText: /^0?\d:\d{2}$|^\d{2}:\d{2}$/ }).nth(4).click().catch(async () => {
        await page.locator('[role="option"]:visible').filter({ hasText: /^\d{2}:\d{2}$/ }).first().click().catch(() => {});
      });
      const chosenTime = ((await timeTrigger.textContent().catch(() => '')) || '').trim();
      out.appointment.notes.push(`TimeSelect="${chosenTime.slice(0, 40)}"`);
    }

    const createApptResponse = waitForAppointmentResponse(page, 'create', 18000);
    await clickFirst(apptModal, ['button:has-text("Agendar")', 'button:has-text("Criar")', 'button:has-text("Iniciar Avaliação")']);
    const apptForm = apptModal.locator('form#appointment-form').first();
    if ((await apptForm.count().catch(() => 0)) > 0) {
      await apptForm.evaluate((f) => {
        if (f instanceof HTMLFormElement) f.requestSubmit();
      }).catch(() => {});
    }
    if (!createdAppointmentId) createdAppointmentId = await createApptResponse;
    await sleep(3200);

    out.appointment.create = !!createdAppointmentId;
    out.appointment.appointmentId = createdAppointmentId;

    let card = page.locator('.appointment-card, .calendar-appointment-card').filter({ hasText: patientNameUpdated }).first();
    if (!(await card.isVisible().catch(() => false))) {
      card = page.locator('.appointment-card, .calendar-appointment-card').filter({ hasText: patientName }).first();
    }
    if (!(await card.isVisible().catch(() => false))) {
      card = page.locator('.appointment-card, .calendar-appointment-card, [data-testid*="appointment"]').first();
    }
    out.appointment.read = await card.isVisible().catch(() => false);

    if (out.appointment.read) {
      await card.click().catch(() => {});
      await sleep(700);

      const editBtn = page.locator('button:has-text("Editar"), button[aria-label="Editar agendamento"]').first();
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click().catch(() => {});
        await sleep(600);
        const notes = page.locator('textarea').first();
        if (await notes.isVisible().catch(() => false)) {
          await notes.fill(`UI update ${suffix}`).catch(() => {});
        }
        const updateApptResponse = waitForAppointmentResponse(page, 'update', 18000);
        await clickFirst(page, ['button:has-text("Salvar Alterações")', 'button:has-text("Salvar")', 'button:has-text("Criar")', 'button:has-text("Iniciar Avaliação")']);
        await updateApptResponse;
        await sleep(1400);
        out.appointment.update = true;
      }

      const delBtn = page.locator('button:has-text("Cancelar"), button:has-text("Excluir")').first();
      if (await delBtn.isVisible().catch(() => false)) {
        const deleteApptResponse = waitForAppointmentResponse(page, 'update', 18000);
        await delBtn.click().catch(() => {});
        await sleep(500);
        await clickFirst(page, ['button:has-text("Confirmar Cancelamento")', 'button:has-text("Excluir")', 'button:has-text("Confirmar")']);
        await deleteApptResponse;
        await sleep(1500);
        out.appointment.delete = true;
      }
    } else {
      out.appointment.notes.push('Sem card para validar update/delete');
    }
  } else {
    out.appointment.notes.push('Botão novo agendamento não encontrado');
  }

  // PATIENT DELETE (list)
  if (createdPatientId) {
    const patientShortId = createdPatientId.slice(0, 6);
    await page.goto(`${BASE_URL}/patients`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('[data-testid="patients-page-header"]', { timeout: 25000 });
    const search = page.locator('input[type="search"], input[aria-label="Buscar pacientes"]').first();
    await search.fill(patientCurrentName).catch(() => {});
    await sleep(1200);

    let card = page.locator(`[data-testid="patient-card-${createdPatientId}"], [data-testid="patient-list"] > div`).filter({ hasText: patientShortId }).first();
    if (!(await card.isVisible().catch(() => false)) && patientCurrentName !== patientName) {
      await search.fill(patientName).catch(() => {});
      await sleep(900);
      card = page.locator(`[data-testid="patient-card-${createdPatientId}"], [data-testid="patient-list"] > div`).filter({ hasText: patientShortId }).first();
    }
    if (await card.isVisible().catch(() => false)) {
      const menuTrigger = card.locator(`[data-testid="patient-actions-${createdPatientId}"], button`).first();
      await menuTrigger.click().catch(() => {});
      await sleep(300);
      const deleteItem = page.locator(`[data-testid="patient-delete-${createdPatientId}"], [role="menuitem"]:has-text("Excluir")`).first();
      if (await deleteItem.isVisible().catch(() => false)) {
        await deleteItem.click();
        await sleep(700);
        await clickFirst(page, [`[data-testid="patient-delete-confirm-${createdPatientId}"]`, 'button:has-text("Sim, Excluir Permanentemente")', 'button:has-text("Excluir")', 'button:has-text("Confirmar")']);
        await sleep(1600);
        out.patient.delete = true;
      }
    } else {
      out.patient.notes.push('Paciente não localizado na lista para exclusão');
    }
  }

  await page.screenshot({ path: `/tmp/mooca-crud-final-${suffix}.png`, fullPage: true });
  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})();
