/**
 * Helper para desabilitar Ably nos testes E2E (evita erro 410 Gone no console)
 * Chame no início de cada teste que navega para páginas com realtime
 */

import type { Page } from '@playwright/test';

export async function disableAblyForTest(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as { __E2E__?: boolean }).__E2E__ = true;
  });
}
