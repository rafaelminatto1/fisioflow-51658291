import { test, expect } from '@playwright/test';

test.describe('Produção - Validação Completa CRUD (Pacientes e Agendamentos)', () => {
  
  test.beforeEach(async ({ page }) => {
    // Capturar logs do console
    page.on('console', msg => {
      console.log(`BROWSER_LOG [${msg.type()}]: ${msg.text()}`);
    });

    // Login inicial
    await page.goto('https://moocafisio.com.br/auth/login');
    await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
    await page.fill('input[type="password"]', 'Yukari30@');
    await page.click('button:has-text("Entrar"), button[type="submit"]');
    await page.waitForURL(url => url.pathname.includes('/agenda') || url.pathname.includes('/dashboard'), { timeout: 30000 });

    // REMOÇÃO AGRESSIVA DE BLOQUEIOS
    await page.evaluate(() => {
      // Remove modais de tour, overlays de loading e backdrops que travam o clique
      const overlays = document.querySelectorAll('.fixed.inset-0, [role="dialog"], .radix-overlay');
      overlays.forEach(el => {
        if (el.textContent?.includes('Bem-vindo') || el.classList.contains('bg-black/80')) {
          el.remove();
        }
      });
      // Força o scroll e pointer events
      document.body.style.pointerEvents = 'auto';
      document.body.style.overflow = 'auto';
    });
  });

  test('Deve realizar o CRUD completo de Paciente', async ({ page }) => {
    console.log('Iniciando CRUD de Paciente...');
    
    // 1. Navegar para Pacientes
    await page.goto('https://moocafisio.com.br/patients');
    await expect(page.locator('h1, h2')).toContainText(/Pacientes|Listagem/i);

    // 2. Criar Paciente
    const testPatientName = `Teste Playwright ${Date.now()}`;
    await page.click('button:has-text("Novo"), button:has-text("Adicionar")');
    await page.fill('input[placeholder*="Nome"], input[name="name"], input[name="full_name"]', testPatientName);
    await page.fill('input[placeholder*="E-mail"], input[name="email"]', 'test@playwright.com');
    await page.fill('input[type="date"], input[name="birth_date"], input[name="birthDate"]', '1990-01-01');
    await page.click('button[type="submit"], button:has-text("Salvar")');
    
    console.log(`Paciente ${testPatientName} criado.`);

    // 3. Verificar e Editar
    await page.waitForTimeout(2000); // Aguarda sync
    await page.goto('https://moocafisio.com.br/patients');
    await page.fill('input[placeholder*="Buscar"], input[placeholder*="Pesquisar"]', testPatientName);
    await expect(page.locator(`text=${testPatientName}`)).toBeVisible();
    
    // Abrir edição (clicando no nome ou botão editar)
    await page.click(`text=${testPatientName}`);
    await page.fill('input[placeholder*="Nome"], input[name="name"]', `${testPatientName} (Editado)`);
    await page.click('button[type="submit"], button:has-text("Salvar")');
    console.log('Paciente editado.');

    // 4. Excluir (Limpeza)
    await page.goto('https://moocafisio.com.br/patients');
    await page.fill('input[placeholder*="Buscar"]', testPatientName);
    // Procurar menu de ações ou botão excluir
    const deleteButton = page.locator('button:has-text("Excluir"), [aria-label*="Excluir"]').first();
    await deleteButton.click();
    // Confirmar modal
    await page.click('button:has-text("Confirmar"), button:has-text("Sim")');
    console.log('Paciente excluído.');
  });

  test('Deve realizar o CRUD completo de Agendamento', async ({ page }) => {
    console.log('Iniciando CRUD de Agendamento...');
    
    // 1. Navegar para Agenda
    await page.goto('https://moocafisio.com.br/agenda');
    
    // 2. Criar Agendamento
    await page.click('button:has-text("Novo Agendamento"), button:has-text("Novo")');
    // Selecionar primeiro paciente disponível ou digitar nome
    await page.fill('input[role="combobox"], .select-trigger', 'Rafael');
    await page.keyboard.press('Enter');
    
    await page.click('button[type="submit"], button:has-text("Agendar")');
    console.log('Agendamento criado.');

    // 3. Editar Status
    await page.waitForTimeout(2000);
    // Clicar no card do agendamento (ajustar seletor se necessário)
    const appointmentCard = page.locator('.rbc-event, .appointment-card').first();
    await appointmentCard.click();
    
    // Mudar para "Confirmado" ou similar
    await page.click('button:has-text("Confirmar"), button:has-text("Realizado")');
    console.log('Status do agendamento atualizado.');

    // 4. Cancelar/Excluir
    await page.click('button:has-text("Excluir"), button:has-text("Cancelar")');
    await page.click('button:has-text("Confirmar")');
    console.log('Agendamento removido.');
  });
});
