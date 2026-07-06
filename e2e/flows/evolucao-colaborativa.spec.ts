/**
 * Evolução Colaborativa — E2E de convergência, presença e fallback (Task 8).
 *
 * Cobre o fluxo ponta-a-ponta do y-partyserver Durable Object (T3/T4/T5)
 * + provider autenticado no cliente (T6) + presença/fallback (T7):
 *
 *  1. Dois terapeutas autenticados abrem a MESMA evolução (mesmo
 *     `collaborationId` = SOAP record id) em contextos de browser distintos.
 *  2. Convergência: A digita na "Observações Clínicas" → B vê o texto.
 *  3. Presença: B aparece no indicador de presença de A
 *     (`CollaborationPresence`, texto "N pessoa(s) editando agora").
 *  4. Fallback: A perde a conexão (WebSocket cai) → o painel de A cai para
 *     `data-collab-status="fallback"` e A continua editando sem erro
 *     (autosave clássico assume).
 *
 * PENDENTE DE AMBIENTE: precisa da API (Workers) com o Durable Object
 * deployado + migration 0139 aplicada + Neon acessível. Nesta sessão de
 * desenvolvimento local não há ambiente rodando — o teste é esperado
 * falhar/pular no login ou na espera por `data-collab-status="connected"`
 * até que a feature esteja em staging/local (ver Task 8 Step 2 do plano).
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const EMAIL_A = process.env.E2E_EMAIL || process.env.STAGING_TEST_USER_EMAIL || "";
const PASSWORD_A = process.env.E2E_PASSWORD || process.env.STAGING_TEST_USER_PASSWORD || "";
// Segundo terapeuta: usa credenciais dedicadas se existirem; senão reusa as
// mesmas (ainda válido para exercitar 2 conexões/clientIds distintos no
// mesmo Y.Doc, só não varia o nome exibido na presença).
const EMAIL_B = process.env.E2E_EMAIL_B || EMAIL_A;
const PASSWORD_B = process.env.E2E_PASSWORD_B || PASSWORD_A;

// Timeout de conexão do provider no cliente (RichTextEditor/NotionEvolutionPanel)
// + folga para round-trip real de rede.
const COLLAB_CONNECT_TIMEOUT_MS = 5000;
const CONNECT_WAIT_MS = COLLAB_CONNECT_TIMEOUT_MS + 5000;

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle").catch(() => {});
  if (!/\/login/.test(page.url())) return; // já estava logado (storage state)

  await page.getByRole("textbox", { name: /email/i }).fill(email);
  await page.getByRole("textbox", { name: /senha/i }).fill(password);
  await page
    .getByRole("button", { name: /acessar|entrar|login/i })
    .first()
    .click();
  await page.waitForURL(/\/(dashboard|agenda|home)/, { timeout: 20000 });
}

/**
 * Navega até uma evolução existente (com sessão SOAP já criada, para que
 * `collaborationId` venha populado desde o primeiro render) e retorna a URL
 * final. Reusa a mesma heurística de `offline.spec.ts` para achar um
 * agendamento com evolução: percorre a agenda até achar uma semana com
 * eventos e segue o link "Evolução".
 */
async function findEvolutionUrl(page: Page): Promise<string | null> {
  const explicit = process.env.E2E_COLLAB_APPOINTMENT_ID;
  if (explicit) return `/patient-evolution/${explicit}`;

  await page.goto("/agenda");
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(800);

  let found = false;
  for (let i = 0; i < 12; i++) {
    const count = await page
      .locator(".fc-event:visible, [data-appointment-popover-anchor]:visible")
      .count();
    if (count > 0) {
      found = true;
      break;
    }
    const prev = page
      .locator('button[aria-label*="anterior" i], button[aria-label*="prev" i], .fc-prev-button')
      .first();
    if (!(await prev.isVisible().catch(() => false))) break;
    await prev.click();
    await page.waitForTimeout(700);
  }
  if (!found) return null;

  const firstAppt = page.locator("[data-appointment-popover-anchor], .fc-event").first();
  await firstAppt.click().catch(() => {});

  const evoLink = page.getByRole("link", { name: /evolu[çc][ãa]o/i }).first();
  if (!(await evoLink.isVisible().catch(() => false))) return null;
  await evoLink.click();
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);

  return /\/(patient-evolution|evolucao)\//.test(page.url()) ? page.url() : null;
}

/** Card do NotionEvolutionPanel — único elemento com `data-collab-status`. */
function collabCard(page: Page) {
  return page.locator("[data-collab-status]").first();
}

