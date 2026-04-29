import { test, expect } from '@playwright/test';

test.describe('Produção - Validação Completa de Agendamentos', () => {
  test('deve criar e editar um agendamento com sucesso', async ({ page }) => {
    // 1. Login
    console.log('Iniciando login...');
    await page.goto('https://fisioflow.pages.dev/auth/login');

    // Garantir que estamos na aba de Login (e não Cadastro)
    const loginTab = page.locator('button:has-text("Login")');
    if (await loginTab.isVisible()) {
      await loginTab.click();
    }

    await page.fill('input[type="email"]', 'rafael.minatto@yahoo.com.br');
    await page.fill('input[type="password"]', 'Yukari30@');

    const submitButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Acessar")').first();
    await submitButton.click();

    console.log('Aguardando redirecionamento para a agenda...');
    await page.waitForURL('**/agenda', { timeout: 30000 });

    // Esperar o calendário carregar
    await page.waitForSelector('.sx__calendar-wrapper', { state: 'visible', timeout: 30000 });

    // 2. Criar Agendamento
    console.log('Abrindo modal de novo agendamento...');
    await page.click('button:has-text("Agendar")');

    // Aguardar o campo de paciente
    const patientInput = page.locator('input[placeholder*="paciente"], input[role="combobox"]').first();
    await patientInput.waitFor({ state: 'visible' });
    await patientInput.click();

    // Selecionar o primeiro paciente da lista
    console.log('Selecionando paciente...');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    // Adicionar uma nota única
    const uniqueNote = `Validação Automação ${new Date().getTime()}`;
    const notesField = page.locator('textarea[placeholder*="Observações"], textarea[name="notes"]').first();
    await notesField.fill(uniqueNote);

    // Clicar em Agendar para salvar
    console.log('Salvando novo agendamento...');
    await page.click('button[type="submit"]:has-text("Agendar"), button:has-text("Confirmar Agendamento")');

    // Verificar se o modal fechou ou se apareceu confirmação
    await page.waitForSelector('text=' + uniqueNote, { timeout: 15000 }).catch(() => {
        console.log('Nota não encontrada diretamente no grid, mas continuando...');
    });

    // 3. Editar Agendamento
    console.log('Buscando agendamento para editar...');
    // Tenta encontrar o agendamento no grid
    const appointment = page.locator('.sx__time-grid-event, .sx__event').last();
    await appointment.click();

    // Procurar botão de editar no popover/modal
    const editButton = page.locator('button:has-text("Editar"), [data-testid="edit-button"]').first();
    await editButton.waitFor({ state: 'visible' });
    await editButton.click();

    // Alterar a nota
    console.log('Alterando nota do agendamento...');
    const updatedNote = uniqueNote + ' - EDITADO';
    await notesField.fill(updatedNote);

    // Salvar alteração
    await page.click('button:has-text("Salvar"), button:has-text("Atualizar")');

    // Verificar sucesso
    console.log('Verificando persistência da edição...');
    await page.waitForTimeout(2000);

    // Abrir novamente para conferir
    await appointment.click();
    await expect(page.locator('text=' + updatedNote)).toBeVisible({ timeout: 10000 });

    console.log('✅ Validação completa em produção concluída com sucesso!');
  });
});
