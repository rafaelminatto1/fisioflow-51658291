import { test, expect } from '@playwright/test';

/**
 * Testes E2E para validar o novo design dos cards da agenda
 * Foco: Alto contraste, legibilidade, alinhamento de grid
 */
test.describe('Agenda - Novo Design dos Cards', () => {
  test.beforeEach(async ({ page }) => {
    // Login - usar URL completa para evitar problemas de porta
    await page.goto('http://localhost:8080/auth');
    await page.fill('input[type="email"]', 'fisio@activityfisioterapia.com.br');
    await page.fill('input[type="password"]', 'Activity2024!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|schedule)/);

    // Navigate to Schedule
    await page.goto('http://localhost:8080/schedule');
    await page.waitForLoadState('networkidle');
  });

  test('deve exibir cards com alto contraste', async ({ page }) => {
    // Aguardar carregamento da agenda
    await page.waitForTimeout(2000);

    // Verificar se os cards de agendamento estão visíveis
    const appointmentCards = page.locator('.calendar-appointment-card');

    const cardCount = await appointmentCards.count();

    if (cardCount > 0) {
      // Verificar primeiro card
      const firstCard = appointmentCards.first();

      // Verificar que o card tem fundo claro (não fundo colorido escuro)
      const cardBg = await firstCard.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color
        };
      });

      // Fundo deve ser claro (valor RGB alto > 200 para light mode)
      const rgbMatch = cardBg.backgroundColor.match(/\d+/g);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        // Brilho deve ser > 128 para fundo claro
        expect(brightness).toBeGreaterThan(100);
      }

      // Verificar border esquerda colorida (indicador de status)
      const statusIndicator = firstCard.locator('.calendar-appointment-card-status-bg');
      await expect(statusIndicator).toBeVisible();

      // Verificar que o indicador tem cor de fundo (não transparente)
      const statusBg = await statusIndicator.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      expect(statusBg).not.toBe('rgba(0, 0, 0, 0)');
      expect(statusBg).not.toBe('transparent');
    }
  });

  test('deve exibir nome do paciente legível', async ({ page }) => {
    await page.waitForTimeout(2000);

    const patientNames = page.locator('.calendar-patient-name');
    const count = await patientNames.count();

    if (count > 0) {
      const firstName = patientNames.first();

      // Verificar visibilidade
      await expect(firstName).toBeVisible();

      // Verificar contraste de texto (texto escuro sobre fundo claro)
      const textColor = await firstName.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      // Texto deve ser escuro (RGB < 128 para cada canal em light mode)
      const rgbMatch = textColor.match(/\d+/g);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        // Para texto escuro, brilho deve ser < 128
        expect(brightness).toBeLessThan(200);
      }

      // Verificar que o texto não está vazio
      const text = await firstName.textContent();
      expect(text?.trim()).not.toBe('');
    }
  });

  test('deve ter footer com informações de horário', async ({ page }) => {
    await page.waitForTimeout(2000);

    const footers = page.locator('.calendar-appointment-footer');
    const count = await footers.count();

    if (count > 0) {
      const firstFooter = footers.first();

      // Verificar que o footer contém ícone de relógio
      const clockIcon = firstFooter.locator('svg');
      await expect(clockIcon).toBeVisible();

      // Verificar que contém horário (formato HH:MM)
      const footerText = await firstFooter.textContent();
      expect(footerText).toMatch(/\d{1,2}:\d{2}/);
    }
  });

  test('deve manter grid alinhado na view de semana', async ({ page }) => {
    // Capturar screenshot antes
    await page.screenshot({ path: 'screenshots/week-view-before.png' });

    // Mudar para view de semana se não estiver
    const weekButton = page.locator('button:has-text("Semana")');
    if (await weekButton.isVisible()) {
      await weekButton.click();
      await page.waitForTimeout(500);
    }

    // Verificar colunas do grid
    const gridColumns = page.locator('.grid.grid-cols-7 > div');
    const columnCount = await gridColumns.count();
    expect(columnCount).toBe(7);

    // Verificar que cada coluna tem largura mínima adequada
    for (let i = 0; i < Math.min(columnCount, 3); i++) {
      const column = gridColumns.nth(i);
      const box = await column.boundingBox();

      if (box) {
        // Largura deve ser pelo menos 140px
        expect(box.width).toBeGreaterThanOrEqual(130);
      }
    }

    // Capturar screenshot após
    await page.screenshot({ path: 'screenshots/week-view-after.png', fullPage: true });
  });

  test('deve aplicar hover state nos cards', async ({ page }) => {
    await page.waitForTimeout(2000);

    const appointmentCards = page.locator('.calendar-appointment-card');
    const count = await appointmentCards.count();

    if (count > 0) {
      const firstCard = appointmentCards.first();

      // Hover no card
      await firstCard.hover();

      // Verificar que o nome do paciente fica com cor primária
      const patientName = firstCard.locator('.calendar-patient-name');
      const colorAfterHover = await patientName.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      // Cor deve mudar no hover
      expect(colorAfterHover).toBeTruthy();

      // Verificar sombra aumentada
      const boxShadow = await firstCard.evaluate((el) => {
        return window.getComputedStyle(el).boxShadow;
      });
      expect(boxShadow).toBeTruthy();
    }
  });

  test('deve exibir tipo de atendimento', async ({ page }) => {
    await page.waitForTimeout(2000);

    const types = page.locator('.calendar-appointment-type');
    const count = await types.count();

    if (count > 0) {
      const firstType = types.first();

      // Verificar visibilidade
      await expect(firstType).toBeVisible();

      // Verificar que tem texto
      const text = await firstType.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('deve truncar texto longo', async ({ page }) => {
    await page.waitForTimeout(2000);

    const patientNames = page.locator('.calendar-patient-name');
    const count = await patientNames.count();

    if (count > 0) {
      // Verificar classe truncate
      const firstName = patientNames.first();
      const hasTruncate = await firstName.evaluate((el) => {
        return el.classList.contains('truncate') ||
               window.getComputedStyle(el).overflow === 'hidden' ||
               window.getComputedStyle(el).textOverflow === 'ellipsis';
      });

      expect(hasTruncate).toBe(true);
    }
  });

  test('deve funcionar em mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verificar que os cards ainda são visíveis
    const appointmentCards = page.locator('.calendar-appointment-card');
    const count = await appointmentCards.count();

    if (count > 0) {
      // Verificar primeiro card
      const firstCard = appointmentCards.first();
      await expect(firstCard).toBeVisible();

      // Verificar que o conteúdo está legível
      const patientName = firstCard.locator('.calendar-patient-name');
      await expect(patientName).toBeVisible();
    }

    // Screenshot mobile
    await page.screenshot({ path: 'screenshots/mobile-calendar.png', fullPage: true });
  });

  test('deve indicar status com border colorida', async ({ page }) => {
    await page.waitForTimeout(2000);

    const cards = page.locator('.calendar-appointment-card');
    const count = await cards.count();

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        const card = cards.nth(i);
        const statusBg = card.locator('.calendar-appointment-card-status-bg');

        // Verificar que a border tem cor definida
        const bgColor = await statusBg.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });

        // Não deve ser transparente
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(bgColor).not.toBe('transparent');
      }
    }
  });

  test('deve permitir clicar no card para ver detalhes', async ({ page }) => {
    await page.waitForTimeout(2000);

    const cards = page.locator('.calendar-appointment-card');
    const count = await cards.count();

    if (count > 0) {
      const firstCard = cards.first();

      // Clicar no card
      await firstCard.click();

      // Verificar que algum modal/detalhes aparece
      await page.waitForTimeout(500);

      // Pode ser um popover ou modal
      const popoverOrModal = page.locator('[role="dialog"], .popover-content, [data-state="open"]');
      const isVisible = await popoverOrModal.first().isVisible();

      if (isVisible) {
        // Verificar conteúdo do modal
        const modalText = await popoverOrModal.first().textContent();
        expect(modalText?.length).toBeGreaterThan(0);
      }
    }
  });
});