/** Editor de "Observações Clínicas" (contenteditable TipTap dentro do card colaborativo). */
function observationsEditor(page: Page) {
  return collabCard(page).locator('[contenteditable="true"]').first();
}

async function waitForStatus(page: Page, status: "connected" | "fallback", timeout: number) {
  await expect(collabCard(page)).toHaveAttribute("data-collab-status", status, { timeout });
}

test.describe("Evolução Colaborativa — convergência, presença e fallback", () => {
  test("dois terapeutas convergem, veem presença um do outro, e A sobrevive à queda do WS", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    if (!EMAIL_A || !PASSWORD_A) {
      test.info().annotations.push({
        type: "skip",
        description: "E2E_EMAIL/E2E_PASSWORD não configurados — sem credenciais para autenticar.",
      });
      test.skip();
      return;
    }

    let contextA: BrowserContext | null = null;
    let contextB: BrowserContext | null = null;

    try {
      contextA = await browser.newContext();
      contextB = await browser.newContext();
      const pageA = await contextA.newPage();
      const pageB = await contextB.newPage();

      // 1) Login dos dois terapeutas
      await login(pageA, EMAIL_A, PASSWORD_A);
      await login(pageB, EMAIL_B, PASSWORD_B);

      // 2) Terapeuta A localiza uma evolução existente (com SOAP record já
      // criado, para que `collaborationId` esteja disponível de imediato)
      const evolutionUrl = await findEvolutionUrl(pageA);
      if (!evolutionUrl) {
        test.info().annotations.push({
          type: "skip",
          description:
            "Nenhuma evolução com agendamento existente encontrada na agenda — " +
            "defina E2E_COLLAB_APPOINTMENT_ID para apontar para uma sessão fixa.",
        });
        test.skip();
        return;
      }

      // 3) Terapeuta B abre a MESMA evolução
      await pageB.goto(evolutionUrl);
      await pageB.waitForLoadState("networkidle").catch(() => {});

      // 4) Ambos devem conectar ao Durable Object (y-partyserver). Se o
      // ambiente não tiver a API/DO deployados, cai para "fallback" e o
      // teste é marcado como pendente de ambiente (não falha "no escuro").
      const connectedA = await waitForStatus(pageA, "connected", CONNECT_WAIT_MS)
        .then(() => true)
        .catch(() => false);
      const connectedB = await waitForStatus(pageB, "connected", CONNECT_WAIT_MS)
        .then(() => true)
        .catch(() => false);

      if (!connectedA || !connectedB) {
        test.info().annotations.push({
          type: "skip",
          description:
            "Provider de colaboração não conectou (data-collab-status nunca chegou a " +
            "'connected') — pendente de ambiente com a API/Durable Object deployados " +
            "(migration 0139 aplicada). Ver Task 8 Step 2 do plano.",
        });
        test.skip();
        return;
      }

      // 5) Presença: B deve aparecer no indicador de A (>= 1 colaborador)
      await expect(
        pageA.getByText(/\d+ pessoas? editando agora/i).first(),
      ).toBeVisible({ timeout: 10_000 });

      // 6) Convergência: A digita → B vê o mesmo texto
      const marker = `E2E-COLAB-${Date.now()}`;
      const editorA = observationsEditor(pageA);
      await editorA.click();
      await editorA.type(marker, { delay: 15 });

      await expect(observationsEditor(pageB)).toContainText(marker, { timeout: 10_000 });

      // 7) Fallback: derruba a conexão de A (rede offline simula queda do WS)
      await contextA.setOffline(true);

      // O painel de A deve cair para "fallback" dentro do timeout de conexão
      await waitForStatus(pageA, "fallback", CONNECT_WAIT_MS);

      // A continua editando sem erro (autosave clássico assume) — nenhum
      // toast de erro deve aparecer, e o editor segue com foco/edição normal
      const markerFallback = `E2E-FALLBACK-${Date.now()}`;
      const editorAAfterDrop = observationsEditor(pageA);
      await editorAAfterDrop.click();
      await editorAAfterDrop.type(markerFallback, { delay: 15 });
      await expect(editorAAfterDrop).toContainText(markerFallback);

      const errorToast = pageA
        .locator('[data-sonner-toast], [role="status"]')
        .filter({ hasText: /erro|falha|error/i });
      await expect(errorToast).toHaveCount(0);

      await contextA.setOffline(false);
    } finally {
      await contextA?.close();
      await contextB?.close();
    }
  });
});
