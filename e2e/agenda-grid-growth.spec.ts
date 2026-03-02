/**
 * Teste de regressão: grid da agenda não deve crescer após o carregamento.
 *
 * Bug original: slots ficavam maiores após businessHours carregar do Firestore,
 * porque o ResizeObserver recalculava fitSlotHeight com (container maior / slots menores).
 *
 * Fix: após medição inicial, ResizeObserver só atualiza containerHeight, não fitSlotHeight.
 */

import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

test.describe('Agenda - Estabilidade do tamanho dos slots', () => {
  test('slots da semana não devem crescer após o carregamento dos dados', async ({ page }) => {
    test.setTimeout(60000);

    // Login
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#login-email', { timeout: 15000 });
    await page.fill('#login-email', testUsers.rafael.email);
    await page.fill('#login-password', testUsers.rafael.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/^(?!.*\/auth).*$/, { timeout: 30000 });

    // Navegar para agenda semanal
    await page.goto('/?view=week&date=2026-03-02', { waitUntil: 'domcontentloaded' });

    // Aguardar o grid ficar visível — tenta aria-busy=false ou simplesmente o drop-zone existir
    await page.waitForFunction(
      () => {
        const grid = document.querySelector('[data-calendar-drop-zone]');
        if (!grid) return false;
        // Se o container tiver aria-busy, aguardar ele terminar
        const container = grid.closest('[aria-busy]');
        if (container) return container.getAttribute('aria-busy') === 'false';
        // Sem aria-busy, verifica se o grid tem slots renderizados
        return grid.querySelectorAll('.grid').length > 0;
      },
      { timeout: 25000 }
    );

    // Medir altura inicial de um slot
    const getSlotHeight = () =>
      page.evaluate(() => {
        const slots = document.querySelectorAll<HTMLElement>('[data-calendar-drop-zone] .grid');
        if (slots.length === 0) return null;
        return slots[0].getBoundingClientRect().height;
      });

    const heightT0 = await getSlotHeight();
    expect(heightT0, 'Nenhum slot encontrado após o grid ficar visível').not.toBeNull();

    // Aguardar 5 segundos para businessHours + outros dados assíncronos carregarem
    await page.waitForTimeout(5000);

    const heightT5 = await getSlotHeight();
    expect(heightT5, 'Nenhum slot encontrado após 5 segundos').not.toBeNull();

    // Também medir após mais 3 segundos
    await page.waitForTimeout(3000);
    const heightT8 = await getSlotHeight();

    console.log(`Altura dos slots: T0=${heightT0}px | T5=${heightT5}px | T8=${heightT8}px`);

    // O slot height não deve crescer mais de 2px (tolerância para sub-pixel rendering)
    const tolerance = 2;
    expect(
      heightT5!,
      `Slot cresceu de ${heightT0}px para ${heightT5}px entre T0 e T5s`
    ).toBeLessThanOrEqual(heightT0! + tolerance);

    expect(
      heightT8!,
      `Slot cresceu de ${heightT0}px para ${heightT8}px entre T0 e T8s`
    ).toBeLessThanOrEqual(heightT0! + tolerance);
  });
});
