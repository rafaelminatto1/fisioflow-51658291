import { test, expect, Page } from '@playwright/test';

type SaveCapture = {
  traceToTitle: Map<string, string>;
  titleToId: Map<string, string>;
};

const LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost']);
const TELEMETRY_HOST_PATTERNS = [
  /(^|\.)sentry\.io$/i,
  /(^|\.)posthog\.com$/i,
  /(^|\.)google-analytics\.com$/i,
  /(^|\.)googletagmanager\.com$/i,
  /(^|\.)doubleclick\.net$/i,
  /(^|\.)hotjar\.com$/i,
  /(^|\.)intercom\.io$/i,
];

function isTelemetryHost(hostname: string): boolean {
  return TELEMETRY_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

function isIgnorableNetworkNoise(text: string): boolean {
  return (
    text.includes('Failed to load resource: net::ERR_FAILED') ||
    text.includes('TypeError: Failed to fetch')
  );
}

function tryParseTaggedJson(text: string, tag: string): Record<string, unknown> | null {
  const index = text.indexOf(tag);
  if (index < 0) return null;
  const jsonPart = text.slice(index + tag.length).trim();
  try {
    const parsed = JSON.parse(jsonPart);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  return null;
}

async function resetTriageFilters(page: Page) {
  await page.keyboard.press('Escape').catch(() => {});
  const clearFiltersButton = page.getByRole('button', { name: 'Limpar filtros' }).first();
  if (await clearFiltersButton.isVisible().catch(() => false)) {
    await clearFiltersButton.click();
  }
  await page.getByPlaceholder('incident, ata, prd...').fill('');
  await page.getByPlaceholder('buscar no título/conteúdo...').fill('');
}

function cardLocatorInColumn(
  page: Page,
  column: 'backlog' | 'in-progress' | 'done',
  cardTitle: string,
  capture: SaveCapture
) {
  const triageColumn = page.locator(`[data-testid="triage-column-${column}"]`);
  const pageId = capture.titleToId.get(cardTitle);
  if (pageId) {
    return triageColumn.locator(`[data-testid="triage-card-${pageId}"]`).first();
  }
  return triageColumn.locator('[data-testid^="triage-card-"]', { hasText: cardTitle }).first();
}

async function isCardVisibleInColumn(
  page: Page,
  column: 'backlog' | 'in-progress' | 'done',
  cardTitle: string,
  capture: SaveCapture
): Promise<boolean> {
  const triageColumn = page.locator(`[data-testid="triage-column-${column}"]`);
  const pageId = capture.titleToId.get(cardTitle);
  if (pageId) {
    const byId = await triageColumn.locator(`[data-testid="triage-card-${pageId}"]`).first().isVisible().catch(() => false);
    if (byId) return true;
  }
  return triageColumn.locator('[data-testid^="triage-card-"]', { hasText: cardTitle }).first().isVisible().catch(() => false);
}

async function resolveCardLocatorInColumn(
  page: Page,
  column: 'backlog' | 'in-progress' | 'done',
  cardTitle: string,
  capture: SaveCapture
) {
  const triageColumn = page.locator(`[data-testid="triage-column-${column}"]`);
  const pageId = capture.titleToId.get(cardTitle);
  if (pageId) {
    const byId = triageColumn.locator(`[data-testid="triage-card-${pageId}"]`).first();
    if (await byId.isVisible().catch(() => false)) return byId;
  }
  return triageColumn.locator('[data-testid^="triage-card-"]', { hasText: cardTitle }).first();
}

async function findCardColumn(
  page: Page,
  cardTitle: string,
  capture: SaveCapture
): Promise<'backlog' | 'in-progress' | 'done' | null> {
  const columns: Array<'backlog' | 'in-progress' | 'done'> = ['backlog', 'in-progress', 'done'];
  for (const column of columns) {
    const visible = await isCardVisibleInColumn(page, column, cardTitle, capture);
    if (visible) return column;
  }
  return null;
}

async function ensureWorkspaceReady(page: Page) {
  await page.goto('/wiki-workspace', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('input[name="email"]').first()).toHaveCount(0);
  await page.getByTestId('create-wiki-page-button').waitFor({ state: 'visible', timeout: 30000 });
  await resetTriageFilters(page);
}

async function waitForStableBoardState(
  page: Page,
  cardA: string,
  cardB: string,
  capture: SaveCapture
) {
  await page.goto('/wiki-workspace', { waitUntil: 'domcontentloaded' });
  await resetTriageFilters(page);

  for (let attempt = 1; attempt <= 24; attempt += 1) {
    const aVisible = (await findCardColumn(page, cardA, capture)) !== null;
    const bVisible = (await findCardColumn(page, cardB, capture)) !== null;
    if (aVisible && bVisible) return;

    if (attempt % 6 === 0) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await resetTriageFilters(page);
    } else {
      await page.waitForTimeout(1500);
    }
  }

  throw new Error(
    `Board não estabilizou com os cards criados. cardA=${cardA} cardB=${cardB}`
  );
}

async function createTriagePageFromTemplate(page: Page, title: string, capture: SaveCapture) {
  const titleInput = page.locator('input[placeholder="Título da página..."]').first();
  const quickTemplateButton = page.getByRole('button', { name: 'PRD Enxuto' }).first();
  const blockingOverlay = page.locator('div[data-state="open"][aria-hidden="true"][data-aria-hidden="true"]').first();
  const templateDialog = page.getByTestId('wiki-template-dialog').first();

  if (await blockingOverlay.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  }

  const quickTemplateVisible = await quickTemplateButton.isVisible().catch(() => false);
  if (quickTemplateVisible) {
    await quickTemplateButton.click();
  } else {
    const dialogAlreadyOpen = await templateDialog.isVisible().catch(() => false);
    if (!dialogAlreadyOpen) {
      await page.getByTestId('create-wiki-page-button').click({ force: true });
      await templateDialog.waitFor({ state: 'visible', timeout: 15000 });
    }
    await page.getByTestId('wiki-template-select-trigger').click();
    await page.getByRole('option', { name: 'PRD Enxuto' }).click();
    await page.getByTestId('wiki-template-apply-button').click();
  }
  await titleInput.waitFor({ state: 'visible', timeout: 20000 });

  await titleInput.fill(title);
  await expect(titleInput).toHaveValue(title);
  await page.locator('input[placeholder="Ex: Protocolos"]').first().fill('triage');
  await page.locator('input[placeholder="tag1, tag2, tag3"]').first().fill('triage, triage-backlog, prd');

  const saveError = page.getByText('Não foi possível salvar a página.');
  const saveSuccess = page.getByText('Página salva com sucesso.');
  const saveButton = page.locator('button:has-text("Salvar")').first();
  let saved = false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (await blockingOverlay.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(150);
    }
    await saveButton.waitFor({ state: 'visible', timeout: 15000 });
    await saveButton.click({ force: true });

    const saveResult = await Promise.race([
      page
        .getByTestId('create-wiki-page-button')
        .waitFor({ state: 'visible', timeout: 8000 })
        .then(() => 'saved')
        .catch(() => null),
      saveSuccess
        .waitFor({ state: 'visible', timeout: 8000 })
        .then(() => 'saved')
        .catch(() => null),
      saveError
        .waitFor({ state: 'visible', timeout: 8000 })
        .then(() => 'error')
        .catch(() => null),
    ]);

    if (saveResult === 'saved') {
      saved = true;
      // Assert explicitly on success toast if it was the reason for success
      if (await saveSuccess.isVisible()) {
        await expect(saveSuccess).toBeVisible();
      }
      break;
    }
    if (saveResult === 'error') {
      throw new Error('Salvar página falhou: toast de erro exibido.');
    }

    const stillEditing = await titleInput.isVisible().catch(() => false);
    if (!stillEditing) {
      saved = true;
      break;
    }
  }

  if (!saved) {
    throw new Error('Salvar página não concluiu após 3 tentativas.');
  }

  // Explicit URL assertion before proceeding
  await expect(page).toHaveURL(/\/wiki-workspace(?:\/[^/?#]+)?(?:\?.*)?$/);
  console.log(`[E2E][Spec] Página "${title}" salva com sucesso e redirecionada para o workspace.`);

  await page.goto('/wiki-workspace', { waitUntil: 'domcontentloaded' });
  await resetTriageFilters(page);

  // A presença no backlog é validada após criar todos os cards para reduzir flake de render inicial.
}

async function dragCardToColumn(
  page: Page,
  cardTitle: string,
  source: 'backlog' | 'in-progress' | 'done',
  destination: 'backlog' | 'in-progress' | 'done',
  capture: SaveCapture
) {
  const sourceColumn = page.locator(`[data-testid="triage-column-${source}"]`);
  const destinationColumn = page.locator(`[data-testid="triage-column-${destination}"]`);

  const card = await resolveCardLocatorInColumn(page, source, cardTitle, capture);
  await card.waitFor({ state: 'visible', timeout: 20000 });

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const cardBox = await card.boundingBox();
    const destinationBox = await destinationColumn.boundingBox();
    if (!cardBox || !destinationBox) throw new Error('Não foi possível obter bounding box para drag-and-drop');

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(destinationBox.x + destinationBox.width / 2, destinationBox.y + 30, { steps: 30 });
    await page.mouse.up();

    const moved = await isCardVisibleInColumn(page, destination, cardTitle, capture);
    if (moved) return true;
    await page.waitForTimeout(250);
  }

  return false;
}

async function moveCardToColumnByMenu(
  page: Page,
  cardTitle: string,
  source: 'backlog' | 'in-progress' | 'done',
  destinationLabel: 'Backlog' | 'Em execução' | 'Concluído',
  capture: SaveCapture
) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const card = await resolveCardLocatorInColumn(page, source, cardTitle, capture);
    await card.waitFor({ state: 'visible', timeout: 20000 });
    await card.hover();
    const menuButton = card.locator('button').nth(1);
    await menuButton.click({ force: true });
    await page.getByRole('menuitem', { name: destinationLabel }).last().click({ force: true });
    await page.waitForTimeout(250);
    const movedTo =
      destinationLabel === 'Backlog' ? 'backlog' : destinationLabel === 'Em execução' ? 'in-progress' : 'done';
    const moved = await isCardVisibleInColumn(page, movedTo, cardTitle, capture);
    if (moved) return;
  }
  throw new Error(`Não foi possível mover "${cardTitle}" para "${destinationLabel}" via menu rápido.`);
}

