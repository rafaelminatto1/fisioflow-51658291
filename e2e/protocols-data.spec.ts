import { test, expect } from '@playwright/test';

test.describe('Validação de Dados de Protocolos', () => {
  test('Deve carregar protocolos e exibir contagem correta de marcos e restrições', async ({ page }) => {
    // Navegar para a página de protocolos
    await page.goto('/protocols', { waitUntil: 'domcontentloaded' });
    
    // Esperar os cards carregarem
    await page.waitForSelector('.protocol-card', { timeout: 30000 });
    
    // Verificar se existem cards
    const cardCount = await page.locator('.protocol-card').count();
    console.log(`Encontrados ${cardCount} protocolos.`);
    expect(cardCount, 'Nenhum protocolo encontrado na lista').toBeGreaterThan(0);

    // Verificar especificamente o LCA ou o primeiro card para garantir que NÃO está com "0 marcos"
    // No layout atual, procuramos por textos como "3 marcos" ou badges
    const firstCard = page.locator('.protocol-card').first();
    
    // Verificar se existe o texto de marcos e se não é "0 marcos"
    // Nota: O texto pode variar (ex: "3 marcos" ou "3 Marcos")
    const milstoneText = await firstCard.innerText();
    console.log(`Texto do card: ${milstoneText}`);
    
    // O texto deve conter um número maior que 0 seguido de 'marco' ou 'restrição'
    // Se o patch funcionou, todos os 75 protocolos têm no mínimo 2 marcos e 2 restrições
    expect(milstoneText).toMatch(/[1-9]\d*\s*(marcos|Marco)/i);
    expect(milstoneText).toMatch(/[1-9]\d*\s*(restrições|Restrição)/i);
  });

  test('Deve abrir detalhes do protocolo e exibir dados clínicos preenchidos', async ({ page }) => {
    await page.goto('/protocols', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.protocol-card', { timeout: 30000 });
    
    // Pegar o nome do primeiro card para validar no H1 depois
    const firstCard = page.locator('.protocol-card').first();
    const protocolName = await firstCard.locator('h3').textContent();
    console.log(`Testando protocolo: ${protocolName}`);
    
    // Clicar no botão "Ver Protocolo" especificamente
    await firstCard.locator('button:has-text("Ver Protocolo")').click();
    
    // Esperar a navegação e o H1 mudar (não pode ser mais "Protocolos Clínicos")
    await expect(page.locator('h1').filter({ hasNotText: 'Protocolos Clínicos' })).toBeVisible({ timeout: 15000 });
    
    // Verificar se o título correto do protocolo está no H1
    if (protocolName) {
      await expect(page.locator('h1')).toContainText(protocolName.trim());
    }
    
    // Esperar a visualização de detalhes
    await page.waitForSelector('text=Marcos do Protocolo', { timeout: 20000 });
    
    // Verificar se há itens de marcos na lista (estão formatados como "W1", "W2", etc)
    
    // Alternativa mais simples: procurar pelo padrão W followed by numbers
    const wText = page.locator('text=/W\\d+/');
    await expect(wText.first()).toBeVisible();
    
    // Verificar se as restrições estão visíveis
    await expect(page.locator('text=Restrições e Alertas de Segurança')).toBeVisible();
    const restrictionItems = page.locator('p:has-text("W")'); 
    await expect(restrictionItems.first()).toBeVisible();
  });
});
