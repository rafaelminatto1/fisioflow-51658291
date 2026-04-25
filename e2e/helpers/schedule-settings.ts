import { expect, type Page } from "@playwright/test";
import { testUsers } from "../fixtures/test-data";
import { authenticateBrowserContext } from "./neon-auth";

const LOGIN_EMAIL = process.env.E2E_LOGIN_EMAIL || testUsers.admin.email;
const LOGIN_PASSWORD = process.env.E2E_LOGIN_PASSWORD || testUsers.admin.password;

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await page.waitForTimeout(attempt * 1000);
      }
    }
  }

  throw lastError;
}

async function dismissWelcomeDialogIfPresent(page: Page) {
  const welcomeDialog = page
    .locator('[role="dialog"]')
    .filter({ has: page.getByText(/Bem-vindo ao FisioFlow/i) })
    .first();

  if (!(await welcomeDialog.isVisible({ timeout: 2000 }).catch(() => false))) {
    return;
  }

  const closeButton = welcomeDialog.getByRole("button", { name: /Close|Fechar/i }).first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click({ force: true });
  } else {
    await page.keyboard.press("Escape").catch(() => {});
  }
}

export async function ensureScheduleSettingsReady(page: Page): Promise<void> {
  await authenticateBrowserContext(page.context(), LOGIN_EMAIL, LOGIN_PASSWORD);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await gotoWithRetry(page, "/agenda/settings");
    if (!page.url().includes("/auth")) {
      break;
    }

    await authenticateBrowserContext(page.context(), LOGIN_EMAIL, LOGIN_PASSWORD);
  }

  await expect(page).toHaveURL(/\/agenda\/settings/, { timeout: 45000 });
  await dismissWelcomeDialogIfPresent(page);
  await expect(page.getByRole("heading", { name: /Configurações da Agenda/i })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText("Carregando configurações...")).toHaveCount(0, { timeout: 30000 });
  await expect(page.getByRole("tab", { name: /^Capacidade$/i })).toBeVisible({ timeout: 15000 });
}