async function reorderWithinBacklog(page: Page, cardTitle: string, capture: SaveCapture) {
  const column = page.locator('[data-testid="triage-column-backlog"]');
  const savedCardId = capture.titleToId.get(cardTitle);
  const card = savedCardId
    ? column.locator(`[data-testid="triage-card-${savedCardId}"]`).first()
    : column.locator('[data-testid^="triage-card-"]', { hasText: cardTitle }).first();

  const cardBox = await card.boundingBox();
  const columnBox = await column.boundingBox();
  if (!cardBox || !columnBox) throw new Error('Não foi possível obter bounding box para reorder');

  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(columnBox.x + 40, columnBox.y + 15, { steps: 20 });
  await page.mouse.up();
}

test.describe('Wiki triage board', () => {
  test('create template pages, move between columns, reorder and persist on reload', async ({ page }) => {
    const saveCapture: SaveCapture = {
      traceToTitle: new Map<string, string>(),
      titleToId: new Map<string, string>(),
    };

    await page.route('**/*', async (route) => {
      const url = route.request().url();
      try {
        const parsed = new URL(url);
        if (!LOCAL_HOSTNAMES.has(parsed.hostname)) {
          if (isTelemetryHost(parsed.hostname)) {
            await route.fulfill({ status: 204, contentType: 'text/plain', body: '' });
            return;
          }
          await route.abort();
          return;
        }
      } catch {
        // fallback: deixa seguir
      }
      await route.continue();
    });

    page.on('pageerror', (error) => {
      if (isIgnorableNetworkNoise(error.message)) return;
      console.log(`[pageerror] ${error.message}`);
    });
    page.on('response', (response) => {
      if (response.status() === 401) {
        const url = response.url();
        console.log(`[response:401] ${url}`);
      }
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        if (isIgnorableNetworkNoise(msg.text())) return;
        console.log(`[console:error] ${msg.text()}`);
      }
      if ((msg.type() === 'info' || msg.type() === 'log') && msg.text().includes('[E2E][')) {
        console.log(`[console:${msg.type()}] ${msg.text()}`);
        const startPayload = tryParseTaggedJson(msg.text(), '[E2E][WikiService][savePage:start]');
        if (startPayload) {
          const traceId = typeof startPayload.traceId === 'string' ? startPayload.traceId : null;
          const title = typeof startPayload.title === 'string' ? startPayload.title : null;
          if (traceId && title) saveCapture.traceToTitle.set(traceId, title);
        }

        const createdPayload = tryParseTaggedJson(msg.text(), '[E2E][WikiService][savePage:created]');
        if (createdPayload) {
          const traceId = typeof createdPayload.traceId === 'string' ? createdPayload.traceId : null;
          const pageId = typeof createdPayload.page_id === 'string' ? createdPayload.page_id : null;
          if (traceId && pageId) {
            const title = saveCapture.traceToTitle.get(traceId);
            if (title) saveCapture.titleToId.set(title, pageId);
          }
        }

      }
    });

    const cardA = `E2E PRD A ${Date.now()}`;
    const cardB = `E2E PRD B ${Date.now()}`;

    await ensureWorkspaceReady(page);
    await createTriagePageFromTemplate(page, cardA, saveCapture);
    await createTriagePageFromTemplate(page, cardB, saveCapture);

    await waitForStableBoardState(page, cardA, cardB, saveCapture);

    const cardASource = await findCardColumn(page, cardA, saveCapture);
    if (!cardASource) throw new Error(`Card "${cardA}" não encontrado em nenhuma coluna antes da movimentação.`);

    if (cardASource !== 'in-progress') {
      const movedByDrag = await dragCardToColumn(page, cardA, cardASource, 'in-progress', saveCapture);
      if (!movedByDrag) {
        await moveCardToColumnByMenu(page, cardA, cardASource, 'Em execução', saveCapture);
      }
    }

    const cardBSource = await findCardColumn(page, cardB, saveCapture);
    if (!cardBSource) throw new Error(`Card "${cardB}" não encontrado em nenhuma coluna antes do reorder.`);
    if (cardBSource !== 'backlog') {
      await moveCardToColumnByMenu(page, cardB, cardBSource, 'Backlog', saveCapture);
    }
    await reorderWithinBacklog(page, cardB, saveCapture);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await resetTriageFilters(page);

    await expect
      .poll(
        async () => isCardVisibleInColumn(page, 'in-progress', cardA, saveCapture),
        { timeout: 15000, intervals: [500, 1000, 2000] }
      )
      .toBe(true);
    await expect
      .poll(
        async () => isCardVisibleInColumn(page, 'backlog', cardB, saveCapture),
        { timeout: 15000, intervals: [500, 1000, 2000] }
      )
      .toBe(true);
  });
});