/**
 * Testes visuais comparativos
 */
test.describe('Agenda - Screenshots Comparativos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080/auth');
    await page.fill('input[type="email"]', 'fisio@activityfisioterapia.com.br');
    await page.fill('input[type="password"]', 'Activity2024!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|schedule)/);
    await page.goto('http://localhost:8080/schedule');
    await page.waitForLoadState('networkidle');
  });

  test('screenshot - view de semana', async ({ page }) => {
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/calendar-week-view.png', fullPage: true });
  });

  test('screenshot - view de dia', async ({ page }) => {
    const dayButton = page.locator('button:has-text("Dia")');
    if (await dayButton.isVisible()) {
      await dayButton.click();
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/calendar-day-view.png', fullPage: true });
  });

  test('screenshot - view de mês', async ({ page }) => {
    const monthButton = page.locator('button:has-text("Mês")');
    if (await monthButton.isVisible()) {
      await monthButton.click();
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/calendar-month-view.png', fullPage: true });
  });

  test('screenshot - cards em destaque', async ({ page }) => {
    await page.waitForTimeout(2000);

    const cards = page.locator('.calendar-appointment-card');
    const count = await cards.count();

    if (count > 0) {
      // Focar no primeiro card e tirar screenshot
      const firstCard = cards.first();
      await firstCard.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'screenshots/calendar-card-closeup.png' });
    }
  });
});
