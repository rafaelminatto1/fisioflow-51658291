import { test, expect } from '@playwright/test';
import { testUsers } from './fixtures/test-data';

interface OverlapPair {
  dragIndex: number;
  keepIndex: number;
  baselineKeepWidth: number;
  bandTop: number;
  bandBottom: number;
  bandLeft: number;
  bandRight: number;
}

test.describe('Agenda - Estabilidade do Grid durante Drag', () => {
  test('não deve redimensionar card irmão enquanto arrasta em slot sobreposto', async ({ page }) => {
    test.setTimeout(120000);

    // 1) Login
    await page.goto('/auth');
    await page.fill('input[name="email"]', testUsers.rafael.email);
    await page.fill('input[name="password"]', testUsers.rafael.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname === '/' || u.pathname.startsWith('/schedule') || u.pathname.startsWith('/dashboard'), { timeout: 30000 });

    // 2) Abrir agenda semanal em data fixa para reduzir flakiness
    await page.goto('/?view=week&date=2026-02-03');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => document.querySelectorAll('.calendar-appointment-card').length >= 2, undefined, { timeout: 30000 });

    // 3) Forçar um cenário de sobreposição: arrastar card A para o slot do card B
    const sourceCard = page.locator('.calendar-appointment-card').first();
    const targetCard = page.locator('.calendar-appointment-card').nth(1);
    await sourceCard.dragTo(targetCard);

    const confirmModal = page.getByRole('heading', { name: 'Confirmar Reagendamento' });
    await expect(confirmModal).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Confirmar Reagendamento|Confirmar/ }).click();
    await expect(page.locator('text=/Reagendado.*sucesso|reagendado com sucesso/i').first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(400);

    // 4) Encontrar par de cards sobrepostos (mesma faixa vertical e lado a lado)
    const pair = await page.evaluate<OverlapPair | null>(() => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('.calendar-appointment-card'));
      const rects = cards.map((el, idx) => {
        const r = el.getBoundingClientRect();
        return {
          idx,
          left: r.left,
          right: r.right,
          top: r.top,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        };
      }).filter(r => r.width > 20 && r.height > 20);

      let best: {
        a: typeof rects[number];
        b: typeof rects[number];
        score: number;
      } | null = null;

      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i];
          const b = rects[j];

          const alignedTop = Math.abs(a.top - b.top) <= 3;
          const similarHeight = Math.abs(a.height - b.height) <= 8;
          const adjacent =
            Math.abs(a.right - b.left) <= 24 ||
            Math.abs(b.right - a.left) <= 24;

          if (!alignedTop || !similarHeight || !adjacent) continue;

          const score = (Math.max(a.right, b.right) - Math.min(a.left, b.left)) + Math.min(a.width, b.width);
          if (!best || score > best.score) {
            best = { a, b, score };
          }
        }
      }

      if (!best) return null;

      const rightIsA = best.a.left > best.b.left;
      const drag = rightIsA ? best.a : best.b;
      const keep = rightIsA ? best.b : best.a;

      return {
        dragIndex: drag.idx,
        keepIndex: keep.idx,
        baselineKeepWidth: keep.width,
        bandTop: Math.min(best.a.top, best.b.top) - 6,
        bandBottom: Math.max(best.a.bottom, best.b.bottom) + 6,
        bandLeft: Math.min(best.a.left, best.b.left) - 10,
        bandRight: Math.max(best.a.right, best.b.right) + 10,
      };
    });

    expect(pair, 'Não foi possível encontrar um par de cards sobrepostos para validar estabilidade.').not.toBeNull();
    if (!pair) return;

    // 5) Iniciar drag e medir largura dos cards na faixa de origem durante o drag
    const dragCard = page.locator('.calendar-appointment-card').nth(pair.dragIndex);
    const dragBox = await dragCard.boundingBox();
    expect(dragBox, 'Card para drag não encontrado no momento da medição.').not.toBeNull();
    if (!dragBox) return;

    const startX = dragBox.x + dragBox.width / 2;
    const startY = dragBox.y + dragBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 22, startY + 20, { steps: 5 }); // ativa drag
    await page.mouse.move(startX + 260, startY + 140, { steps: 12 }); // afasta da faixa original
    await page.waitForTimeout(180);

    const during = await page.evaluate((input: Omit<OverlapPair, 'dragIndex' | 'keepIndex'>) => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('.calendar-appointment-card'));
      const candidates = cards.map((el) => el.getBoundingClientRect()).filter((r) => {
        return (
          r.width > 0 &&
          r.height > 0 &&
          r.top >= input.bandTop &&
          r.bottom <= input.bandBottom &&
          r.left >= input.bandLeft &&
          r.right <= input.bandRight
        );
      });

      if (candidates.length === 0) {
        return null;
      }

      return {
        count: candidates.length,
        maxWidth: Math.max(...candidates.map((r) => r.width)),
      };
    }, {
      baselineKeepWidth: pair.baselineKeepWidth,
      bandTop: pair.bandTop,
      bandBottom: pair.bandBottom,
      bandLeft: pair.bandLeft,
      bandRight: pair.bandRight,
    });

    await page.mouse.move(10, 10);
    await page.mouse.up();

    expect(during, 'Não foi possível medir os cards na faixa de origem durante drag.').not.toBeNull();
    if (!during) return;

    // Tolerância pequena para anti-alias/pixel rounding
    expect(during.maxWidth).toBeLessThanOrEqual(pair.baselineKeepWidth + 10);
  });
});

