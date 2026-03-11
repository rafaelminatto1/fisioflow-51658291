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
    
    // Clicar no primeiro protocolo
    await page.locator('.protocol-card').first().click();
    
    // Esperar a visualização de detalhes
    // Geralmente abre um modal ou navega. Pelo código, parece que o ProtocolDetailView é renderizado
    // Vamos procurar por elementos da aba "Marcos" ou "Fases"
    await page.waitForSelector('text=Marcos do Protocolo', { timeout: 20000 });
    
    // Verificar se há itens de marcos na lista
    const milestoneItems = page.locator('text=Semana');
    const count = await milestoneItems.count();
    console.log(`Itens de marcos encontrados nos detalhes: ${count}`);
    expect(count).toBeGreaterThan(0);
    
    // Verificar se as restrições estão visíveis
    await page.click('text=Restrições');
    const restrictionItems = page.locator('text=até Semana');
    const rCount = await restrictionItems.count();
    console.log(`Itens de restrições encontrados nos detalhes: ${rCount}`);
    expect(rCount).toBeGreaterThan(0);
  });
});
