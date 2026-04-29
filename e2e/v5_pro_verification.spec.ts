import { expect, test } from "@playwright/test";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER_ID = "user-e2e-v5pro";

test.describe("V5 Pro Feature Verification", () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock do Neon Auth Session (Better Auth)
    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            user: {
              id: TEST_USER_ID,
              email: "admin@moocafisio.com.br",
              name: "Fisio Pro",
              role: "admin",
              organization_id: TEST_ORG_ID,
            },
            session: {
              id: "session-e2e",
              userId: TEST_USER_ID,
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
            }
          }
        }),
      });
    });

    // 2. Mock do Organization Bootstrap
    await page.route(`**/api/organizations/${TEST_ORG_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: TEST_ORG_ID,
            name: "Clínica V5 Pro",
            active: true,
          },
        }),
      });
    });

    // 3. Mock do Perfil (me)
    await page.route("**/api/system/profiles/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: TEST_USER_ID,
            user_id: TEST_USER_ID,
            full_name: "Fisio Pro",
            role: "admin",
            organization_id: TEST_ORG_ID,
          },
        }),
      });
    });

    // 4. Mock de Pacientes (lista mínima)
    await page.route("**/api/patients?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "patient-1",
              full_name: "Paciente Teste V5",
              status: "active",
            }
          ],
        }),
      });
    });
  });

  test("deve abrir o AI Scribe via Alt+S no editor unificado", async ({ page }) => {
    // Navegar para a página de pacientes
    await page.goto("http://localhost:5173/pacientes");
    await page.waitForLoadState("networkidle");

    // Verificar se o paciente está visível
    await expect(page.locator("text=Paciente Teste V5")).toBeVisible();

    // Abrir o prontuário (simulado)
    // No FisioFlow, clicar no paciente geralmente navega para /pacientes/:id
    await page.click("text=Paciente Teste V5");

    // Simular que estamos na página de evolução
    // O atalho Alt+S é global, mas o editor V5 Pro deve estar montado
    await page.waitForTimeout(2000);

    // Pressionar Alt+S
    await page.keyboard.press("Alt+S");

    // Verificar se o modal do AI Scribe apareceu
    // O modal deve conter o texto "AI Scribe" ou algo similar
    const scribeModal = page.locator("text=AI Scribe, text=Transcrição Inteligente");
    await expect(scribeModal).toBeVisible({ timeout: 5000 });

    console.log("[Success] AI Scribe modal is visible via Alt+S");
    await page.screenshot({ path: "screenshots/v5-pro-ai-scribe.png" });
  });

  test("deve exibir o botão de sincronização na Wiki e permitir interação", async ({ page }) => {
    // Navegar para a Wiki
    await page.goto("http://localhost:5173/wiki");
    await page.waitForLoadState("networkidle");

    // Verificar se o botão de sincronização está presente
    const syncButton = page.locator("button:has-text(\"Sincronizar\"), button:has-text(\"Sync\")");
    await expect(syncButton).toBeVisible();

    // Clicar no botão
    await syncButton.click();

    // Verificar se há algum feedback de "Sincronizando..."
    await expect(page.locator("text=Sincronizando, text=Processando")).toBeVisible();

    console.log("[Success] Wiki synchronization triggered successfully");
    await page.screenshot({ path: "screenshots/v5-pro-wiki-sync.png" });
  });
});
