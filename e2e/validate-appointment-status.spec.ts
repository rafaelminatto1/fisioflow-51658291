/**
 * Valida alteração de status do card de agendamento em produção
 * URL: https://moocafisio.com.br
 * Usa storageState do global-setup (já autenticado via Neon Auth HTTP)
 */
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://moocafisio.com.br';

// Usa storageState pré-autenticado pelo global-setup
test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Agendamento — alteração de status em produção', () => {
  test.setTimeout(90000);

  test('navegar para agenda e verificar carregamento', async ({ page }) => {
    await page.goto(`${BASE_URL}/agenda`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Aguarda a página carregar (evita redir de auth)
    await page.waitForTimeout(3000);

    const url = page.url();
    console.log('URL atual:', url);

    // Se caiu no auth, logar o problema
    if (url.includes('/auth')) {
      await page.screenshot({ path: 'e2e/screenshots/unexpected-auth.png' });
      console.log('⚠️ Redirecionado para auth — storageState pode estar expirado');
    }

    await page.screenshot({ path: 'e2e/screenshots/schedule-loaded.png' });
    expect(url).not.toContain('/auth/login');
  });

  test('inspecionar cards de agendamento e estrutura de status', async ({ page }) => {
    // URL em produção é /agenda (redireciona de /schedule)
    await page.goto(`${BASE_URL}/agenda`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e/screenshots/schedule-initial.png' });

    // Inspeciona DOM para entender a estrutura dos cards
    const cardInfo = await page.evaluate(() => {
      // Seletores candidatos para cards de agendamento (dnd-kit week view)
      const selectors = [
        '[data-week-appointment="true"]',   // DraggableAppointment wrapper
        '[data-appointment-popover-anchor]', // CalendarAppointmentCard
        '[data-testid="appointment-card"]',
        '[class*="appointment-card"]',
        '[class*="AppointmentCard"]',
        '.rbc-event',
        '.fc-event',
      ];

      const results: Record<string, number> = {};
      for (const sel of selectors) {
        results[sel] = document.querySelectorAll(sel).length;
      }

      // Captura primeiro card encontrado
      let firstCard = '';
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          firstCard = `${sel}: ${el.outerHTML.slice(0, 800)}`;
          break;
        }
      }

      // Botões com texto de status
      const statusButtons = Array.from(document.querySelectorAll('button')).filter(
        b => /aguardando|confirmado|em atendimento|concluído|cancelado|cancelar/i.test(b.textContent || '')
      ).map(b => ({ text: b.textContent?.trim(), class: b.className.slice(0, 100) }));

      return { results, firstCard, statusButtons: statusButtons.slice(0, 10) };
    });

    console.log('Cards encontrados:', cardInfo.results);
    console.log('Primeiro card HTML:', cardInfo.firstCard || '(nenhum)');
    console.log('Botões de status:', cardInfo.statusButtons);
  });

  test('alterar status de agendamento via context menu (right-click)', async ({ page }) => {
    await page.goto(`${BASE_URL}/agenda`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Monitora requests de PATCH/PUT para appointments
    const statusRequests: Array<{ method: string; url: string; body: string }> = [];
    const statusResponses: Array<{ status: number; url: string }> = [];

    page.on('request', (req) => {
      if (req.url().includes('/api/appointments') && ['PATCH', 'PUT'].includes(req.method())) {
        statusRequests.push({ method: req.method(), url: req.url(), body: req.postData() || '' });
        console.log('📡', req.method(), req.url(), req.postData()?.slice(0, 200));
      }
    });

    page.on('response', async (res) => {
      if (res.url().includes('/api/appointments') && res.request().method() !== 'GET') {
        const body = await res.text().catch(() => '');
        statusResponses.push({ status: res.status(), url: res.url() });
        console.log(`📨 ${res.status()} ${res.url()} — ${body.slice(0, 200)}`);
      }
    });

    // Status é alterado via right-click context menu no card
    // Seletor do DraggableAppointment wrapper
    const cardSelectors = [
      '[data-week-appointment="true"]',
      '[data-appointment-popover-anchor]',
    ];

    let cardFound = false;
    for (const sel of cardSelectors) {
      const card = page.locator(sel).first();
      if (await card.isVisible({ timeout: 3000 }).catch(() => false)) {
        const ariaLabel = await card.getAttribute('aria-label');
        console.log(`Card encontrado (${sel}): aria-label="${ariaLabel}"`);

        // Right-click para abrir context menu
        await card.click({ button: 'right' });
        await page.waitForTimeout(800);
        await page.screenshot({ path: 'e2e/screenshots/context-menu-open.png' });

        // Procura o sub-menu "Alterar status"
        const statusSubTrigger = page.locator('[role="menuitem"]:has-text("status"), [role="menuitem"]:has-text("Status")').first();
        if (await statusSubTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
          await statusSubTrigger.hover();
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'e2e/screenshots/status-submenu.png' });

          // Sub-menu aberto — seleciona "Confirmado" ou primeira opção disponível
          const options = page.locator('[role="menuitem"]').filter({
            hasText: /confirmado|em atendimento|concluído|aguardando/i,
          });
          const optCount = await options.count();
          console.log('Opções de status disponíveis:', optCount);

          if (optCount > 0) {
            const texts = await options.allTextContents();
            console.log('Status disponíveis:', texts);
            await options.first().click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'e2e/screenshots/status-changed.png' });
          }
        } else {
          // Context menu aberto mas sem sub-menu de status — lista o que encontrou
          const allMenuItems = await page.locator('[role="menuitem"]').allTextContents();
          console.log('Menu items visíveis:', allMenuItems);
          await page.screenshot({ path: 'e2e/screenshots/context-menu-items.png' });
        }

        cardFound = true;
        break;
      }
    }

    if (!cardFound) {
      console.log('⚠️ Nenhum card de agendamento encontrado — agenda pode estar vazia para a data atual');
      console.log('Dica: Certifique-se de ter agendamentos criados para hoje em produção');
      await page.screenshot({ path: 'e2e/screenshots/no-appointments.png' });
    }

    console.log('\n=== RESUMO ===');
    console.log('Requests capturadas:', statusRequests.length > 0 ? statusRequests : '(nenhum PATCH)');
    console.log('Responses:', statusResponses.length > 0 ? statusResponses : '(nenhum)');

    // Verifica que não houve erro 5xx
    const failedResponses = statusResponses.filter(r => r.status >= 500);
    expect(failedResponses).toHaveLength(0);
  });

  test('validar via API direta — health check do worker', async ({ page }) => {
    const res = await page.request.get('https://api-pro.moocafisio.com.br/api/health');
    console.log('Worker health status:', res.status());
    const body = await res.json().catch(() => ({}));
    console.log('Worker health body:', body);
    expect(res.status()).toBe(200);
  });
});
